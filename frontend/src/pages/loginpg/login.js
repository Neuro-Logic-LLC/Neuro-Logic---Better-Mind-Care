import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { FiEye, FiEyeOff } from 'react-icons/fi';

// ---- Env / Config (unchanged) ----
function normalizeBase(raw) {
  const b = (raw || '').trim();
  return b ? b.replace(/\/+$/, '') : '';
}
function readMeta(name) {
  const el = document.querySelector(`meta[name="${name}"]`);
  return el ? el.getAttribute('content') : '';
}
const isDevHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const API_BASE = (() => {
  const injected = normalizeBase(
    (window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE) ||
      readMeta('app-env:api-base')
  );
  if (injected) return injected;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1')
    return 'https://localhost:3000';
  if (host.includes('staging.bettermindcare.com'))
    return 'https://staging.bettermindcare.com';
  return window.location.origin;
})();
const isDev = process.env.NODE_ENV === 'development';

if (isDev && typeof window !== 'undefined') {
  const realFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const url = typeof input === 'string'
      ? input
      : input?.url || '';

    // Warn ONLY on absolute 5050 calls
    if (url.startsWith('https://localhost:5050')) {
      console.warn(
        '[DEV WARNING] Direct call to https://localhost:5050 detected:',
        url
      );
    }

    // Do NOT mutate init — clone it safely
    const finalInit = {
      ...init,
      // Respect existing credential settings
      credentials: init?.credentials || 'include'
    };

    return realFetch(input, finalInit);
  };
}

const BASE = API_BASE;

export async function req(path, init = {}) {
  const url = /^https?:\/\//i.test(path) ? path : `${BASE}${path}`;
  const hasBody = typeof init.body === 'string' && init.body.length > 0;
  const headers = {
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers || {})
  };
  const res = await fetch(url, { credentials: 'include', ...init, headers });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => '');
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.res = res;
    err.data = data;
    throw err;
  }
  return { res, data };
}

// ---- Component ----
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [challengeId, setChallengeId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotUser, setShowForgotUser] = useState(false);
  const [forgotUserEmail, setForgotUserEmail] = useState('');

  const { setUser } = useAuth();
  const navigate = useNavigate();

  // Already logged in? bounce to dashboard
  useEffect(() => {
    (async () => {
      try {
        const me = await req('/api/auth/me', {
          method: 'GET',
          credentials: 'include'
        });
        if (me.res.ok && me.data && me.data.user) {
          setUser(me.data.user);
          navigate('/admin/dashboard', { replace: true });
        }
      } catch {
        /* ignore */
      }
    })();
  }, [navigate, setUser]);

  const googleAuthUrl = useMemo(() => {
    const base = API_BASE.replace(/\/$/, '');
    const returnTo = '/admin/dashboard';
    return `${base}/api/oauth/google?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  const getJsonSafe = async (res) => {
    try {
      return await res.json();
    } catch {
      return {};
    }
  };

  // ---- Minimal validation to mirror backend only ----
  const canonEmail = (v) =>
    String(v || '')
      .trim()
      .toLowerCase();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const emailClean = canonEmail(email);
    const pwd = String(password || '');

    if (!emailClean) {
      setError('Please double-check this field.');
      return;
    }
    if (pwd.length < 8) {
      setError(
        'Password must be at least 8 characters and include 1 special character.'
      );
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      setError('Password must include at least one special character.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailClean, password: pwd })
      });

      const data = await getJsonSafe(res);

      // ❌ Wrong password — stop here
      if (!res.ok) {
        const isDev = process.env.NODE_ENV === 'development';
        setError(data.error || 'Something didn’t go through — try again.');
        setBusy(false);
        return;
      }
      const status = data.status || data.result || data.code;

      // If API signals MFA explicitly
      if (
        status === 'mfa_required' ||
        data.challengeId ||
        data.mfa?.challengeId
      ) {
        setChallengeId(data.challengeId || data.mfa?.challengeId || null);
        setStep(2);
        setBusy(false);
        return;
      }

      // Otherwise, verify session cookie actually exists
      const me = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include'
      });
      if (me.ok) {
        const meData = await getJsonSafe(me);
        if (meData?.user) {
          navigate('/admin/dashboard');
          return;
        }
      }

      // Backend may not say "mfa_required" but still need code
      setStep(2);
    } catch (err) {
      const isDev = process.env.NODE_ENV === 'development';
      setError(isDev ? String(err?.message || err) : 'Something didn’t go through — try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyMfa = async () => {
    setError('');
    const code = String(mfaCode || '').replace(/\D/g, '');
    const emailCanon = canonEmail(email);

    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailCanon,
          code,
          ...(challengeId ? { challengeId } : {})
        })
      });

      const data = await getJsonSafe(res);
      if (res.ok && data?.user) {
        navigate('/admin/dashboard');
        return;
      }
      const isDev = process.env.NODE_ENV === 'development';
      setError(data.error || data.message || (isDev ? `MFA failed (${res.status})` : 'Something didn’t go through — try again.'));
    } catch (e) {
      const isDev = process.env.NODE_ENV === 'development';
      setError(isDev ? String(e?.message || e) : 'Something didn’t go through — try again.');
    } finally {
      setBusy(false);
    }
  };

  async function handleForgotUsername() {
    if (busy) return;
    if (!forgotUserEmail) return alert('Enter your email first.');
    setBusy(true);
    try {
      await req('/api/auth/forgot-username', {
        method: 'POST',
        body: JSON.stringify({ email: forgotUserEmail })
      });
      alert('If an account exists, an email was sent with the username.');
      setShowForgotUser(false);
      setForgotUserEmail('');
    } catch (err) {
      alert('If an account exists, an email was sent with the username.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--teal-gradient)' }}
    >
      <main
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <form
          onSubmit={handleLogin}
          className="login-form"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            maxWidth: 360,
            width: '100%',
            padding: '1rem'
          }}
        >
          {step === 1 && (
            <>
              {error && (
                <div style={{ color: '#b91c1c', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="username"
                required
                style={{
                  cursor: 'pointer',
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  textAlign: 'center'
                }}
              />

              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{
                    cursor: 'pointer',
                    textAlign: 'center',
                    width: '100%',
                    padding: '12px 14px',
                    paddingRight: 44,
                    fontSize: '1rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 28,
                    height: 28,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer'
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>

              <button
                type="submit"
                disabled={busy || !email || !password}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.8 : 1
                }}
              >
                {busy ? 'Submitting…' : 'Submit'}
              </button>

              <button
                type="button"
                onClick={() => window.location.assign(googleAuthUrl)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#fff',
                  color: '#000',
                  border: '1px solid #ccc',
                  borderRadius: 6,
                  cursor: 'pointer',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <img
                  src="https://developers.google.com/identity/images/g-logo.png"
                  alt="Google"
                  style={{ width: 18, height: 18 }}
                />
                Sign in with Google
              </button>

              <div
                style={{ display: 'flex', gap: 12, justifyContent: 'center' }}
              >
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#0b5fff',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 6
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {showForgotUser && (
                <div
                  style={{
                    marginTop: 8,
                    padding: 10,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8
                  }}
                >
                  <input
                    placeholder="Enter your email"
                    value={forgotUserEmail}
                    onChange={(e) => setForgotUserEmail(e.target.value)}
                    type="email"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      fontSize: '0.95rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: 6,
                      marginBottom: 8
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleForgotUsername}
                    disabled={busy || !forgotUserEmail}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      fontSize: '1rem',
                      backgroundColor: '#111',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: busy ? 'not-allowed' : 'pointer',
                      opacity: busy ? 0.8 : 1
                    }}
                  >
                    {busy ? 'Sending…' : 'Email my username'}
                  </button>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              {error && (
                <div style={{ color: '#b91c1c', textAlign: 'center' }}>
                  {error}
                </div>
              )}
              <p style={{ textAlign: 'center' }}>MFA code sent to your email</p>
              <input
                placeholder="Enter MFA code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                onBlur={() => setMfaCode((v) => v.replace(/\D/g, ''))}
                inputMode="numeric"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  textAlign: 'center'
                }}
              />
              <button
                type="button"
                onClick={handleVerifyMfa}
                disabled={busy || mfaCode.length !== 6}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.8 : 1
                }}
              >
                {busy ? 'Verifying…' : 'Verify'}
              </button>
            </>
          )}
        </form>
      </main>
    </div>
  );
}
