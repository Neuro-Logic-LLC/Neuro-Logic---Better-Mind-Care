// src/auth/AuthContext.jsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react';

// ---- shared API base detection (same as your login file) ----
function normalizeBase(raw) {
  const b = (raw || '').trim();
  return b ? b.replace(/\/+$/, '') : '';
}
function readMeta(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el ? el.getAttribute('content') : '';
}
const API_BASE = (() => {
  const metaBase = document
    .querySelector('meta[name="app-env:api-base"]')
    ?.content?.trim();
  const configBase = window.__APP_CONFIG__?.API_BASE?.trim();

  if (configBase) return configBase.replace(/\/+$/, '');
  if (metaBase) return metaBase.replace(/\/+$/, '');

  const host = window.location.hostname;

  if (host.includes('staging.bettermindcare.com'))
    return 'https://staging.bettermindcare.com';

  return 'https://staging.bettermindcare.com'; // your WIF’s real backend
})();

console.log('[Auth] API_BASE =', API_BASE); // leave this in until fixed

async function req(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include', // <-- carry session cookie
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  return { res, data };
}

// ---- Auth context ----
const AuthContext = createContext({
  user: '',
  setUser: () => {},
  loading: true,
  logout: () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkSession = useCallback(async () => {
    setLoading(true);
    try {
      const { res, data } = await req('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      });
      if (res && data) {
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const logout = useCallback(async () => {
    try {
      await req('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout failed:', err);
    } finally {
      setUser(null);

      // optional: clear service worker caches so no stale UI remains
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // optional: notify other tabs
      try {
        const bc = new BroadcastChannel('auth');
        bc.postMessage({ type: 'logout' });
        bc.close();
      } catch {}

      // use replace so Back doesn’t resurrect dashboard
      window.location.replace('/login');
    }
  }, [setUser]);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
