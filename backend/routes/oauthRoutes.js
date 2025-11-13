// backend/routes/oauthRoutes.js
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { issueSessionCookie } = require('../utils/issueSessionCookie'); // <- filename per your project
const { initGoogle, startAuth, getConfig, ensureReady } = require('../auth/OIDC');
await initGoogle();
// ---- helpers ---------------------------------------------------------------

const ORIGIN_WHITELIST = [
  'https://localhost:3000',
  'https://localhost:5050',
  'https://staging.bettermindcare.com',
  'https://bettermindcare.com',
  'https://www.staging.bettermindcare.com',
  'https://www.bettermindcare.com'
];

function pickFrontendBase(req) {
  const origin = (req.get('origin') || '').replace(/\/+$/, '');
  if (origin && ORIGIN_WHITELIST.includes(origin)) return origin;

  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  const envBase =
    (env === 'production'
      ? process.env.FRONTEND_URL
      : process.env.FRONTEND_URL_DEV || 'https://localhost:3000') || '';
  const trimmed = envBase.replace(/\/+$/, '');
  if (trimmed) return trimmed;

  return `${req.protocol}://${req.get('host')}`;
}

function defaultReturnPath() {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  if (env === 'production') return process.env.RETURN_TO_DEFAULT || '/admin/dashboard';
  return process.env.RETURN_TO_DEFAULT_DEV || '/admin/dashboard';
}

function sanitizeReturnTo(raw, feBase) {
  try {
    const r = String(raw || '').trim();
    if (!r) return defaultReturnPath();
    if (r.startsWith('/') && !r.startsWith('//') && !r.includes('://')) return r;

    const u = new URL(r);
    const fe = new URL(feBase);
    if (
      u.protocol === fe.protocol &&
      u.hostname === fe.hostname &&
      (u.port || '') === (fe.port || '')
    ) {
      const norm = (u.pathname || '/') + (u.search || '') + (u.hash || '');
      return norm || defaultReturnPath();
    }
  } catch {}
  return defaultReturnPath();
}

// ---- routes ----------------------------------------------------------------

// GET /api/oauth/google (init)
router.get('/google', async (req, res) => {
  try {
    const returnTo = req.query.returnTo || '/dashboard';

    // Generate PKCE
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    const nonce = crypto.randomBytes(16).toString('hex');

    // Signed STATE for callback
    const state = jwt.sign(
      { v: verifier, n: nonce, rt: returnTo },
      process.env.JWT_SECRET,
      { expiresIn: '10m', issuer: 'bmc' }
    );

    // Exact redirectUri that callback uses

    const redirectUri = "https://staging.bettermindcare.com/api/oauth/google/callback";

    const authURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authURL.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    authURL.searchParams.set('redirect_uri', redirectUri);
    authURL.searchParams.set('response_type', 'code');
    authURL.searchParams.set(
      'scope',
      [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/calendar.events'
      ].join(' ')
    );
    authURL.searchParams.set('state', state);
    authURL.searchParams.set('nonce', nonce);
    authURL.searchParams.set('code_challenge', challenge);
    authURL.searchParams.set('code_challenge_method', 'S256');

    return res.redirect(authURL.toString());
  } catch (err) {
    console.error('/google start error:', err);
    return res.status(500).send('OAuth start failed');
  }
});

// GET /api/oauth/google/callback
router.get('/google/callback', async (req, res, next) => {
  try {
    const { state, code, error } = req.query;

    if (error) return res.status(400).send(`OAuth error: ${error}`);
    if (!state) return res.status(400).send('Missing state');
    if (!code) return res.status(400).send('Missing code');

    // --- 1. VERIFY STATE ---
    let st;
    try {
      st = jwt.verify(state, process.env.JWT_SECRET, { issuer: 'bmc' });
    } catch (err) {
      console.error('Bad state:', err);
      return res.status(400).send('Invalid state');
    }

    // state contains:
    // st.v = code_verifier
    // st.n = nonce
    // st.rt = returnTo

    // Rebuild redirect_uri exactly as used during /google

    const redirectUri = "https://staging.bettermindcare.com/api/oauth/google/callback";

    // --- 2. Exchange code with Google ---
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code_verifier: st.v
      })
    });

    const raw = await tokenRes.text();
    let tokenSet;
    try {
      tokenSet = JSON.parse(raw);
    } catch {}

    if (!tokenRes.ok) {
      const msg = tokenSet?.error_description || tokenSet?.error || `HTTP ${tokenRes.status}`;
      return res.status(400).send(`Token exchange failed: ${msg}`);
    }

    const idToken = tokenSet.id_token;
    if (!idToken) return res.status(400).send('Missing id_token');

    // --- 3. Decode ID token ---
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));

    if (payload.nonce !== st.n) return res.status(400).send('Nonce mismatch');

    const email = String(payload.email || '').toLowerCase();
    if (!email) return res.status(400).send('No email from Google');
    if (payload.email_verified === false) return res.status(403).send('Google email not verified');

    // --- 4. DB LOOKUP ---
    let knex;
    try {
      knex = await require('../db/initKnex')();
    } catch {
      knex = await require('../db/knex')();
    }

    const user = await knex('users')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .select('users.id', 'users.email_canon', 'roles.role_name', 'users.is_deleted')
      .where('users.email_canon', email)
      .andWhere(q => q.where('users.is_deleted', false).orWhereNull('users.is_deleted'))
      .first();

    // --- No account → redirect to signup ---
    if (!user) {
      const fe = process.env.FRONTEND_URL || 'https://staging.bettermindcare.com';
      const qs = new URLSearchParams({ email, reason: 'oauth_no_account' });
      return res.redirect(`${fe}/sign-up?${qs.toString()}`);
    }

    // --- Save tokens (optional) ---
    const now = new Date();
    const expiry = new Date(now.getTime() + (tokenSet.expires_in || 3600) * 1000);

    await knex('user_google_tokens')
      .insert({
        user_id: user.id,
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token || null,
        scope: tokenSet.scope,
        token_type: tokenSet.token_type,
        expiry,
        created_at: now,
        updated_at: now
      })
      .onConflict('user_id')
      .merge({
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token || null,
        scope: tokenSet.scope,
        token_type: tokenSet.token_type,
        expiry,
        updated_at: now
      });

    // --- 5. ISSUE YOUR ONE REAL AUTH COOKIE ---
    issueSessionCookie(res, {
      id: user.id,
      email: user.email_canon,
      role: user.role_name
    });

    // Inject user into req so downstream logic can use req.user
    req.user = {
      id: user.id,
      email: user.email_canon,
      role: user.role_id
    };

    res.set('Cache-Control', 'no-store');

    // --- 6. Redirect back to frontend ---
    const feBase = process.env.FRONTEND_URL || 'https://staging.bettermindcare.com';
    const dest = feBase + (st.rt || '/dashboard');

    return res.redirect(dest);
  } catch (err) {
    console.error('[oauth callback fatal]', err);
    return res.status(500).send('OAuth callback failed');
  }
}); 

module.exports = router;
