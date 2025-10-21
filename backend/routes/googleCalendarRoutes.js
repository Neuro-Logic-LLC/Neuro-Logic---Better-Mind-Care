// src/backend/routes/googleCalendarRoutes.js
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const crypto = require('crypto');

// If you still use these elsewhere, keep them:
const { scheduleMeeting, TokenExpiredError } = require('../controllers/googleCalendarController');

/** ---------- Helpers ---------- */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return Math.max(+aStart, +bStart) < Math.min(+aEnd, +bEnd);
}

function getOAuth2ForSession(session) {
  const t = session?.googleTokens;
  if (!t?.access_token) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // expiry_date as ms since epoch. Google client will refresh if refresh_token present.
  oauth2.setCredentials({
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expiry_date: (t.obtained_at || Date.now()) + (t.expires_in || 3600) * 1000
  });

  return oauth2;
}

function asISO(dt) {
  return new Date(dt).toISOString();
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
  return (
    code === 401 ||
    msg.includes('invalid_grant') ||
    msg.includes('invalid_token') ||
    msg.includes('signin_required')
  );
}

/** ---------- Create Meeting ---------- */
// POST /api/calendar/create-meeting
router.post('/create-meeting', async (req, res) => {
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

    const oauth2 = getOAuth2ForSession(req.session);
    if (!oauth2) {
      return res
        .status(401)
        .json({ error: 'signin_required: no Google token. Hit /api/oauth/google' });
    }

    // force token refresh if needed (no-op if valid)
    await oauth2.getAccessToken().catch(() => {
      /* ignore, googleapis refreshes when needed */
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2 });

    const startISO = asISO(start_time);
    const { endISO } = clampDuration(startISO, end_time && asISO(end_time), 30);

    // availability check
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: startISO,
        timeMax: endISO,
        items: [{ id: 'jim@bettermindcare.com' }]
      }
    });

    const busy = fb.data?.calendars?.primary?.busy || [];
    const slotTaken = busy.some(b => {
      const b0 = new Date(b.start).getTime();
      const b1 = new Date(b.end).getTime();
      const s0 = new Date(startISO).getTime();
      const s1 = new Date(endISO).getTime();
      // overlap if max(starts) < min(ends)
      return Math.max(b0, s0) < Math.min(b1, s1);
    });

    if (slotTaken) {
      return res.status(409).json({ error: 'slot_unavailable' });
    }


    const { data: ev } = await calendar.events.insert({
      calendarId: calendarId,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        summary,
        description: 'BetterMindCare Telehealth visit. Please join a few minutes early.',
        start: { dateTime: startISO, timeZone: time_zone },
        end: { dateTime: endISO, timeZone: time_zone },
        attendees: patient_email
          ? [{ email: patient_email, displayName: patient_name || undefined }]
          : [],
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

    return res.json({
      success: true,
      platform: 'google',
      join_url: ev.hangoutLink,
      start: ev.start,
      end: ev.end,
      event_id: ev.id,
      html_link: ev.htmlLink
    });
  } catch (e) {
    if (e instanceof TokenExpiredError || isGoogleAuthError(e)) {
      return res.status(401).json({ error: 'token_invalid_or_revoked: re-auth required' });
    }
    if (String(e.message).includes('signin_required')) {
      return res
        .status(401)
        .json({ error: 'signin_required: no Google token. Hit /api/oauth/google' });
    }
    console.error('[create-meeting]', e);
    return res.status(500).json({ error: e.message });
  }
});

/** ---------- Availability ---------- */
// GET /api/calendar/availability?date=YYYY-MM-DD&tz=America/Chicago&slot=30
router.get('/availability', async (req, res) => {
  try {
    const tz = req.query.tz || 'America/Chicago';
    const date = req.query.date; // 'YYYY-MM-DD'
    const slotMins = Math.max(5, Number(req.query.slot || 30));

    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });

    const oauth2 = getOAuth2ForSession(req.session);
    if (!oauth2) return res.status(401).json({ error: 'signin_required' });

    const calendar = google.calendar({ version: 'v3', auth: oauth2 });

    // office hours. Make this dynamic per provider later.
    const [startHour, endHour] = [9, 17]; // 9am to 5pm

    const dayStart = new Date(`${date}T10:00:00`);
    const dayEnd = new Date(`${date}T20:59:59`);

    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: 'jim@bettermindcare.com' }]
      }
    });
    const calendarId = "jim@bettermindcare.com"
    const calKey = calendarId || 'primary';
    const busy = fb.data?.calendars?.['jim@bettermindcare.com']?.busy || [];
    // const busy = (data.calendars?.primary?.busy || []).map(b => [
    //   new Date(b.start).getTime(),
    //   new Date(b.end).getTime()
    // ]);

    const officeStart = new Date(`${date}T${String(startHour).padStart(2, '0')}:07:00`).getTime();
    const officeEnd = new Date(`${date}T${String(endHour).padStart(2, '0')}:03:00`).getTime();

    const slots = [];
    for (let t0 = officeStart; t0 + slotMins * 60000 <= officeEnd; t0 += slotMins * 60000) {
      const t1 = t0 + slotMins * 60000;
      const overlaps = busy.some(([b0, b1]) => Math.max(t0, b0) < Math.min(t1, b1));
      if (!overlaps) {
        slots.push({ start: new Date(t0).toISOString(), end: new Date(t1).toISOString(), tz });
      }
    }

    return res.json({ date, tz, slot: slotMins, slots });
  } catch (e) {
    if (isGoogleAuthError(e)) {
      return res.status(401).json({ error: 'token_invalid_or_revoked: re-auth required' });
    }
    console.error('[availability]', e);
    return res.status(500).json({ error: e.message });
  }
});

/** ---------- Events for React Big Calendar ---------- */
// GET /api/calendar/events?start=ISO&end=ISO
// GET /api/calendar/events?start=ISO&end=ISO&calendarId=primary&includePastDays=60
router.get('/events', async (req, res) => {
  try {
    const oauth2 = getOAuth2ForSession(req.session);
    if (!oauth2) return res.status(401).json({ error: 'signin_required' });

    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const calendarId = req.query.calendarId || 'primary';
    const includePastDays = Math.max(0, Number(req.query.includePastDays || 60));

    // window
    const startQ = req.query.start ? new Date(req.query.start) : new Date();
    const endQ = req.query.end ? new Date(req.query.end) : new Date(Date.now() + 7 * 86400000);

    if (includePastDays > 0) startQ.setDate(startQ.getDate() - includePastDays);

    // Google timeMax is EXCLUSIVE → add 1 day so boundary events show up
    const timeMin = startQ.toISOString();
    const timeMax = new Date(endQ.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data } = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      showDeleted: false,
      maxResults: 2500
    });

    const events = (data.items || []).map(ev => {
      // start
      const startISO =
        ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T10:00:00.000Z` : null);

      // end: for all-day, Google gives the NEXT day; subtract 1ms so it renders on the same day
      let endISO;
      if (ev.end?.dateTime) {
        endISO = ev.end.dateTime;
      } else if (ev.end?.date) {
        endISO = new Date(new Date(`${ev.end.date}T12:00:00.000Z`).getTime() - 1).toISOString();
      } else {
        endISO = startISO;
      }

      const meetUrl =
        ev.hangoutLink ||
        ev.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri ||
        null;

      return {
        id: ev.id,
        description: ev.description || '',
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

    return res.json({ events });
  } catch (e) {
    if (isGoogleAuthError(e)) {
      return res.status(401).json({ error: 'token_invalid_or_revoked: re-auth required' });
    }
    console.error('[events]', e);
    return res.status(500).json({ error: e.message });
  }
});

// PATCH /api/calendar/events/:id  (update title/time)
router.patch('/events/:id', async (req, res) => {
  try {
    const oauth2 = getOAuth2ForSession(req.session);
    if (!oauth2) return res.status(401).json({ error: 'signin_required' });

    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const calendarId = "jim@bettermindcare.com";
    const eventId = req.params.id;

    const { summary, start_time, end_time, time_zone = 'UTC' } = req.body || {};

    // optional conflict check (ignore the same event)
    if (start_time && end_time) {
      const timeMin = new Date(start_time).toISOString();
      const timeMax = new Date(end_time).toISOString();
      const { data } = await calendar.events.list({
        calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        showDeleted: false,
        maxResults: 50
      });
      const collision = (data.items || []).some(ev => {
        if (ev.id === eventId) return false;
        const s = new Date(ev.start.dateTime || `${ev.start.date}T10:00:00Z`);
        const e = new Date(ev.end.dateTime || `${ev.end.date}T12:59:59Z`);
        return overlaps(new Date(start_time), new Date(end_time), s, e);
      });
      if (collision) return res.status(409).json({ error: 'slot_unavailable' });
    }

    const requestBody = {};
    if (summary) requestBody.summary = summary;
    if (start_time || end_time) {
      if (!start_time || !end_time)
        return res.status(400).json({ error: 'start_time and end_time required together' });
      requestBody.start = { dateTime: new Date(start_time).toISOString(), timeZone: time_zone };
      requestBody.end = { dateTime: new Date(end_time).toISOString(), timeZone: time_zone };
    }

    const { data: ev } = await calendar.events.patch({
      calendarId,
      eventId,
      sendUpdates: 'all',
      requestBody
    });

    return res.json({
      id: ev.id,
      title: ev.summary || '(no title)',
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
    console.error('[events.patch]', e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/calendar/events/:id
router.delete('/events/:id', async (req, res) => {
  try {
    const oauth2 = getOAuth2ForSession(req.session);
    if (!oauth2) return res.status(401).json({ error: 'signin_required' });

    const calendar = google.calendar({ version: 'v3', auth: oauth2 });
    const calendarId = req.query.calendarId || 'jim@bettermindcare.com';
    const eventId = req.params.id;

    await calendar.events.delete({ calendarId, eventId, sendUpdates: 'all' });
    return res.json({ ok: true });
  } catch (e) {
    if (isGoogleAuthError(e)) return res.status(401).json({ error: 'google_reauth' });
    if (e?.response?.status === 403) {
      // Not organizer / no permission to modify this event
      return res.status(403).json({ error: 'forbidden_delete' });
    }
    console.error('[events.delete]', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/calendar-access', async (req, res) => {
  const { userId, productKey, start_time, end_time, summary, patient_email, patient_name } = req.query;

  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // 1️⃣ Verify payment in DB
  const payment = await knex('stripe_payments')
    .where({ user_id: userId, product_key: productKey, status: 'paid' })
    .first();

  if (!payment) return res.status(402).json({ error: 'Payment required to access calendar' });

  // 2️⃣ Create Google Meet dynamically
  try {
    // Example: you can pass start_time/end_time and summary from frontend or calculate default
    const eventData = await scheduleMeeting(req.session, {
      summary: summary || 'BetterMindCare Telehealth Visit',
      start_time: start_time || new Date(),
      end_time: end_time || new Date(Date.now() + 30 * 60 * 1000), // default 30 min
      time_zone: 'America/Chicago',
      calendarId: 'jim@bettermindcare.com',
      patient_email,
      patient_name
    });

    return res.json({
      success: true,
      join_url: eventData.join_url,   // Google Meet link
      html_link: eventData.html_link, // Google Calendar event link
      start: eventData.start,
      end: eventData.end
    });
  } catch (e) {
    console.error('[calendar-access]', e);
    return res.status(500).json({ error: e.message });
  }
});

module.exports = router;
