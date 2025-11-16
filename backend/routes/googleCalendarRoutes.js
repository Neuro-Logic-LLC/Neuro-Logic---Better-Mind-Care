// googleCalendarRoutes.js
// System OAuth calendar integration for jerod@bettermindcare.com
// Patients: book/read-only
// Admin/Doctor: update+delete
// No per-user Google OAuth

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { google } = require('googleapis');
const { verifyToken } = require('../middleware/auth');
const initKnex = require('../db/initKnex');
const loadSSMParams = require('../utils/loadSSMParams');

// ---------------------- CONFIG ----------------------
const CALENDAR_ID = 'jerod@bettermindcare.com';
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;

// ---------------------- LOAD SSM + DB ----------------------
(async () => {
  try {
    if (typeof loadSSMParams === 'function') await loadSSMParams();
    if (typeof initKnex === 'function') await initKnex();
    console.log('Google Calendar System OAuth ready');
  } catch (err) {
    console.error('Bootstrap error:', err);
  }
})();

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

loadSystemOAuth().catch(console.error);

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

// ------------------------------------------------------------
// PATIENT: CREATE MEETING
// ------------------------------------------------------------
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
      patient_email,
      patient_name,
    } = req.body;

    if (!summary || !start_time) {
      return res.status(400).json({ error: 'summary and start_time required' });
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const startISO = iso(start_time);
    const { endISO } = clampDuration(startISO, end_time && iso(end_time));

    // Check availability
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: startISO,
        timeMax: endISO,
        items: [{ id: CALENDAR_ID }],
      },
    });

    const busy = fb.data.calendars[CALENDAR_ID]?.busy || [];
    const conflict = busy.some(b =>
      overlaps(new Date(startISO), new Date(endISO), new Date(b.start), new Date(b.end))
    );

    if (conflict) {
      return res.status(409).json({ error: 'slot_unavailable' });
    }

    const { data: ev } = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      sendUpdates: 'all',
      conferenceDataVersion: 1,
      requestBody: {
        summary,
        description: description || 'Telehealth Visit',
        start: { dateTime: startISO, timeZone: time_zone },
        end: { dateTime: endISO, timeZone: time_zone },
        attendees: patient_email
          ? [{ email: patient_email, displayName: patient_name }]
          : [],
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        guestsCanSeeOtherGuests: false,
        reminders: { useDefault: true },
      },
    });

    res.json({
      success: true,
      event_id: ev.id,
      join_url: ev.hangoutLink,
      start: ev.start,
      end: ev.end,
      html_link: ev.htmlLink,
    });
  } catch (e) {
    if (isGoogleAuthError(e))
      return res.status(401).json({ error: 'google_reauth' });
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ------------------------------------------------------------
// PATIENT: GET AVAILABILITY
// ------------------------------------------------------------
router.get('/availability', verifyToken, async (req, res) => {
  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const { date, tz = 'America/Chicago' } = req.query;
    const slotMins = Math.max(5, Number(req.query.slot || 30));

    if (!date) return res.status(400).json({ error: 'date required' });

    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: CALENDAR_ID }],
      },
    });

    const busy = fb.data.calendars[CALENDAR_ID]?.busy || [];
    const busyRanges = busy.map(b => [new Date(b.start).getTime(), new Date(b.end).getTime()]);

    const slots = [];
    const officeStart = new Date(`${date}T09:00:00`).getTime();
    const officeEnd = new Date(`${date}T17:00:00`).getTime();

    for (let t0 = officeStart; t0 + slotMins * 60000 <= officeEnd; t0 += slotMins * 60000) {
      const t1 = t0 + slotMins * 60000;
      const taken = busyRanges.some(([b0, b1]) => Math.max(t0, b0) < Math.min(t1, b1));
      if (!taken) {
        slots.push({
          start: new Date(t0).toISOString(),
          end: new Date(t1).toISOString(),
          tz,
        });
      }
    }

    res.json({ date, tz, slots });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ------------------------------------------------------------
// PATIENT: READ EVENTS
// ------------------------------------------------------------
router.get('/events', verifyToken, async (req, res) => {
  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const startQ = req.query.start ? new Date(req.query.start) : new Date();
    const endQ = req.query.end
      ? new Date(req.query.end)
      : new Date(Date.now() + 7 * 86400000);

    const timeMin = startQ.toISOString();
    const timeMax = new Date(endQ.getTime() + 86400000).toISOString();

    const { data } = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      maxResults: 2500,
    });

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
      attendees: ev.attendees || [],
    }));

    res.json({ events });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ------------------------------------------------------------
// ADMIN/DOCTOR: UPDATE EVENT
// ------------------------------------------------------------
router.patch('/events/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'no_permission' });
  }

  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const eventId = req.params.id;
    const { summary, start_time, end_time, time_zone = 'America/Chicago' } = req.body;

    const calendar = google.calendar({ version: 'v3', auth: oauth });

    // Check collisions if moving the event
    if (start_time && end_time) {
      const fb = await calendar.events.list({
        calendarId: CALENDAR_ID,
        timeMin: iso(start_time),
        timeMax: iso(end_time),
        showDeleted: false,
        singleEvents: true,
      });

      const conflict = (fb.data.items || []).some(ev => {
        if (ev.id === eventId) return false;

        const s = new Date(ev.start.dateTime || `${ev.start.date}T00:00:00Z`);
        const e = new Date(ev.end.dateTime || `${ev.end.date}T23:59:59Z`);

        return overlaps(new Date(start_time), new Date(end_time), s, e);
      });

      if (conflict) {
        return res.status(409).json({ error: 'slot_unavailable' });
      }
    }

    // Update fields
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
      requestBody,
    });

    res.json({
      id: ev.id,
      title: ev.summary || 'Time Booked',
      start: ev.start?.dateTime,
      end: ev.end?.dateTime,
      htmlLink: ev.htmlLink,
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ------------------------------------------------------------
// ADMIN/DOCTOR: DELETE EVENT
// ------------------------------------------------------------
router.delete('/events/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'no_permission' });
  }

  const { oauth, error } = await requireSystemGoogleAuth(req, res);
  if (error) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth });

    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: req.params.id,
      sendUpdates: 'all',
    });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

module.exports = router;
