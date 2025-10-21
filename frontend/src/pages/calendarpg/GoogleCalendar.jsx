// GoogleCalendar.jsx
import { useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import {
  format,
  parse,
  startOfWeek,
  endOfWeek as eow,
  getDay,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addMinutes // you used this, so import it
} from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import {
  fetchEvents,
  createMeeting,
  updateEvent,
  deleteEvent
} from '../../calendarApi/calendarApi';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// date-fns localizer
const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

// Helpers
function computeRange(view, date) {
  const d = date || new Date();
  switch (view) {
    case Views.WEEK:
      return { start: startOfWeek(d), end: eow(d) };
    case Views.DAY:
      return { start: startOfDay(d), end: endOfDay(d) };
    case Views.AGENDA:
    case Views.MONTH:
    default:
      return { start: startOfMonth(d), end: endOfMonth(d) };
  }
}
function pastDaysFor(view) {
  switch (view) {
    case Views.DAY:
      return 7;
    case Views.WEEK:
      return 30;
    case Views.AGENDA:
      return 180;
    case Views.MONTH:
    default:
      return 90;
  }
}
function toLocalInputValue(dateLike) {
  if (!dateLike) return '';
  const d = new Date(dateLike);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

// Shared button styles (consistent size)
const rowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 8,
  marginTop: 8
};
const btn = {
  width: '100%',
  height: 40,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  cursor: 'pointer',
  fontWeight: 600
};
const btnPrimary = {
  ...btn,
  background: '#0ea5e9',
  color: '#fff',
  borderColor: '#0ea5e9'
};
const btnDanger = {
  ...btn,
  color: '#b00020',
  background: '#fff',
  borderColor: '#f0b2bb'
};

export default function GoogleCalendar() {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [calendarId, setCalendarId] = useState('primary');

  // view range + tz
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const range = useMemo(() => computeRange(view, date), [view, date]);

  // existing event modal state

  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [createPatientName, setCreatePatientName] = useState('');
  const [createPatientEmail, setCreatePatientEmail] = useState('');

  // NEW: create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState(
    'Patient Meeting with Patient A'
  );
  const [createDesc, setCreateDesc] = useState(
    'BetterMindCare Telehealth Visit'
  );
  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toISOString().slice(11, 16); // "10:00"
  };

  const today = new Date();
  const dayStart = new Date(today.setHours(10, 59, 59, 0)); // 20:59 today
  const dayEnd = new Date(today.setHours(20, 59, 59, 0)); // 10:59 today
  const [createStart, setCreateStart] = useState(formatTime(dayStart));
  const [createEnd, setCreateEnd] = useState(formatTime(dayEnd));

  async function load(r) {
    const includePastDays = pastDaysFor(view);
    const evs = await fetchEvents(
      r.start.toISOString(),
      r.end.toISOString(),
      calendarId,
      includePastDays
    );
    setEvents(
      (evs || []).map((e) => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end)
      }))
    );
  }

  useEffect(() => {
    load(range).catch(console.error); /* eslint-disable-next-line */
  }, [range.start?.toISOString(), range.end?.toISOString(), calendarId, view]);

  useEffect(() => {
    if (!range) return;
    const id = setInterval(() => load(range).catch(console.error), 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start?.toISOString(), range.end?.toISOString(), calendarId, view]);

  // open Create modal for week/day. For month, switch to day.
  function handleSelectSlot({ start, end, action }) {
    // Always open Create on first click, no auto view switch
    // If Month view gives you a full-day block, pick a sensible default window
    const day = start ? new Date(start) : new Date();

    const s = new Date(day);
    s.setHours(10, 0, 0, 0); // 10:00 AM

    const e = new Date(day);
    e.setHours(15, 0, 0, 0); // 3:00 PM

    setCreateTitle('Patient Meeting with Patient A');
    setCreateDesc('BetterMindCare Telehealth Visit');
    setCreateStart(toLocalInputValue(s));
    setCreateEnd(toLocalInputValue(e));
    setShowCreate(true);
  }

  async function submitCreate() {
    try {
      if (!createTitle.trim()) {
        alert('Title is required');
        return;
      }
      if (!createStart || !createEnd) {
        alert('Start and end are required');
        return;
      }
      const s = new Date(createStart);
      const e = new Date(createEnd);
      if (s >= e) {
        alert('End must be after start');
        return;
      }

      await createMeeting({
        summary: createTitle.trim(),
        description: createDesc || '',
        start_time: s.toISOString(),
        end_time: e.toISOString(),
        time_zone: tz,
        calendarId,
        patient_email: createPatientEmail || undefined,
        patient_name: createPatientName || undefined
      });

      setShowCreate(false);
      await load(range);
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('google_reauth'))
        window.location.href = '/api/oauth/google';
      else if (msg.includes('slot_unavailable'))
        alert('That time was just taken. Pick another.');
      else {
        console.error(e);
        alert('Could not create meeting.');
      }
    }
  }

  return (
    <div
      style={{
        height: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>
          Calendar:&nbsp;
          <select
            style={{cursor:'pointer'}}
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
          >
            <option value="primary">Primary</option>
          </select>
        </label>
        <button style={{cursor:'pointer'}} onClick={() => load(range)}>Refresh</button>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        defaultView={Views.MONTH}
        date={date}
        onNavigate={setDate}
        onView={setView}
        popup={false}
        selectable
        longPressThreshold={80}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={(ev) => {
          setSelected(ev);
          setIsEditing(false);
          setEditTitle(ev.title || '');
          setEditStart(toLocalInputValue(ev.start));
          setEditEnd(toLocalInputValue(ev.end));
        }}
        style={{ flex: 1 }}
      />

      {/* Create Modal */}
      {showCreate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: 12,
              minWidth: 520,
              maxWidth: 640,
              boxShadow: '0 10px 30px rgba(0,0,0,.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, fontSize: 28, marginBottom: 12 }}>
              Create meeting
            </h3>

            <div style={{ display: 'grid', gap: 8 }}>
              <label>
                Title
                <input
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1'
                  }}
                  // placeholder=""
                />
              </label>
              <label>
                Description
                <textarea
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1'
                  }}
                  // placeholder="BetterMindCare Telehealth Visit"
                />
              </label>
              <label>
                Start
                <input
                  type="datetime-local"
                  value={createStart}
                  onChange={(e) => setCreateStart(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1'
                  }}
                />
              </label>
              <label>
                End
                <input
                  type="datetime-local"
                  value={createEnd}
                  onChange={(e) => setCreateEnd(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1'
                  }}
                />
              </label>
              <label>
                Patient Name
                <input
                  value={createPatientName}
                  onChange={(e) => setCreatePatientName(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1'
                  }}
                  placeholder="John Doe"
                />
              </label>
              <label>
                Patient Email
                <input
                  type="email"
                  value={createPatientEmail}
                  onChange={(e) => setCreatePatientEmail(e.target.value)}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1'
                  }}
                  placeholder="patient@example.com"
                />
              </label>
            </div>

            <div style={{ ...rowStyle, marginTop: 12 }}>
              <button style={btnPrimary} onClick={submitCreate}>
                Create
              </button>
              <button style={btn} onClick={() => setShowCreate(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing Event Modal */}
      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: 12,
              minWidth: 520,
              maxWidth: 640,
              boxShadow: '0 10px 30px rgba(0,0,0,.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, fontSize: 28, marginBottom: 12 }}>
              {isEditing ? 'Update event' : selected.title || '(no title)'}
            </h3>

            {!isEditing ? (
              <>
                <div
                  style={{
                    marginBottom: 12,
                    lineHeight: 1.6,
                    fontSize: 16,
                    color: '#334155'
                  }}
                >
                  <div>
                    <strong>Starts:</strong>{' '}
                    {new Date(selected.start).toLocaleString()}
                  </div>
                  <div>
                    <strong>Ends:</strong>{' '}
                    {new Date(selected.end).toLocaleString()}
                  </div>
                  {selected.location && (
                    <div>
                      <strong>Location:</strong> {selected.location}
                    </div>
                  )}
                  {selected.description && (
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
                      {selected.description}
                    </div>
                  )}
                </div>

                <div style={rowStyle}>
                  {selected.meetUrl && (
                    <>
                      <button
                        style={btnPrimary}
                        onClick={() => window.open(selected.meetUrl, '_blank')}
                      >
                        Join Google Meet
                      </button>
                      <button
                        style={btn}
                        onClick={() =>
                          navigator.clipboard.writeText(selected.meetUrl)
                        }
                      >
                        Copy Meet Link
                      </button>
                    </>
                  )}
                  {selected.htmlLink && (
                    <button
                      style={btn}
                      onClick={() => window.open(selected.htmlLink, '_blank')}
                    >
                      Open in Google Calendar
                    </button>
                  )}

                  <button style={btn} onClick={() => setIsEditing(true)}>
                    Update
                  </button>

                  <button
                    style={btnDanger}
                    onClick={async () => {
                      if (!window.confirm('Delete this meeting?')) return;
                      try {
                        await deleteEvent(calendarId, selected.id);
                        setSelected(null);
                        await load(range);
                      } catch (e) {
                        const msg = String(e?.message || '');
                        if (msg.includes('google_reauth'))
                          window.location.href = '/api/oauth/google';
                        else if (msg.includes('forbidden_delete'))
                          alert(
                            "You don't have permission to delete this event."
                          );
                        else {
                          console.error(e);
                          alert('Could not delete event.');
                        }
                      }
                    }}
                  >
                    Delete
                  </button>

                  <button style={btn} onClick={() => setSelected(null)}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gap: 8 }}>
                  <label>
                    Title
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  </label>
                  <label>
                    Start
                    <input
                      type="datetime-local"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  </label>
                  <label>
                    End
                    <input
                      type="datetime-local"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      style={{
                        width: '100%',
                        height: 40,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1'
                      }}
                    />
                  </label>
                </div>

                <div style={{ ...rowStyle, marginTop: 12 }}>
                  <button
                    style={btnPrimary}
                    onClick={async () => {
                      try {
                        if (!editStart || !editEnd) {
                          alert('Please set start and end times.');
                          return;
                        }
                        const s = new Date(editStart),
                          e = new Date(editEnd);
                        if (s >= e) {
                          alert('End time must be after start time.');
                          return;
                        }
                        await updateEvent(calendarId, selected.id, {
                          summary: editTitle,
                          start_time: new Date(editStart).toISOString(),
                          end_time: new Date(editEnd).toISOString(),
                          time_zone: tz
                        });
                        setIsEditing(false);
                        setSelected(null);
                        await load(range);
                      } catch (err) {
                        const msg = String(err?.message || '');
                        if (msg.includes('google_reauth'))
                          window.location.href = '/api/oauth/google';
                        else if (msg.includes('slot_unavailable'))
                          alert('That time conflicts with another event.');
                        else {
                          console.error(err);
                          alert('Update failed.');
                        }
                      }
                    }}
                  >
                    Save Update
                  </button>
                  <button style={btn} onClick={() => setIsEditing(false)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
