const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { google } = require('googleapis');
const { verifyToken } = require('../middleware/auth');
const initKnex = require('../db/initKnex');
const loadSSMParams = require('../utils/loadSSMParams');

// ---------------------- CONFIG ----------------------
const CALENDAR_ID = 'bmc-calendar-access@tactical-prism-468521-f6.iam.gserviceaccount.com';
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

// ---------------------- HELPERS ----------------------
const iso = dt => new Date(dt).toISOString();

function overlaps(aStart, aEnd, bStart, bEnd) {
  return Math.max(+aStart, +bStart) < Math.min(+aEnd, +bEnd);
}

function clampDuration(startISO, endISO, fallbackMin = 30) {
  const startMs = new Date(startISO).getTime();
  const endMs = endISO ? new Date(endISO).getTime() : NaN;
  const ms = Number.isFinite(endMs) && endMs > startMs ? endMs - startMs : fallbackMin * 60000;
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

  if (!row) {
    console.warn('No system Google tokens stored. System OAuth not active yet.');
    return; // <-- THIS is the fix
  }

  const oauth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

  oauth.setCredentials({
    access_token: row.access_token,
    refresh_token: row.refresh_token,
    expiry_date: new Date(row.expiry).getTime()
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
      updated_at: knex.fn.now()
    });

    systemOAuth.setCredentials({
      access_token: creds.access_token,
      refresh_token: systemOAuth.credentials.refresh_token,
      expiry_date: creds.expiry_date
    });
  }
}

// Global guard — ensure user is logged in *and paid*
async function requireSystemGoogleAuth(req, res) {
  if (!req.user) {
    return { error: res.status(401).json({ error: 'auth_required' }) };
  }

  const knex = await initKnex();
  const dbUser = await knex('users').where('id', req.user.id).first();

  if (!dbUser || !dbUser.has_paid) {
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

// ----- Routes -----
router.get('/check-session', verifyToken, (req, res) => {
  if (!req.session.views) req.session.views = 0;
  req.session.views++;
  res.json({
    storeType: req.session.store.constructor.name, // should be "MemoryStore"
    views: req.session.views,
    session: req.session
  });
});

// Create Meeting
router.post('/create-meeting', verifyToken, async (req, res) => {
  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const {
      summary,
      description,
      start_time,
      end_time,
      time_zone,
      calendarId,
      patient_email,
      patient_name
    } = req.body;

    if (!summary || !start_time) {
      return res.status(400).json({ error: 'summary and start_time required' });
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const startISO = iso(start_time);
    const { endISO } = clampDuration(startISO, end_time && iso(end_time), 30);

    // Check availability
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: startISO,
        timeMax: endISO,
        items: [{ id: calendarId || CALENDAR_ID }]
      }
    });

    const busy = fb.data.calendars[calendarId || CALENDAR_ID]?.busy || [];
    const overlap = busy.some(b =>
      overlaps(new Date(startISO), new Date(endISO), new Date(b.start), new Date(b.end))
    );
    if (overlap) return res.status(409).json({ error: 'slot_unavailable' });

    const { data: ev } = await calendar.events.insert({
      calendarId: calendarId || CALENDAR_ID,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        summary,
        description: description || 'Telehealth visit.',
        start: { dateTime: startISO, timeZone: time_zone },
        end: { dateTime: endISO, timeZone: time_zone },
        attendees: patient_email ? [{ email: patient_email, displayName: patient_name }] : [],
        reminders: { useDefault: true },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        },
        guestsCanSeeOtherGuests: false
      }
    });

    res.json({
      success: true,
      platform: 'google',
      join_url: ev.hangoutLink,
      start: ev.start,
      end: ev.end,
      event_id: ev.id,
      html_link: ev.htmlLink
    });
  } catch (e) {
    if (isGoogleAuthError(e)) return res.status(401).json({ error: 'google_reauth' });
    console.error('create-meeting error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Get Availability
router.get('/availability', verifyToken, async (req, res) => {
  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const { date, tz = 'America/Chicago' } = req.query;
    const slotMins = Math.max(5, Number(req.query.slot || 30));

    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });

    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: CALENDAR_ID }]
      }
    });

    const busy = fb.data.calendars[CALENDAR_ID]?.busy || [];
    const busyRanges = busy.map(b => [new Date(b.start).getTime(), new Date(b.end).getTime()]);

    const officeStart = new Date(`${date}T09:00:00`).getTime();
    const officeEnd = new Date(`${date}T17:00:00`).getTime();

    const slots = [];

    for (let t0 = officeStart; t0 + slotMins * 60000 <= officeEnd; t0 += slotMins * 60000) {
      const t1 = t0 + slotMins * 60000;
      const taken = busyRanges.some(([b0, b1]) => Math.max(t0, b0) < Math.min(t1, b1));
      if (!taken) {
        slots.push({ start: new Date(t0).toISOString(), end: new Date(t1).toISOString(), tz });
      }
    }

    res.json({ date, tz, slot: slotMins, slots });
  } catch (e) {
    if (isGoogleAuthError(e)) return res.status(401).json({ error: 'google_reauth' });
    console.error('availability error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// List Events
router.get('/events', verifyToken, async (req, res) => {
  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const startQ = req.query.start ? new Date(req.query.start) : new Date();
    const endQ = req.query.end ? new Date(req.query.end) : new Date(Date.now() + 7 * 86400000);

    const timeMin = startQ.toISOString();
    const timeMax = new Date(endQ.getTime() + 86400000).toISOString();

    const { data } = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      maxResults: 2500
    });
    console.log(data);
    const events = (data.items || []).map(ev => ({
      id: ev.id,
      title: ev.summary || 'Time Booked',
      start: ev.start?.dateTime || `${ev.start?.date}T00:00:00`,
      end:
        ev.end?.dateTime ||
        new Date(new Date(`${ev.end?.date}T00:00:00`).getTime() - 1).toISOString(),
      htmlLink: ev.htmlLink,
      meetUrl:
        ev.hangoutLink ||
        ev.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri ||
        null,
      location: ev.location,
      attendees: ev.attendees || [],
      isAllDay: Boolean(ev.start?.date && !ev.start?.dateTime)
    }));

    res.json({ events });
  } catch (e) {
    if (isGoogleAuthError(e)) return res.status(401).json({ error: 'google_reauth' });
    console.error('events error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Get Pending Appointment Requests
router.get('/pending-events', verifyToken, async (req, res) => {
  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const { data } = await calendar.events.list({
      calendarId: CALENDAR_ID,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      maxResults: 2500
    });

    const pending = (data.items || [])
      .filter(ev => ev.status === 'tentative')
      .map(ev => ({
        id: ev.id,
        status: ev.status,
        title: ev.summary || 'Pending Request',
        start: ev.start?.dateTime || `${ev.start?.date}T00:00:00`,
        end:
          ev.end?.dateTime ||
          new Date(new Date(`${ev.end?.date}T00:00:00`).getTime() - 1).toISOString(),
        notes: ev.description || '',
        attendees: ev.attendees || [],
        patientName: ev.attendees?.[0]?.displayName || '',
        patientEmail: ev.attendees?.[0]?.email || '',
        htmlLink: ev.htmlLink
      }));

    res.json({ pending });
  } catch (e) {
    if (isGoogleAuthError(e)) return res.status(401).json({ error: 'google_reauth' });
    console.error('pending-events error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Patch Event
router.patch('/events/:id', verifyToken, async (req, res) => {
  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth });
    const eventId = req.params.id;
    const { summary, start_time, end_time, time_zone = 'UTC' } = req.body || {};

    if (start_time && end_time) {
      // Collision check
      const fb = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: iso(start_time),
        timeMax: iso(end_time),
        singleEvents: true,
        showDeleted: false,
        maxResults: 50
      });

      const collision = (fb.data.items || []).some(ev => {
        if (ev.id === eventId) return false;
        const s = new Date(ev.start.dateTime || `${ev.start.date}T00:00:00Z`);
        const e = new Date(ev.end.dateTime || `${ev.end.date}T23:59:59Z`);
        return overlaps(new Date(start_time), new Date(end_time), s, e);
      });

      if (collision) return res.status(409).json({ error: 'slot_unavailable' });
    }

    const requestBody = {};
    if (summary) requestBody.summary = summary;
    if (start_time && end_time) {
      requestBody.start = { dateTime: iso(start_time), timeZone: time_zone };
      requestBody.end = { dateTime: iso(end_time), timeZone: time_zone };
    }

    const { data: ev } = await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId,
      sendUpdates: 'all',
      requestBody
    });

    res.json({
      id: ev.id,
      title: ev.summary || 'Time Booked',
      start: ev.start?.dateTime || ev.start?.date,
      end: ev.end?.dateTime || ev.end?.date,
      htmlLink: ev.htmlLink,
      meetUrl:
        ev.hangoutLink ||
        ev.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri ||
        null
    });
  } catch (e) {
    if (isGoogleAuthError(e)) return res.status(401).json({ error: 'google_reauth' });
    console.error('patch error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// Delete Event
router.delete('/events/:id', verifyToken, async (req, res) => {
  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth });
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: req.params.id,
      sendUpdates: 'all'
    });
    res.json({ ok: true });
  } catch (e) {
    if (isGoogleAuthError(e)) return res.status(401).json({ error: 'google_reauth' });
    console.error('delete error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

module.exports = router;
