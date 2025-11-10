// calendarApi.ts


export async function fetchEvents(startISO, endISO) {


fetch('/api/google-calendar/check-session', {
  method: 'GET',
  credentials: 'include'  // Ensures cookies (session data) are sent along with the request
})
  .then(response => response.json()) // Parse the response as JSON
  .then(data => {
    console.log('Session Data:', data);  // Logs the session data received from the backend
  })
  .catch(error => console.error('Error fetching session:', error));

  const res = await fetch('/api/google-calendar/check-session')
  .then(response => {
    if (response.status === 401) {
      // Redirect to Google login or show re-authentication prompt
    }
  })
  .catch(error => {
    console.error('Error checking session:', error);
  });
}

export async function createMeeting(payload) {
  const res = await fetch('/api/google-calendar/create-meeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  // If not authorized for Google, trigger OAuth
  if (res.status === 401) {
    const data = await res.json();
    if (data.error?.includes('signin_required')) {
      window.location.href = '/api/oauth/google?returnTo=/google-calendar';
      return;
    }
  }

  if (!res.ok) {
    throw new Error(`Failed to create meeting: ${res.status}`);
  }

  return await res.json();
}

const BASE = '/api/google-calendar';

export async function updateEvent(calendarId, id, payload) {
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
    `/api/google-calendar/calendar-access?${params.toString()}`,
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
