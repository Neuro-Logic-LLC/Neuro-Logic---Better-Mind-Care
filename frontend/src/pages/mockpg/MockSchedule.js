import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
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

const MockSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Simulate loading events from Google Calendar (readonly) - instant load for demo
    const today = new Date();
    const mockEvents = [
      {
        id: 1,
        title: 'Initial Consultation - Mock Patient A',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
        description: 'BetterMindCare Telehealth Visit - New patient intake'
      },
      {
        id: 2,
        title: 'Follow-up Session - Mock Patient B',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30),
        description: 'BetterMindCare Telehealth Visit - Progress review'
      },
      {
        id: 3,
        title: 'Lunch Break',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0),
        description: 'Personal time'
      },
      {
        id: 4,
        title: 'Group Wellness Workshop',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 30),
        description: 'BetterMindCare Virtual Group Session'
      },
      {
        id: 5,
        title: 'Care Plan Review - Mock Patient C',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 11, 0),
        description: 'BetterMindCare Telehealth Visit - Treatment adjustment'
      },
      {
        id: 6,
        title: 'Staff Meeting',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 15, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 16, 0),
        description: 'Weekly team coordination'
      },
      {
        id: 7,
        title: 'Neurology Consultation Prep',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 8, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 9, 0),
        description: 'Review patient records before specialist referral'
      },
      {
        id: 8,
        title: 'Client Session - Mock Patient D',
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 0),
        description: 'BetterMindCare Telehealth Visit - Cognitive assessment'
      }
    ];
    setEvents(mockEvents);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Coach Schedule</h1>
        <p>Loading schedule from Google Calendar...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        height: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '20px'
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
          value="primary"
        >
          <option value="primary">Primary</option>
        </select>
        <button
          type="button"
          className="btn btn-outline-teal"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        views={['month', 'week', 'day']}
        defaultView="month"
        popup={false}
        selectable={false}
        style={{ flex: 1 }}
      />
    </div>
  );
};

export default MockSchedule;