const crypto = require('crypto');
const getOauth4w = require('../lib/oauth4w');

let as, client, redirectUri;
let initPromise = null; // single-flight

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

    // Determine base purely from runtime environment (no env vars)
    const isProd = process.env.NODE_ENV === 'production';
    const fallbackBase = 'https://staging.bettermindcare.com';

    const baseForUri = trimTrailingSlash(fallbackBase);
    const explicitRedirect = ru;
    redirectUri = `${baseForUri}/api/oauth/google/callback`;

    console.log('[OIDC] redirectUri:', redirectUri);

    const issuer = new URL('https://accounts.google.com');
    const d = await o.discoveryRequest(issuer);
    as = await o.processDiscoveryResponse(issuer, d);

    // Hardcode the known client values here (no process.env)
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
  if (!initPromise) await initGoogle();
  await initPromise;
  if (!as || !client || !redirectUri) throw new Error('OIDC not initialized');
}

async function startAuth({ state, nonce }) {
  await ensureReady();
  if (!state) throw new Error('state required');
  if (!nonce) throw new Error('nonce required');

  const { code_verifier, code_challenge } = buildPkce();

  const url = new URL(as.authorization_endpoint);
  url.searchParams.set('client_id', client.client_id);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  // Google expects a single space-separated scope string
    url.searchParams.set(
      'scope',
      'openid profile email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.freebusy'
    );
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('code_challenge', code_challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'false');

  return { url: url.toString(), code_verifier };
}

function getConfig() {
  if (!as || !client || !redirectUri) throw new Error('OIDC not initialized');
  return { server: as, client, redirectUri };
}

module.exports = { initGoogle, ensureReady, startAuth, getConfig };
