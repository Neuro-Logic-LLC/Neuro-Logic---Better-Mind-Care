// calendarApi.ts
export async function fetchEvents(startISO, endISO) {
  if (process.env.REACT_APP_MOCK_CALENDAR === 'true') {
    console.log('[Mock] Simulating fetchEvents');
    // Mock events
    return [
      {
        id: 'mock-event-1',
        summary: 'Mock Telehealth Visit',
        start: { dateTime: new Date(Date.now() + 3600000).toISOString() },
        end: { dateTime: new Date(Date.now() + 7200000).toISOString() },
        htmlLink: 'https://calendar.google.com/mock-event'
      }
    ];
  }

  const res = await fetch(
    `/api/googleCalendar/events?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`,
    {
      credentials: 'include'
    }
  );
  if (res.status === 401) throw new Error('google_reauth');
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).events;
}
  );
  if (res.status === 401) throw new Error('google_reauth');
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).events;
}

export async function createMeeting({
  summary,
  description,
  start_time,
  end_time,
  time_zone,
  calendarId,
  patient_email,
  patient_name
}) {
  if (process.env.REACT_APP_MOCK_CALENDAR === 'true') {
    console.log('[Mock] Simulating createMeeting');
    // Mock response
    return {
      join_url: 'https://meet.google.com/mock-link',
      html_link: 'https://calendar.google.com/mock-event',
      id: 'mock-event-id'
    };
  }

  const payload = {
    summary,
    description,
    start_time,
    end_time,
    time_zone,
    calendarId,
    patient_email,
    patient_name
  };

  const res = await fetch('/api/googleCalendar/create-meeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (res.status === 401) throw new Error(data.error || 'google_reauth');
  if (!res.ok) throw new Error(data.error || 'create_failed');
  return data;
}

const BASE = '/api/googleCalendar';

export async function updateEvent(calendarId, id, payload) {
  if (process.env.REACT_APP_MOCK_CALENDAR === 'true') {
    console.log('[Mock] Simulating updateEvent');
    // Mock success
    return { id, ...payload };
  }

  const res = await fetch(
    `${BASE}/events/${encodeURIComponent(id)}?calendarId=${encodeURIComponent(calendarId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    }
  );
  const j = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error(j.error || 'google_reauth');
  if (res.status === 409) throw new Error('slot_unavailable');
  if (!res.ok) throw new Error(j.error || 'update_failed');
  return j;
}

export async function deleteEvent(calendarId, id) {
  if (process.env.REACT_APP_MOCK_CALENDAR === 'true') {
    console.log('[Mock] Simulating deleteEvent');
    // Mock success
    return {};
  }

  const res = await fetch(
    `${BASE}/events/${encodeURIComponent(id)}?calendarId=${encodeURIComponent(calendarId)}`,
    {
      method: 'DELETE',
      credentials: 'include'
    }
  );
  const j = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error(j.error || 'google_reauth');
  if (!res.ok) throw new Error(j.error || 'delete_failed');
  return j;
}

export async function fetchPaidCalendarAccess(
  userId,
  productKey,
  start_time,
  end_time,
  patient_email,
  patient_name
) {
  const params = new URLSearchParams({ userId, productKey });
  if (start_time) params.append('start_time', start_time);
  if (end_time) params.append('end_time', end_time);
  if (patient_email) params.append('patient_email', patient_email);
  if (patient_name) params.append('patient_name', patient_name);

  const res = await fetch(
    `/api/googleCalendar/calendar-access?${params.toString()}`,
    {
      credentials: 'include'
    }
  );

  const data = await res.json();
  if (res.status === 401) throw new Error('google_reauth');
  if (res.status === 402) throw new Error('Payment required');
  if (!res.ok) throw new Error(data.error || 'calendar_access_failed');

  return data; // contains join_url, html_link, start, end
}
