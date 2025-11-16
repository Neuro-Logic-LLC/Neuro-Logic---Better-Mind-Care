// backend/routes/oauthRoutes.js
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { issueSessionCookie } = require('../utils/issueSessionCookie'); // <- filename per your project
const { initGoogle, startAuth, getConfig, ensureReady } = require('../auth/OIDC');
// initialize lazily inside the route to avoid top-level await in CommonJS
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
router.get('/google', async (req, res, next) => {
  try {
    const base = `${req.protocol}://${req.get('host')}`;
    await initGoogle({ base });
    // make sure OIDC helper finished initialization
    await ensureReady();
    const feBase =
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || pickFrontendBase(req)
        : process.env.FRONTEND_URL_DEV || 'https://localhost:3000';

    const returnTo = sanitizeReturnTo(req.query.returnTo, feBase);

    // create PKCE+url via OIDC helper
    const nonce = crypto.randomBytes(16).toString('hex');
    const { url, code_verifier } = await startAuth({ state: 'placeholder', nonce });

    // Signed, short-lived state carrying PKCE + returnTo
    const stateJWT = jwt.sign(
      { v: code_verifier, n: nonce, rt: returnTo, r: crypto.randomBytes(8).toString('hex') },
      process.env.JWT_SECRET,
      { expiresIn: '10m', issuer: 'bmc' }
    );

    const u = new URL(url);
    u.searchParams.set('state', stateJWT);
    return res.redirect(u.toString());
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

    // Ensure OIDC helper is initialized and get the exact redirectUri used during /google
    await ensureReady();
    const { redirectUri } = getConfig();

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


const { google } = require("googleapis");

const SYSTEM_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar",
  "openid profile email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.freebusy"

];

const sysOauth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI_SYSTEM // <-- MUST be separate from user redirect URI
);

// STEP 1: Start system OAuth 
router.get("/system/google", async (req, res) => {
  try {
    const url = sysOauth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SYSTEM_SCOPES
    });

    return res.redirect(url);
  } catch (err) {
    console.error("SYSTEM OAUTH START ERROR:", err);
    return res.status(500).send("System OAuth failed");
  }
});

// STEP 2: Handle callback from Google
router.get("/system/google/callback", async (req, res) => {
  try {
    const { code, error } = req.query;
    if (error) return res.status(400).send(`OAuth error: ${error}`);
    if (!code) return res.status(400).send("Missing code");

    const knex = await require("../db/initKnex")();

    // Exchange code for tokens
    const { tokens } = await sysOauth.getToken(code);

    if (!tokens.refresh_token) {
      return res.status(400).send(
        "No refresh token returned. Google requires prompt=consent. Try again."
      );
    }

    // Clear old system token
    await knex("system_google_tokens").del();

    // Store new system tokens
    await knex("system_google_tokens").insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry: new Date(tokens.expiry_date),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });

    return res.send("System Google OAuth completed! Tokens stored.");
  } catch (err) {
    console.error("SYSTEM OAUTH CALLBACK ERROR:", err);
    return res.status(500).send("System OAuth callback failed");
  }
});


module.exports = router;
