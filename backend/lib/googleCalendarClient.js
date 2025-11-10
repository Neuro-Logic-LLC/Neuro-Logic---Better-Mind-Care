// lib/googleCalendarClient.js
const { getServiceAccountClient } = require('./googleServiceAccount');
const { google } = require('googleapis');
const initKnex = require('../db/initKnex');
const { refreshGoogleToken } = require('../utils/refreshGoogleToken'); // reuse your existing function

async function getGoogleCalendar(req) {
  const email = req.session?.user?.email;
  if (!email) throw new Error('No user email in session');

  // CASE 1: Internal Better Mind Care staff
  if (email.endsWith('@bettermindcare.com')) {
    return getServiceAccountClient(email);
  }

  // CASE 2: External users — load their saved OAuth tokens
  const knex = await initKnex();
  const token = await knex('user_google_tokens').where({ user_id: req.session.user.id }).first();
  if (!token) throw new Error('signin_required');

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Refresh token if expired
  const now = Date.now();
  const expiry = token.expiry ? new Date(token.expiry).getTime() : 0;
  if (expiry <= now) {
    const newAccessToken = await refreshGoogleToken(
      knex,
      req.session.user.id,
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    token.access_token = newAccessToken;
    token.expiry = new Date(Date.now() + 3600 * 1000);
  }

  oauth2.setCredentials({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    expiry_date: token.expiry ? new Date(token.expiry).getTime() : undefined,
  });

  return google.calendar({ version: 'v3', auth: oauth2 });
}

module.exports = { getGoogleCalendar };