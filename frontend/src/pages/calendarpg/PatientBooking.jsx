import { useEffect, useState } from 'react';
import {
  fetchAvailabilityRange,
  createMeeting
} from '../../calendarApi/calendarApi';

import { useAuth } from '../../auth/AuthContext';

// Fetch slots for a specific day
async function fetchDayAvailability(date) {
  const res = await fetch(`/api/google-calendar/availability?date=${date}`, {
    credentials: 'include'
  });
  return res.json();
}

export default function PatientBooking() {
  const { user } = useAuth();
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [availableDays, setAvailableDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [bookingName, setBookingName] = useState('');
  const [bookingEmail, setBookingEmail] = useState('');
  const [confirmScreen, setConfirmScreen] = useState(null);

  // Autofill patient name/email
  useEffect(() => {
    if (user) {
      setBookingName(`${user.first_name} ${user.last_name}`.trim());
      setBookingEmail(user.email);
    }
  }, [user]);

  // Load available days for month
  useEffect(() => {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = new Date(year, month, 0).toISOString().slice(0, 10);

    fetchAvailabilityRange(start, end).then((res) => {
      const onlyAvailable = (res?.days || [])
        .filter((d) => d.available)
        .map((d) => d.date);

      setAvailableDays(onlyAvailable);
    });
  }, [year, month]);

  // Load slots for selected day
  useEffect(() => {
    if (!selectedDay) return;
    fetchDayAvailability(selectedDay).then((res) => {
      setSlots(res?.slots || []);
    });
  }, [selectedDay]);

  async function handleBook() {
    if (!bookingName.trim() || !bookingEmail.trim()) {
      alert('Name and email are required.');
      return;
    }

    const payload = {
      summary: 'Telehealth Appointment',
      start_time: selectedSlot.start,
      end_time: selectedSlot.end,
      patientName: bookingName,
      patientEmail: bookingEmail,
      calendarId: 'primary'
    };

    try {
      const res = await createMeeting(payload);
      setConfirmScreen(res);
    } catch (err) {
      console.error(err);
      alert('Sorry, that time was just taken.');
    }
  }

  // Confirmation screen
  if (confirmScreen) {
    return (
      <div className="p-6 max-w-md mx-auto text-center">
        <h2 className="text-2xl font-bold mb-4">You're Booked!</h2>
        <p className="mb-4">A confirmation email has been sent.</p>
        {confirmScreen.join_url && (
          <a
            href={confirmScreen.join_url}
            className="btn btn-primary"
            target="_blank"
            rel="noreferrer"
          >
            Join Google Meet
          </a>
        )}
      </div>
    );
  }

  // Month grid
  function renderMonth() {
    const lastDay = new Date(year, month, 0);

    const days = [];

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isAvailable = availableDays.includes(d);

      days.push(
        <div
          key={i}
          onClick={() => isAvailable && setSelectedDay(d)}
          style={{
            padding: 8,
            textAlign: 'center',
            cursor: isAvailable ? 'pointer' : 'default',
            background: isAvailable ? '#e6fffa' : '#f8fafc',
            borderRadius: 6,
            border: '1px solid #e2e8f0'
          }}
        >
          <div style={{ opacity: isAvailable ? 1 : 0.4 }}>{i}</div>

          {isAvailable && (
            <div
              style={{
                width: 8,
                height: 8,
                background: '#0d9488',
                borderRadius: '50%',
                margin: '4px auto 0'
              }}
            />
          )}
        </div>
      );
    }

    return (
      <div>
        <div className="flex items-center justify-center gap-2 mb-3">
           <button
             className="btn btn-outline-teal"
             style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto', flexShrink: 0 }}
             onClick={() => {
               if (month === 1) {
                 setMonth(12);
                 setYear(year - 1);
               } else {
                 setMonth(month - 1);
               }
             }}
           >
             ←
           </button>

          <h2 className="text-xl font-bold" style={{ fontSize: 'clamp(1rem, 3vw, 1.3rem)', whiteSpace: 'nowrap', flexShrink: 1 }}>
            {new Date(year, month - 1, 1).toLocaleString('default', {
              month: 'long',
              year: 'numeric'
            })}
          </h2>

           <button
             className="btn btn-outline-teal"
             style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto', flexShrink: 0 }}
             onClick={() => {
               if (month === 12) {
                 setMonth(1);
                 setYear(year + 1);
               } else {
                 setMonth(month + 1);
               }
             }}
           >
             →
           </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 6
          }}
        >
          {days}
        </div>
      </div>
    );
  }

  // Timeslots list
  function renderSlots() {
    return (
      <div style={{ textAlign: 'center', maxWidth: 300, margin: '0 auto' }}>
        <button
          className="btn btn-outline-teal mb-4 mx-auto"
          onClick={() => setSelectedDay(null)}
        >
          ← Back to month
        </button>

        <h3 className="font-bold text-lg mb-4">
          {new Date(selectedDay + 'T00:00:00-06:00').toLocaleDateString(
            'en-US',
            {
              timeZone: 'America/Chicago',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }
          )}
        </h3>

        <div style={{ display: 'grid', gap: 10 }}>
          {slots.length ? (
            slots.map((slot) => (
              <button
                key={slot.start}
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => setSelectedSlot(slot)}
              >
                {new Date(slot.start).toLocaleTimeString('en-US', {
                  timeZone: 'America/Chicago',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </button>
            ))
          ) : (
            <div>No available times</div>
          )}
        </div>
      </div>
    );
  }

  // Booking step
  // Booking step
  function renderBooking() {
    return (
      <div className="max-w-md mx-auto text-center">
        <button
          className="btn btn-outline-teal mb-4"
          style={{ marginLeft: 'auto', marginRight: 'auto' }}
          onClick={() => setSelectedSlot(null)}
        >
          ← Back to times
        </button>
        {selectedSlot && (
          <h3 className="text-xl font-bold mb-6">
            {new Date(selectedSlot.start).toLocaleString('en-US', {
              timeZone: 'America/Chicago'
            })}
          </h3>
        )}

        {/* Hidden inputs (still needed for state) */}
        <input type="hidden" value={bookingName} />
        <input type="hidden" value={bookingEmail} />

        <div
          style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 3px 12px rgba(0,0,0,0.1)',
            maxWidth: '350px',
            margin: '0 auto',
            textAlign: 'center'
          }}
        >
          <div className="mb-4 text-gray-600 text-sm">
            Booking as <strong>{bookingName}</strong> ({bookingEmail})
          </div>

          <button
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '1rem',
              borderRadius: '8px'
            }}
            onClick={handleBook}
          >
            Confirm Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      {!selectedDay && renderMonth()}
      {selectedDay && !selectedSlot && renderSlots()}
      {selectedSlot && renderBooking()}
    </div>
  );
}
