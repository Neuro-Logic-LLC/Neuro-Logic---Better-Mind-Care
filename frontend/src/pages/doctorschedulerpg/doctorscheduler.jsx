import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addMinutes,
  isBefore,
  addHours
} from 'date-fns';
import enUS from 'date-fns/locale/en-US';

// ---- rbc localizer
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales
});

// ---- tiny utils
const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';
const API = isLocal ? 'https://localhost:5050' : '';
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const toISO = (s) => (s ? new Date(s).toISOString() : undefined);
const yyyy_mm_dd = (d) => format(d, 'yyyy-MM-dd');

// QoL knobs
const SLOT_MINUTES = 30; // bookable slot length
const MIN_NOTICE_HOURS = 2; // no booking within next X hours
const PADDING_MINUTES = 10; // gap after each appointment

// Demo mode for Google verification video
const MOCK_CALENDAR = true;

export default function DoctorScheduler() {
  // state
  const [date, setDate] = useState(new Date());
  const [slots, setSlots] = useState([]); // [{start, end}] ISO strings
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [modal, setModal] = useState(null); // {start: Date, end: Date}

  // booking form
  const [summary, setSummary] = useState('Telehealth visit');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientName, setPatientName] = useState('');

  // load availability when date changes
  useEffect(() => {
    let stop = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const d = yyyy_mm_dd(date);
        const res = await fetch(
          `${API}/api/googleCalendar/availability?date=${d}&tz=${encodeURIComponent(tz)}&slot=${SLOT_MINUTES}`,
          { credentials: 'include' }
        );
        if (res.status === 401) {
          // not signed in → go sign in, then come back to this page
          const returnTo =
            window.location.pathname + window.location.search ||
            '/google-calendar';
          window.location.href = `${API}/api/oauth/google?return_to=${encodeURIComponent(returnTo)}`;
          return;
        }
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || 'Failed to load availability');

        // client-side QoL filters: min notice + padding after each slot
        const threshold = addHours(new Date(), MIN_NOTICE_HOURS);
        const sanitized = (data.slots || [])
          .map((s) => ({ start: new Date(s.start), end: new Date(s.end) }))
          .filter(({ start }) => isBefore(threshold, start)); // enforce min notice

        // apply padding: nuke any slot that would start within padding of the next slot's start
        const padded = [];
        sanitized.sort((a, b) => +a.start - +b.start);
        for (let i = 0; i < sanitized.length; i++) {
          const cur = sanitized[i];
          const next = sanitized[i + 1];
          if (next && +addMinutes(cur.end, PADDING_MINUTES) > +next.start)
            continue; // drop too-tight slot
          padded.push(cur);
        }

        if (!stop) setSlots(padded);
      } catch (e) {
        if (!stop) setErr(String(e.message || e));
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [date]);

  // rbc events: show available slots as events
  const events = useMemo(() => {
    return slots.map((s) => ({
      title: 'Available',
      start: s.start,
      end: s.end,
      resource: { type: 'available' }
    }));
  }, [slots]);

  // styles: green for available, gray for past
  const eventPropGetter = (event) => {
    const isPast = event.end < new Date();
    return {
      style: {
        background: isPast ? '#cbd5e1' : '#16a34a',
        border: '1px solid #065f46',
        color: '#fff',
        opacity: isPast ? 0.6 : 1,
        cursor: isPast ? 'not-allowed' : 'pointer',
        borderRadius: 8
      }
    };
  };

  // click to select a slot
  const onSelectEvent = (evt) => {
    if (evt.end < new Date()) return;
    setModal({ start: evt.start, end: evt.end });
    setSummary('Telehealth visit');
  };

  // create meeting
  const book = async () => {
    try {
      if (!patientEmail) throw new Error('Patient email is required');

      if (MOCK_CALENDAR) {
        // Mock success for demo
        alert(
          `✅ Appointment added to Google Calendar (demo mode)\n\nMock Meet link: https://meet.google.com/mock-link\n\nA mock email invite was simulated to ${patientEmail}.\n\nDemo Mode: Simulated Calendar Event.`
        );
        setModal(null);
        // refresh availability so we don’t show the just-booked slot
        setDate(new Date(date));
        return;
      }

      const res = await fetch(`${API}/api/googleCalendar/create-meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: 'google',
          summary,
          patient_email: patientEmail,
          patient_name: patientName || undefined,
          start_time: toISO(modal.start),
          end_time: toISO(modal.end),
          time_zone: tz
        })
      });

      if (res.status === 401) {
        const data = await res.json().catch(() => ({}));
        if (String(data?.error || '').startsWith('signin_required')) {
          const returnTo =
            window.location.pathname + window.location.search ||
            '/google-calendar';
          window.location.href = `${API}/api/oauth/google?return_to=${encodeURIComponent(returnTo)}`;
          return;
        }
        throw new Error(data.error || 'Unauthorized');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create meeting');

      // success UX
      alert(
        `Booked. Meet link:\n${data.join_url}\n\nAn email invite was sent to ${patientEmail}.`
      );
      setModal(null);
      // refresh availability so we don’t show the just-booked slot
      setDate(new Date(date));
    } catch (e) {
      alert(`Error: ${String(e.message || e)}`);
    }
  };

  return (
    <div className="p-4" style={{ maxWidth: 1000, margin: '24px auto' }}>
      {MOCK_CALENDAR && (
        <div style={{ background: '#fef3c7', color: '#92400e', padding: 8, borderRadius: 8, marginBottom: 12 }}>
          ⚠️ Demo Mode: Simulated Calendar Event Creation
        </div>
      )}
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Calendar Meeting</h1>
      <div style={{ marginBottom: 8, color: '#475569' }}>
        Your timezone: <strong>{tz}</strong> · Slot:{' '}
        <strong>{SLOT_MINUTES}m</strong> · Minimum notice:{' '}
        <strong>{MIN_NOTICE_HOURS}h</strong> · Padding:{' '}
        <strong>{PADDING_MINUTES}m</strong>
      </div>

      {err && (
        <div style={{ color: '#b91c1c', marginBottom: 8 }}>Error: {err}</div>
      )}
      {loading && <div style={{ marginBottom: 8 }}>Loading availability…</div>}

      <Calendar
        localizer={localizer}
        date={date}
        onNavigate={(d) => setDate(d)}
        events={events}
        startAccessor="start"
        endAccessor="end"
        defaultView="week"
        views={['day', 'week', 'agenda']}
        step={15}
        timeslots={2} // 2 x 15 = 30 min slots
        selectable={false}
        onSelectEvent={onSelectEvent}
        eventPropGetter={eventPropGetter}
        style={{
          height: '70vh',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb'
        }}
        toolbar
        popup
      />

      {/* lightweight modal */}
      {modal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
          onClick={() => setModal(null)}
        >
          <div
            style={{
              background: '#fff',
              padding: 20,
              width: 480,
              borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Book Telehealth Slot</h3>
            <div style={{ fontSize: 14, color: '#475569', marginBottom: 10 }}>
              {format(modal.start, 'EEE MMM d, yyyy • p')} –{' '}
              {format(modal.end, 'p')} ({tz})
            </div>

            <label style={{ display: 'block', marginBottom: 8 }}>
              Summary
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                style={{ width: '100%' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 8 }}>
              Patient email *
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                style={{ width: '100%' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 8 }}>
              Patient name
              <input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                style={{ width: '100%' }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                onClick={() => setModal(null)}
                style={{ padding: '8px 12px' }}
              >
                Cancel
              </button>
              <button
                onClick={book}
                disabled={!patientEmail}
                style={{
                  padding: '8px 12px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8
                }}
              >
                Book & Send Invite
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              We’ll email the Meet link to the patient and add it to your Google
              Calendar.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
