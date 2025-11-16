const { google } = require('googleapis');
const crypto = require('crypto');
const { getGoogleCalendar: getHybridCalendar } = require('../lib/googleCalendarClient');




function overlaps(aStart, aEnd, bStart, bEnd) {
  return Math.max(+aStart, +bStart) < Math.min(+aEnd, +bEnd);
}

// ---------- List Events ----------
async function listGoogleEvents(req, { calendarId, timeMin, timeMax, includePastDays = 0 } = {}) {
  const calendar = await getHybridCalendar(req);
  const userEmail = req.session?.user?.email;
  console.log(userEmail);
  console.log("SYSTEM OAUTH LOADED?", systemOAuth ? "YES" : "NO");
console.log("SYSTEM OAUTH CREDS:", systemOAuth?.credentials);
  const targetCalendar =
    calendarId && calendarId !== 'primary'
      ? calendarId
      : userEmail?.endsWith('@bettermindcare.com')
      ? userEmail
      : 'primary';

  const startQ = timeMin ? new Date(timeMin) : new Date();
  const endQ = timeMax ? new Date(timeMax) : new Date(Date.now() + 7 * 86400000);
  if (includePastDays > 0) startQ.setDate(startQ.getDate() - includePastDays);

  const apiTimeMin = startQ.toISOString();
  const apiTimeMax = new Date(endQ.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const { data } = await calendar.events.list({
    calendarId: targetCalendar,
    timeMin: apiTimeMin,
    timeMax: apiTimeMax,
    singleEvents: true,
    orderBy: 'startTime',
    showDeleted: false,
    maxResults: 2500
  });

  return (data.items || []).map(ev => {
    const startISO = ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T00:00:00` : null);
    const endISO = ev.end?.dateTime
      ? ev.end.dateTime
      : ev.end?.date
      ? new Date(new Date(`${ev.end.date}T00:00:00`).getTime() - 1).toISOString()
      : startISO;

    const meetUrl =
      ev.hangoutLink ||
      ev.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri ||
      null;

    return {
      id: ev.id,
      title: ev.summary && ev.summary.trim() ? ev.summary : null,
      start: startISO,
      end: endISO,
      htmlLink: ev.htmlLink,
      location: ev.location,
      attendees: ev.attendees || [],
      meetUrl,
      isAllDay: Boolean(ev.start?.date && !ev.start?.dateTime)
    };
  });
}

// ---------- Create Meeting ----------
async function createGoogleMeet(req, summary, startTime, endTime, timeZone = 'UTC') {
  const calendar = await getHybridCalendar(req);
  const userEmail = req.session?.user?.email || 'jim@bettermindcare.com';

  const startISO = new Date(startTime).toISOString();
  const endISO = endTime
    ? new Date(endTime).toISOString()
    : new Date(new Date(startTime).getTime() + 30 * 60000).toISOString();

  const { data: ev } = await calendar.events.insert({
    calendarId: userEmail,
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

// ---------- Scheduler ----------
async function scheduleMeeting(platform, req, summary, startTime, endTime, timeZone = 'UTC') {
  if (platform === 'google') {
    const event = await createGoogleMeet(req, summary, startTime, endTime, timeZone);
    return { ...event, platform: 'google' };
  }
  if (platform === 'zoom') throw new Error('Zoom not implemented');
  throw new Error('Zoom: Unsupported platform');
}

router.post('/request-slot', verifyToken, async (req, res) => {
  const { oauth, error } = await requireGoogleAuth(req, res);
  if (error) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth });

    const { requested_start, requested_end, patient_email, patient_name, notes } = req.body;

    if (!requested_start || !requested_end) {
      return res.status(400).json({ error: 'start and end required' });
    }

    const startISO = iso(requested_start);
    const endISO = iso(requested_end);

    // Step 1: Check for overlap
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: startISO,
        timeMax: endISO,
        items: [{ id: CALENDAR_ID }]
      }
    });

    const busy = fb.data.calendars[CALENDAR_ID]?.busy || [];

    const conflict = busy.some(b =>
      overlaps(new Date(startISO), new Date(endISO), new Date(b.start), new Date(b.end))
    );

    if (conflict) {
      return res.status(409).json({ error: 'slot_already_booked' });
    }

    // Step 2: Create a "Pending" event on the calendar
    const { data: ev } = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      conferenceDataVersion: 1,
      sendUpdates: 'none',
      requestBody: {
        summary: `Pending Appointment Request`,
        description: notes || '',
        start: { dateTime: startISO },
        end: { dateTime: endISO },
        attendees: patient_email ? [{ email: patient_email, displayName: patient_name }] : [],
        status: 'tentative', // <--- this is the key
        reminders: { useDefault: true }
      }
    });

    // Step 3: Return details to patient
    res.json({
      success: true,
      tentative_event_id: ev.id,
      status: ev.status,
      start: ev.start,
      end: ev.end,
      message: 'Appointment request submitted and awaiting provider approval.'
    });
  } catch (e) {
    if (isGoogleAuthError(e)) {
      return res.status(401).json({ error: 'google_reauth' });
    }
    console.error('request-slot error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

router.post('/confirm-event/:id', verifyToken, async (req, res) => {
  const { oauth, error } = await requireGoogleAuth(req, res);
  if (error) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth });
    const eventId = req.params.id;

    const { data: ev } = await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId,
      sendUpdates: 'all',
      requestBody: {
        status: 'confirmed',
        summary: 'Confirmed Appointment'
      }
    });

    res.json({ success: true, event: ev });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'could_not_confirm' });
  }
});

// Decline / Cancel an Appointment
router.post('/decline-event/:id', verifyToken, async (req, res) => {
  const { oauth, error } = await requireGoogleAuth(req, res);
  if (error) return;

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth });
    const eventId = req.params.id;

    // Optional reason (can help doctor remember why)
    const { reason } = req.body || {};

    // Fetch event first so we don't try to cancel something that's already gone
    const existing = await calendar.events.get({
      calendarId: CALENDAR_ID,
      eventId
    }).catch(() => null);

    if (!existing || !existing.data) {
      return res.status(404).json({ error: 'event_not_found' });
    }

    // Set status to cancelled (Google-standard cancellation)
    const { data: ev } = await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId,
      sendUpdates: 'all',
      requestBody: {
        status: 'cancelled',
        summary: 'Cancelled Appointment',
        description: reason ? `Cancelled: ${reason}` : 'Cancelled.'
      }
    });

    res.json({
      success: true,
      message: 'Appointment declined and event marked as cancelled.',
      event: {
        id: ev.id,
        status: ev.status,
        summary: ev.summary,
        start: ev.start,
        end: ev.end,
        htmlLink: ev.htmlLink
      }
    });

  } catch (e) {
    if (isGoogleAuthError(e)) {
      return res.status(401).json({ error: 'google_reauth' });
    }
    console.error('decline-event error:', e);
    res.status(500).json({ error: String(e?.message || e) });
  }
});

// ---------- Exports ----------
exports.scheduleMeeting = scheduleMeeting;
exports.listGoogleEvents = listGoogleEvents;
exports.createGoogleMeet = createGoogleMeet;
