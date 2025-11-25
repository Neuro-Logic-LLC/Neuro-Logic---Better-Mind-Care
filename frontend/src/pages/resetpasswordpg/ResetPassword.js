import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OutlineButtonHoverDark } from '../../components/button/Buttons';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  // 8+ chars, at least 1 special, no spaces
  const passwordRegex = /^(?=.*[^A-Za-z0-9])\S{8,}$/;
  // Stricter option (uncomment to require upper, lower, number, special):
  // const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/;

  // token fix for spaces that should be + during URL decoding
  const raw = (searchParams.get('token') || '').trim();
  const token = raw.replace(/ /g, '+'); // remove after migration

  const handleSubmit = async () => {
    setStatus('');

    const pwd = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!token) {
      return setStatus('Invalid or missing reset token.');
    }
    if (pwd !== confirm) {
      return setStatus('Passwords do not match.');
    }

    if (!passwordRegex.test(pwd)) {
      return setStatus(
        'Password must be 8+ characters with at least 1 special character and no spaces.'
      );
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: pwd })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus('Password reset successful. Redirecting to login...');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setStatus(data.error || 'Password reset failed.');
      }
    } catch (err) {
      console.error(err);
      setStatus('Password reset unsuccessful. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="reset-pass-page"
      style={{
        background: 'var(--teal-gradient)',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '10vh',
        textAlign: 'center'
      }}
    >
      <h2>Reset Your Password</h2>

      <input
        className="reset-input"
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        autoComplete="new-password"
        aria-label="New password"
        style={{ margin: '0.5rem 0' }}
      />

      <input
        className="reset-input"
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        aria-label="Confirm password"
        style={{ margin: '0.5rem 0' }}
      />

      <OutlineButtonHoverDark
        onClick={handleSubmit}
        disabled={submitting}
        style={{ marginTop: '25px' }}
      >
        {submitting ? 'Resetting...' : 'Reset Password'}
      </OutlineButtonHoverDark>

      {status && (
        <p
          className={status.includes('successful') ? 'success' : 'error'}
          role="alert"
        >
          {status}
        </p>
      )}
    </div>
  );
}
