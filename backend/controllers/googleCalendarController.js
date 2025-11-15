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

// ---------- Exports ----------
exports.scheduleMeeting = scheduleMeeting;
exports.listGoogleEvents = listGoogleEvents;
exports.createGoogleMeet = createGoogleMeet;
