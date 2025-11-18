import React, { useState, useEffect } from 'react';

export default function MockBooking() {
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [availableDays, setAvailableDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [bookingName, setBookingName] = useState('Mock Patient A');
  const [bookingEmail, setBookingEmail] = useState('mockpatienta@example.com');
  const [confirmScreen, setConfirmScreen] = useState(null);

  // Mock available days for month
  useEffect(() => {
    const lastDay = new Date(year, month, 0).getDate();
    const available = [];
    for (let i = 1; i <= lastDay; i++) {
      if (i % 3 === 0) { // Mock every 3rd day available
        available.push(`${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
      }
    }
    setAvailableDays(available);
  }, [year, month]);

  // Mock slots for selected day
  useEffect(() => {
    if (!selectedDay) return;
    const mockSlots = [
      { start: `${selectedDay}T10:00:00`, end: `${selectedDay}T11:00:00` },
      { start: `${selectedDay}T14:00:00`, end: `${selectedDay}T15:00:00` },
      { start: `${selectedDay}T16:00:00`, end: `${selectedDay}T17:00:00` }
    ];
    setSlots(mockSlots);
  }, [selectedDay]);

  async function handleBook() {
    if (!bookingName.trim() || !bookingEmail.trim()) {
      alert('Name and email are required.');
      return;
    }

    // Mock booking success
    setConfirmScreen({
      join_url: 'https://meet.google.com/mock-room'
    });
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
        <div className="flex items-center justify-between mb-3">
          <button
            className="btn btn-outline-teal"
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

          <h2 className="text-xl font-bold">
            {new Date(year, month - 1, 1).toLocaleString('default', {
              month: 'long',
              year: 'numeric'
            })}
          </h2>

          <button
            className="btn btn-outline-teal"
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
          style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          ← Back to month
        </button>

        <h3 className="font-bold text-lg mb-4">
          {new Date(selectedDay + 'T12:00:00').toLocaleDateString()}
        </h3>

        <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
          {slots.length ? (
            slots.map((slot) => (
              <button
                key={slot.start}
                className="btn btn-secondary"
                style={{ minWidth: 220, padding: '0.75rem 1.5rem' }}
                onClick={() => setSelectedSlot(slot)}
              >
                {new Date(slot.start).toLocaleTimeString([], {
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

        <h3 className="text-xl font-bold mb-6">
          {new Date(selectedSlot.start.replace('Z', '')).toLocaleString()}
        </h3>

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