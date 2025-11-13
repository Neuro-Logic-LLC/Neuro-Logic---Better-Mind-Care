// calendarApi.ts

export async function fetchEvents(startISO, endISO, calendarId, includePastDays) {
  const url = `/api/google-calendar/events?calendarId=${encodeURIComponent(calendarId)}&start=${encodeURIComponent(
    startISO
  )}&end=${encodeURIComponent(endISO)}&includePastDays=${encodeURIComponent(includePastDays)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      credentials: "include"
    });

    // Handle auth failure consistently
    if (res.status === 401) {
      const data = await res.json().catch(() => ({}));

      if (data.error?.includes("signin_required")) {
        window.location.href = "/api/oauth/google?returnTo=/google-calendar";
        return []; // Always return array
      }

      return []; // Fallback
    }

    // Normal success
    const data = await res.json().catch(() => ({}));

    return Array.isArray(data.events) ? data.events : [];
  } catch (err) {
    console.error("fetchEvents failed:", err);
    return []; // Always safe fallback
  }
}


export async function createMeeting(payload) {
  const res = await fetch('/api/google-calendar/create-meeting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: payload || {}// <-- always send at least an obj
  });

  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    if (data.error?.includes('signin_required')) {
      window.location.href = '/api/oauth/google?returnTo=/google-calendar';
      return;
    }
  }

  return res.json();
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

// export async function fetchPaidCalendarAccess(
//   userId,
//   productKey,
//   start_time,
//   end_time,
//   patient_email,
//   patient_name
// ) {
//   const params = new URLSearchParams({ userId, productKey });
//   if (start_time) params.append('start_time', start_time);
//   if (end_time) params.append('end_time', end_time);
//   if (patient_email) params.append('patient_email', patient_email);
//   if (patient_name) params.append('patient_name', patient_name);

//   const res = await fetch(
//     `/api/google-calendar/calendar-access?${params.toString()}`,
//     {
//       credentials: 'include'
//     }
//   );

//   const data = await res.json();
//   if (res.status === 401) throw new Error('google_reauth');
//   if (res.status === 402) throw new Error('Payment required');
//   if (!res.ok) throw new Error(data.error || 'calendar_access_failed');

//   return data; // contains join_url, html_link, start, end
// }
