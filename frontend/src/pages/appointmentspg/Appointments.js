import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';

function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const wrapperStyle = {
    background: 'var(--seafoam-gradient)',
    minHeight: '100vh',
    padding: '2rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  };


  const fetchAppointments = async () => {
    try {
      const response = await fetch('/api/appointments', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Unable to load appointments. Please try again later.');
      }

      const data = await response.json();
      setAppointments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={wrapperStyle}></div>;
  }

  if (error) {
    return (
      <div style={wrapperStyle}>
        <div className="appointments-page">
          <h1>Appointments</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <div className="appointments-page">
        <h1>Appointments</h1>
        <p>Manage your upcoming and past appointments.</p>

        <div className="appointments-list">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="appointment-item">
              <div className="appointment-header">
                <strong>{appointment.title}</strong>
                <span className="appointment-date">
                  {new Date(appointment.date).toLocaleDateString()}
                </span>
              </div>
              <div className="appointment-details">
                {appointment.description}
              </div>
            </div>
          ))}
        </div>

        {appointments.length === 0 && (
          <p className="no-appointments">
            You don't have any appointments scheduled. Contact support to
            schedule one.
          </p>
        )}
      </div>
    </div>
  );
}

export default Appointments;