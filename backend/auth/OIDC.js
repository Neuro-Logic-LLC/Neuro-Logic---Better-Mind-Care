// auth/OIDC.js
const crypto = require('crypto');
const getOauth4w = require('../lib/oauth4w');

let as, client, redirectUri;
let initPromise = null; // <-- single-flight

const b64url = buf =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const trimTrailingSlash = value => (value || '').replace(/\/+$/, '');

function buildPkce() {
  const code_verifier = b64url(crypto.randomBytes(32));
  const code_challenge = b64url(crypto.createHash('sha256').update(code_verifier).digest());
  return { code_verifier, code_challenge };
}

async function initGoogle({ base, redirectUri: ru } = {}) {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const o = await getOauth4w();

    const envBase = trimTrailingSlash(
      process.env.BACKEND_PUBLIC_URL
      || process.env.GOOGLE_REDIRECT_BASE
      || ''
    );
    const fallbackBase = process.env.NODE_ENV === 'production'
      ? 'https://staging.bettermindcare.com'
      : 'https://localhost:5050';
    const baseForUri = trimTrailingSlash(base || envBase || fallbackBase);

    const explicitRedirect = ru || process.env.GOOGLE_REDIRECT_URI;
    redirectUri = explicitRedirect
      ? explicitRedirect
      : (baseForUri ? `${baseForUri}/api/oauth/google/callback` : null);

    if (!redirectUri) throw new Error('GOOGLE_REDIRECT_URI or BACKEND_PUBLIC_URL must be set');

    if (!process.env.GOOGLE_REDIRECT_URI) {
      process.env.GOOGLE_REDIRECT_URI = redirectUri;
    }

    console.log('[OIDC] redirectUri:', redirectUri);

    if (!process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_CLIENT_ID missing');
    if (!process.env.GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_SECRET missing');

    const issuer = new URL('https://accounts.google.com');
    const d = await o.discoveryRequest(issuer);
    as = await o.processDiscoveryResponse(issuer, d);

    client = {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: 'client_secret_post'
    };
    return { server: as, client, redirectUri };
  })();
  return initPromise;
}

async function ensureReady() {
  if (!initPromise) await initGoogle(); // safe if envs are present
  await initPromise;
  if (!as || !client || !redirectUri) throw new Error('OIDC not initialized');
}

// Make startAuth async and ensure init completed
async function startAuth({ state, nonce }) {
  await ensureReady();
  if (!state) throw new Error('state required');
  if (!nonce) throw new Error('nonce required');

  const { code_verifier, code_challenge } = buildPkce();

  const url = new URL(as.authorization_endpoint);
  url.searchParams.set('client_id', client.client_id);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/calendar');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', code_challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  if (process.env.GOOGLE_HD) url.searchParams.set('hd', process.env.GOOGLE_HD);

  return { url: url.toString(), code_verifier };
}

function getConfig() {
  if (!as || !client || !redirectUri) throw new Error('OIDC not initialized');
  return { server: as, client, redirectUri };
}

module.exports = { initGoogle, ensureReady, startAuth, getConfig };
