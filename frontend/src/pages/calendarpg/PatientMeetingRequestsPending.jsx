import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

export default function PatientMeetingRequestsPending() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadPending() {
    setLoading(true);
    const res = await fetch('/api/calendar/pending-events', {
      credentials: 'include'
    });
    const data = await res.json();
    setPending(data.pending || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPending();
  }, []);

  async function approve(id) {
    await fetch(`/api/calendar/confirm-event/${id}`, {
      method: 'POST',
      credentials: 'include'
    });
    loadPending();
  }

  async function decline(id) {
    await fetch(`/api/calendar/decline-event/${id}`, {
      method: 'POST',
      credentials: 'include'
    });
    loadPending();
  }

  if (loading) return <div>Loading pending requests...</div>;

  if (!pending.length) return <div>No pending appointment requests.</div>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Pending Appointment Requests</h2>

      {pending.map((ev) => (
        <div key={ev.id} style={styles.card}>
          <div style={styles.row}>
            <strong>{dayjs(ev.start).format('dddd MMM DD')}</strong>
            <span>
              {dayjs(ev.start).format('h:mm A')} -{' '}
              {dayjs(ev.end).format('h:mm A')}
            </span>
          </div>

          {ev.patientName && (
            <div style={styles.field}>
              <strong>Patient:</strong> {ev.patientName}
            </div>
          )}

          {ev.notes && (
            <div style={styles.field}>
              <strong>Notes:</strong> {ev.notes}
            </div>
          )}

          <div style={styles.actions}>
            <button style={styles.approve} onClick={() => approve(ev.id)}>
              Approve
            </button>

            <button style={styles.decline} onClick={() => decline(ev.id)}>
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: { maxWidth: 600, margin: '0 auto', padding: 20 },
  header: { textAlign: 'center', marginBottom: 20 },
  card: {
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    background: 'white'
  },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 10 },
  field: { marginBottom: 8 },
  actions: { display: 'flex', gap: 10 },
  approve: {
    background: 'green',
    color: 'white',
    padding: '8px 12px',
    borderRadius: 5,
    border: 'none',
    cursor: 'pointer'
  },
  decline: {
    background: 'red',
    color: 'white',
    padding: '8px 12px',
    borderRadius: 5,
    border: 'none',
    cursor: 'pointer'
  }
};
