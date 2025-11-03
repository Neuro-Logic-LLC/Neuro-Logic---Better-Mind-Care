const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

async function loadSSMIntoEnv(path = process.env.SSM_PARAMS_PATH || '/bmc/dev') {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2';
  const ssm = new SSMClient({ region });
  let nextToken;

  // normalize to trailing slash
  const base = path.endsWith('/') ? path : path + '/';

  do {
    const out = await ssm.send(new GetParametersByPathCommand({
      Path: base,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken
    }));
    for (const p of out.Parameters || []) {
      const k = p.Name.replace(base, ''); // strip prefix
      if (!(k in process.env)) process.env[k] = p.Value ?? '';
    }
    nextToken = out.NextToken;
  } while (nextToken);

  // sanity log
  const got = ['SESSION_SECRET','JWT_SECRET','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']
    .filter(k => process.env[k]).join(', ');
  console.log(`[ssm] loaded from ${base} -> ${got || 'none'}`);
}


// block startup until SSM is in env
(async () => {
  await loadSSMIntoEnv('/bmc/dev'); // force dev path
  if (!process.env.SESSION_SECRET) {
    console.warn('SESSION_SECRET missing from env. using dev fallback');
    process.env.SESSION_SECRET = 'dev-only-secret-change-me';
  }

  // now require app AFTER env is ready
  // require('./app'); // or require('./server-app')
})();


// auth/OIDC.js
const crypto = require('crypto');
const getOauth4w = require('../lib/oauth4w');
// const loadSSMParams = require('../utils/loadSSMParams');
// (async () => await loadSSMParams())(); / / ensure envs are loaded
const FRONTEND_URL_DEV='https://localhost:3000';
const FRONTEND_URL_STAGING='https://staging.bettermindcare.com';
const FRONTEND_URL_PROD='https://bettermindcare.com';

let as, client, redirectUri;
let initPromise = null; // <-- single-flight

const b64url = buf =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function buildPkce() {
  const code_verifier = b64url(crypto.randomBytes(32));
  const code_challenge = b64url(crypto.createHash('sha256').update(code_verifier).digest());
  return { code_verifier, code_challenge };
}

async function initGoogle({ base, redirectUri: ru } = {}) {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const o = await getOauth4w();

    const baseEnv = (process.env.BACKEND_PUBLIC_URL || '').replace(/\/+$/, '');
    const baseFinal =
      process.env.NODE_ENV === 'development'
        ? 'https://localhost:5050'
        : 'https://staging.bettermindcare.com';

    redirectUri = (baseFinal ? `${baseFinal}/api/oauth/google/callback` : null);

    if (!redirectUri) throw new Error('BACKEND_PUBLIC_URL or GOOGLE_REDIRECT_URI must be set');

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
  url.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events');
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
