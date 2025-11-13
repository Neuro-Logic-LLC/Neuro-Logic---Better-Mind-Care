// backend/routes/oauthRoutes.js
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { issueSessionCookie } = require('../utils/issueSessionCookie'); // <- filename per your project
const { initGoogle, startAuth, getConfig, ensureReady } = require('../auth/OIDC');

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

    const nonce = crypto.randomBytes(16).toString('hex');

    // Let OIDC prep PKCE, we’ll replace "state" with our signed JWT
    const { url, code_verifier } = await startAuth({ state: 'placeholder', nonce });

    const feBase =
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || pickFrontendBase(req)
        : process.env.FRONTEND_URL_DEV || 'https://localhost:5050';

    const returnTo = sanitizeReturnTo(req.query.returnTo, feBase);

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
    next(err);
  }
});

// GET /api/oauth/google/callback
router.get('/google/callback', async (req, res, next) => {
  try {
    // survive restarts between init/callback
    try {
      await ensureReady();
    } catch {
      const base = `${req.protocol}://${req.get('host')}`;
      await initGoogle({ base });
      await ensureReady();
    }
    const { server: as, client, redirectUri } = getConfig();

    const abs = new URL(`${req.protocol}://${req.get('host')}${req.originalUrl}`);
    const stateJWT = abs.searchParams.get('state');
    const code = abs.searchParams.get('code');
    const err = abs.searchParams.get('error');
    if (err) return res.status(400).send(`OAuth error: ${err}`);
    if (!code) return res.status(400).send('Missing code');
    if (!stateJWT) return res.status(400).send('Missing state');

    let st;
    try {
      st = jwt.verify(stateJWT, process.env.JWT_SECRET, { issuer: 'bmc' });
    } catch {
      return res.status(400).send('Bad/expired state');
    }

    // Exchange code -> tokens with PKCE
    const form = new URLSearchParams();
    form.set('grant_type', 'authorization_code');
    form.set('code', code);
    form.set('redirect_uri', redirectUri);
    form.set('client_id', client.client_id);
    form.set('client_secret', client.client_secret);
    form.set('code_verifier', st.v);

    const tRes = await fetch(as.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });

    const raw = await tRes.text();
    let tokenSet = null;
    try {
      tokenSet = JSON.parse(raw);
    } catch {}
    if (!tRes.ok) {
      const msg = tokenSet?.error_description || tokenSet?.error || `HTTP ${tRes.status}`;
      return res.status(400).send(`Token error: ${msg}`);
    }

    // Minimal ID token checks + email
    const idt = tokenSet.id_token || '';
    let payload;
    try {
      payload = JSON.parse(
        Buffer.from(idt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
          'utf8'
        )
      );
    } catch {
      return res.status(400).send('Invalid id_token');
    }
    if (payload.nonce !== st.n) return res.status(400).send('Unexpected ID Token "nonce" value');
    const email = String(payload.email || '').toLowerCase();
    if (!email) return res.status(400).send('No email in Google id_token');
    if (payload.email_verified === false) return res.status(403).send('Google email not verified');

    // Lookup user (no auto insert)
    let knex;
    try {
      try {
        knex = await require('../db/initKnex')();
      } catch {
        knex = await require('../db/knex')();
      }
    } catch (dbInitErr) {
      console.error('[oauth] DB init failed:', dbInitErr);
      return res.status(500).send('Database unavailable');
    }

    const user = await knex('users')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .select(
        'users.id',
        'users.email_canon',
        'roles.role_name',
        'users.is_email_confirmed',
        'users.is_deleted'
      )
      .where('users.email_canon', email)
      .andWhere(q => q.where('users.is_deleted', false).orWhereNull('users.is_deleted'))
      .first();

    // Save or update Google tokens
    const now = new Date();
    const expiry = new Date(now.getTime() + (tokenSet.expires_in || 3600) * 1000);

    if (!user || user.is_deleted) {
      const feBase =
        process.env.NODE_ENV === 'production'
          ? process.env.FRONTEND_URL || pickFrontendBase(req)
          : process.env.FRONTEND_URL_DEV || 'https://localhost:3000';
      const qs = new URLSearchParams({ email, reason: 'oauth_no_account' });
      return res.redirect(`${feBase}/sign-up`);
    }

    // --- Save or update Google tokens (preserve existing refresh_token if none returned)
    const insertData = {
      user_id: user.id,
      access_token: tokenSet.access_token,
      scope: tokenSet.scope,
      token_type: tokenSet.token_type,
      expiry,
      created_at: now,
      updated_at: now
    };

    if (tokenSet.refresh_token) insertData.refresh_token = tokenSet.refresh_token;

    await knex('user_google_tokens')
      .insert(insertData)
      .onConflict('user_id')
      .merge({
        access_token: tokenSet.access_token,
        scope: tokenSet.scope,
        token_type: tokenSet.token_type,
        expiry,
        updated_at: now,
        ...(tokenSet.refresh_token ? { refresh_token: tokenSet.refresh_token } : {})
      });

    req.session.user = {
      id: user.id,
      email: user.email_canon,
      role_name: user.role_id,
      is_email_confirmed: user.is_active
    };

    // Set the ONE auth cookie (7d) and clear legacy junk
    issueSessionCookie(res, {
      id: user.id,
      email: user.email_canon,
      role: user.role_id || 'User',
      is_email_confirmed: user.is_active
    });
    res.set('Cache-Control', 'no-store');

    const clear = { domain: '.bettermindcare.com', path: '/' };
    res.clearCookie('token', clear); // old name
    const badSid = (req.cookies?.['bmc.sid'] || '').split('.').length === 3;
    if (badSid) res.clearCookie('bmc.sid', clear);

    // FE base from env (prod or dev), no “staging” env concept here
    let feBase =
      process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || 'https://bettermindcare.com'
        : process.env.FRONTEND_URL_DEV || 'https://localhost:3000';
    feBase = feBase.replace(/\/+$/, '');

    const dest = feBase + sanitizeReturnTo(st.rt, feBase);
    return res.redirect(dest);
  } catch (e) {
    console.error('[oauth] callback fatal:', e);
    next(e);
  }
});

module.exports = router;
