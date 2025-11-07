// ConfirmEmail.jsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ConfirmEmail() {
  const [status, setStatus] = useState('⏳ Verifying your email...');
  const navigate = useNavigate();

  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) return setStatus('⚠️ Invalid or missing token.');

    fetch('/api/auth/confirm-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.message) {
          setStatus('✅ ' + data.message + ' Redirecting to login...');
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setStatus('❌ ' + (data.error || 'Unknown error'));
        }
      })
       .catch(() => setStatus('❌ Server error. Please try again later.'));
   }, [navigate]);

  return (
    <div
      className="confirm-email-page"
      style={{ textAlign: 'center', marginTop: '3rem' }}
    >
      <h1>Email Confirmation</h1>
      <p>{status}</p>
    </div>
  );
}
