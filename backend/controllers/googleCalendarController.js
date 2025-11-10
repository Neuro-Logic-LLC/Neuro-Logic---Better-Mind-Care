// src/backend/controllers/googleCalendarController.js
const { google } = require('googleapis');
const crypto = require('crypto');

const { TokenExpiredError } = require('google-auth-library');   // Adjusted path as needed

// Run startup initializers inside an async IIFE (avoids top-level await in CommonJS)
(async () => {
  try {
    if (typeof require('../utils/loadSSMParams') === 'function') {
      await require('../utils/loadSSMParams')();
    } else {
      await require('../utils/loadSSMParams');
    }

    if (typeof require('../db/initKnex') === 'function') {
      await require('../db/initKnex')();
    } else {
      await require('../db/initKnex');
    }

    const getOauth4w = require('../lib/oauth4w');
    if (typeof getOauth4w === 'function') await getOauth4w();

    const initGoogle = require('../auth/OIDC').initGoogle;
    if (typeof initGoogle === 'function') await initGoogle();
  } catch (err) {
    console.error('googleCalendarController init error:', err);
  }
})();

function overlaps(aStart, aEnd, bStart, bEnd) {
  return Math.max(+aStart, +bStart) < Math.min(+aEnd, +bEnd);
}

async function getGoogleAuthFromSession(session) {
  const t = session?.googleTokens;
  if (!t?.access_token) throw new Error('signin_required');
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI_DEV || process.env.GOOGLE_REDIRECT_URI
  );
  oauth2.setCredentials({
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expiry_date: (t.obtained_at || Date.now()) + (t.expires_in || 3600) * 1000
  });
  try {
    await oauth2.getAccessToken();
    return oauth2;
  } catch (e) {
  console.error('[create-meeting] Error:', e?.message || e, e?.response?.data || '');

  // Handle token expiration errors based on error message
  if (e.message && (e.message.includes('invalid_grant') || e.message.includes('expired_token'))) {
    return res.status(401).json({ error: 'token_invalid_or_revoked: re-auth required' });
  }

  // Handle "google_reauth" errors specifically
  if (e.message === 'google_reauth') {
    return res.status(401).json({ error: 'google_reauth' });
  }

  // If no valid token is found, request the user to reauthenticate
  if (String(e?.message || '').includes('signin_required')) {
    return res
      .status(401)
      .json({ error: 'signin_required: no Google token. Hit /api/oauth/google' });
  }

  // General error handling for other errors
  return res.status(500).json({ error: 'Internal Server Error: ' + String(e?.message || e) });
}
}

async function listGoogleEvents(
  session,
  { calendarId = 'jim@bettermindcare.com', timeMin, timeMax, includePastDays = 0 } = {}
) {
  const auth = await getGoogleAuthFromSession(session);
  const calendar = google.calendar({ version: 'v3', auth });

  const startQ = timeMin ? new Date(timeMin) : new Date();
  const endQ = timeMax ? new Date(timeMax) : new Date(Date.now() + 7 * 86400000);

  if (includePastDays > 0) startQ.setDate(startQ.getDate() - includePastDays);

  // Google timeMax is exclusive → add 1 day so end-boundary events show up
  const apiTimeMin = startQ.toISOString();
  const apiTimeMax = new Date(endQ.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data } = await calendar.events.list({
    calendarId: "jim@bettermindcare.com",
    timeMin: apiTimeMin,
    timeMax: apiTimeMax,
    singleEvents: true,
    orderBy: 'startTime',
    showDeleted: false,
    maxResults: 2500
  });

  const events = (data.items || []).map(ev => {
    // Normalize all-day vs dateTime
    const startISO = ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T00:00:00` : null);
    let endISO;
    if (ev.end?.dateTime) {
      endISO = ev.end.dateTime;
    } else if (ev.end?.date) {
      // all-day end.date is the NEXT day → subtract 1ms to render on the day
      endISO = new Date(new Date(`${ev.end.date}T00:00:00`).getTime() - 1).toISOString();
    } else {
      endISO = startISO;
    }

    const meetUrl =
      ev.hangoutLink ||
      ev.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri ||
      null;
    console.log(meetUrl);

    return {
      id: ev.id,
      title: ev.summary || '(no title)',
      start: startISO,
      end: endISO,
      htmlLink: ev.htmlLink,
      location: ev.location,
      attendees: ev.attendees || [],
      meetUrl,
      isAllDay: Boolean(ev.start?.date && !ev.start?.dateTime)
    };
  });

  return events;
}

async function createGoogleMeet(session, summary, startTime, endTime, timeZone = 'UTC') {
  const auth = await getGoogleAuthFromSession(session);
  console.log(auth);
  const calendar = google.calendar({ version: 'v3', auth });

  const startISO = new Date(startTime).toISOString();
  const endISO = endTime
    ? new Date(endTime).toISOString()
    : new Date(new Date(startTime).getTime() + 30 * 60000).toISOString();

  const { data: ev } = await calendar.events.insert({
    calendarId: 'jim@bettermindcare.com',
    conferenceDataVersion: 1,
    requestBody: {
      summary,
      start: { dateTime: startISO, timeZone },
      end: { dateTime: endISO, timeZone },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    }
  });

  return { join_url: ev.hangoutLink, start: ev.start, end: ev.end };
}

async function scheduleMeeting(platform, session, summary, startTime, endTime, timeZone = 'UTC') {
  if (platform === 'google') {
    const event = await createGoogleMeet(session, summary, startTime, endTime, timeZone);
    return { ...event, platform: 'google' };
  }
  if (platform === 'zoom') {
    // TODO: implement when ready
    throw new Error('Zoom not implemented');
  }
  throw new Error('Unsupported platform');
}

exports.scheduleMeeting = scheduleMeeting;
exports.listGoogleEvents = listGoogleEvents;


