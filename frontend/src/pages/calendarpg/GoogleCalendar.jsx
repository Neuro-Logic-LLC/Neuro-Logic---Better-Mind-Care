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
  addDays,
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

const USE_MOCK_CALENDAR = process.env.REACT_APP_CALENDAR_MOCK === '1';

const toolbarButtonStyle = {
  minWidth: 44,
  padding: '0.4rem 0.95rem'
};
const toolbarViewButtonStyle = {
  minWidth: 88,
  padding: '0.45rem 1.1rem'
};

// Custom Toolbar Component
function CustomToolbar({ date, view, views, onNavigate, onView, label }) {
  const navigate = (action) => {
    onNavigate(action);
  };

  const viewNames = {
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda'
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
      }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn btn-outline-teal"
          style={toolbarButtonStyle}
          onClick={() => navigate('PREV')}
          aria-label="Previous"
        >
          ‹
        </button>
        <button
          type="button"
          className="btn btn-outline-teal"
          style={toolbarButtonStyle}
          onClick={() => navigate('TODAY')}
        >
          Today
        </button>
        <button
          type="button"
          className="btn btn-outline-teal"
          style={toolbarButtonStyle}
          onClick={() => navigate('NEXT')}
          aria-label="Next"
        >
          ›
        </button>
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#334155' }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {views.map((v) => (
          <button
            key={v}
            type="button"
            className={`btn ${
              view === v ? 'btn-secondary' : 'btn-outline-teal'
            }`}
            style={toolbarViewButtonStyle}
            onClick={() => onView(v)}
          >
            {viewNames[v] || v}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildMockEvents(anchorDate) {
  const base = startOfDay(anchorDate || new Date());

  const templates = [
    {
      offsetDays: 1,
      startMinutes: 10 * 60,
      durationMinutes: 60,
      title: 'Care Plan Review',
      description:
        'Review upcoming care milestones and answer caregiver questions.',
      location: 'Virtual Session'
    },
    {
      offsetDays: 2,
      startMinutes: 13 * 60 + 30,
      durationMinutes: 45,
      title: 'Neurologist Check-in',
      description:
        'Quarterly check-in with Dr. Alvarez to review medication and cognition.',
      location: 'Clinic Room 4'
    },
    {
      offsetDays: -1,
      startMinutes: 17 * 60,
      durationMinutes: 30,
      title: 'Support Group (Virtual)',
      description:
        'Weekly caregiver support circle hosted by Better Mind Care.',
      location: 'Google Meet'
    }
  ];

  return templates.map((tpl, idx) => {
    const start = addMinutes(addDays(base, tpl.offsetDays), tpl.startMinutes);
    const end = addMinutes(start, tpl.durationMinutes);

    return {
      id: `mock-${idx + 1}`,
      title: tpl.title,
      start,
      end,
      description: tpl.description,
      location: tpl.location,
      meetUrl:
        tpl.location === 'Google Meet'
          ? 'https://meet.google.com/mock-room'
          : undefined
    };
  });
}

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
  if (!dateLike) return null; // don't use '' — it's poison later

  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (isNaN(d.getTime())) return null; // invalid date → no silent failure

  // Convert to local ISO without timezone shifting the wrong way
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

// Shared button styles (consistent size)
const rowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 8,
  marginTop: 8
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
    if (USE_MOCK_CALENDAR) {
      setEvents(buildMockEvents(r.start));
      return;
    }

    try {
      const evs = await fetchEvents(
        r.start.toISOString(),
        r.end.toISOString(),
        calendarId,
        includePastDays
      );
      setEvents(
        (evs || []).map((e) => ({
          ...e,
          title: e.summary || e.title || '(no title)',
          start: new Date(e.start_time),
          end: new Date(e.end_time)
        }))
      );
    } catch (err) {
      console.error('Failed to load calendar events', err);
      if (process.env.NODE_ENV === 'development') {
        setEvents(buildMockEvents(r.start));
        return;
      }
      throw err;
    }
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
    setCreateStart(s);
    setCreateEnd(e);
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

      if (USE_MOCK_CALENDAR) {
        const nextEvent = {
          id: `mock-${Date.now()}`,
          title: createTitle.trim(),
          description: createDesc || '',
          start: s,
          end: e,
          location: 'Mock Calendar',
          meetUrl: 'https://meet.google.com/mock-room',
          patient_email: createPatientEmail || undefined,
          patient_name: createPatientName || undefined
        };

        setEvents((prev) =>
          [...prev, nextEvent].sort(
            (a, b) => a.start.getTime() - b.start.getTime()
          )
        );
        setShowCreate(false);
        return;
      }

      await createMeeting({
        summary: createTitle.trim(),
        description: createDesc || '',
        start_time: s,
        end_time: e,
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 20,
          fontWeight: 600,
          color: '#1f2937'
        }}
      >
        <span>Calendar:</span>
        <select
          style={{ cursor: 'pointer', fontSize: 18, fontWeight: 500 }}
          value={calendarId}
          onChange={(e) => setCalendarId(e.target.value)}
        >
          <option value="primary">Primary</option>
        </select>
        <button
          type="button"
          className="btn btn-outline-teal"
          onClick={() => load(range)}
        >
          Refresh
        </button>
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
          setEditStart(toLocalInputValue(new Date(ev.start)));
          setEditEnd(toLocalInputValue(new Date(ev.end)));
        }}
        components={{
          toolbar: CustomToolbar
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={submitCreate}
                style={{ width: '100%' }}
              >
                Create
              </button>
              <button
                type="button"
                className="btn btn-outline-teal"
                onClick={() => setShowCreate(false)}
                style={{ width: '100%' }}
              >
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
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => window.open(selected.meetUrl, '_blank')}
                        style={{ width: '100%' }}
                      >
                        Join Google Meet
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-teal"
                        onClick={() =>
                          navigator.clipboard.writeText(selected.meetUrl)
                        }
                        style={{ width: '100%' }}
                      >
                        Copy Meet Link
                      </button>
                    </>
                  )}
                  {selected.htmlLink && (
                    <button
                      type="button"
                      className="btn btn-outline-teal"
                      onClick={() => window.open(selected.htmlLink, '_blank')}
                      style={{ width: '100%' }}
                    >
                      Open in Google Calendar
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline-teal"
                    onClick={() => setIsEditing(true)}
                    style={{ width: '100%' }}
                  >
                    Update
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={async () => {
                      if (!window.confirm('Delete this meeting?')) return;
                      try {
                        if (USE_MOCK_CALENDAR && selected) {
                          setEvents((prev) =>
                            prev.filter((ev) => ev.id !== selected.id)
                          );
                          setSelected(null);
                          return;
                        }
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
                    style={{ width: '100%' }}
                  >
                    Delete
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-teal"
                    onClick={() => setSelected(null)}
                    style={{ width: '100%' }}
                  >
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
                    type="button"
                    className="btn btn-primary"
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

                        if (USE_MOCK_CALENDAR && selected) {
                          setEvents((prev) =>
                            prev.map((ev) =>
                              ev.id === selected.id
                                ? {
                                    ...ev,
                                    title: editTitle,
                                    start: s,
                                    end: e
                                  }
                                : ev
                            )
                          );
                          setIsEditing(false);
                          setSelected(null);
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
                    style={{ width: '100%' }}
                  >
                    Save Update
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-teal"
                    onClick={() => setIsEditing(false)}
                    style={{ width: '100%' }}
                  >
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
