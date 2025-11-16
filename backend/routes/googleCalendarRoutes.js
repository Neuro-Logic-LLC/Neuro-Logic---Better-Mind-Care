const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { google } = require('googleapis');
const { verifyToken } = require('../middleware/auth');
const initKnex = require('../db/initKnex');
const loadSSMParams = require('../utils/loadSSMParams');

// ---------------------- CONFIG ----------------------
const CALENDAR_ID = 'admin@bettermindcare.com';
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

// ---------------------- HELPERS ----------------------
const iso = dt => new Date(dt).toISOString();

function overlaps(aStart, aEnd, bStart, bEnd) {
  return Math.max(+aStart, +bStart) < Math.min(+aEnd, +bEnd);
}

function clampDuration(startISO, endISO, fallbackMin = 30) {
  const startMs = new Date(startISO).getTime();
  const endMs = endISO ? new Date(endISO).getTime() : NaN;
  const ms = Number.isFinite(endMs) && endMs > startMs
    ? endMs - startMs
    : fallbackMin * 60000;
  return { startISO, endISO: new Date(startMs + ms).toISOString() };
}

function isGoogleAuthError(e) {
  const code = e?.code || e?.response?.status;
  const msg = String(e?.message || '');
  return code === 401 || msg.includes('invalid_grant') || msg.includes('invalid_token');
}

// ---------------------- SYSTEM OAUTH ----------------------
let systemOAuth = null;

// Load jerod@ token from DB
async function loadSystemOAuth() {
  const knex = await initKnex();
  const row = await knex('system_google_tokens').first();

  if (!row) throw new Error('system_google_tokens table empty');

  const oauth = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  oauth.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: new Date(row.expiry).getTime(),
  });

  systemOAuth = oauth;
}

// Refresh system token if needed
async function refreshSystemTokenIfNeeded() {
  if (!systemOAuth) return;

  const expiry = systemOAuth.credentials.expiry_date;
  const now = Date.now();

  if (expiry && expiry - now < 60000) {
    const newTokens = await systemOAuth.refreshAccessToken();
    const creds = newTokens.credentials;

    const knex = await initKnex();
    await knex('system_google_tokens').update({
      access_token: creds.access_token,
      expiry: new Date(creds.expiry_date),
      updated_at: knex.fn.now(),
    });

    systemOAuth.setCredentials({
      access_token: creds.access_token,
      refresh_token: systemOAuth.credentials.refresh_token,
      expiry_date: creds.expiry_date,
    });
  }
}

// Global guard — ensure user is logged in *and paid*
async function requireSystemGoogleAuth(req, res) {
  if (!req.user) {
    return { error: res.status(401).json({ error: 'auth_required' }) };
  }

  if (!req.user.has_paid) {
    return { error: res.status(403).json({ error: 'payment_required' }) };
  }

  if (!systemOAuth) {
    return { error: res.status(500).json({ error: 'google_not_ready' }) };
  }

  try {
    await refreshSystemTokenIfNeeded();
  } catch (e) {
    return { error: res.status(500).json({ error: 'google_refresh_failed' }) };
  }

  return { oauth: systemOAuth };
}

// ---------------------- BOOTSTRAP (RUNS ONCE) ----------------------
(async () => {
  try {
    await loadSSMParams();
    await initKnex();

    await loadSystemOAuth();

    console.log('System Google OAuth loaded AFTER SSM+DB ready');
  } catch (err) {
    console.error('[SYSTEM GOOGLE OAUTH INIT ERROR]', err);
  }
})();