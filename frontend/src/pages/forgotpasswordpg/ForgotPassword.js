import { useState } from 'react';
import './ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setStatus({ success: true, message: data.message });
      } else {
        setStatus({ success: false, message: data.error });
      }
    } catch (err) {
      console.error('❌ Forgot password error:', err);
      setStatus({ success: false, message: 'Something went wrong.' });
    }
  };

  return (
    <div className="forgot-pass-page">
      <h2>Forgot Password</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <input
            className="email-input"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <button className="reset-button" type="submit">
            Send Reset Link
          </button>
        </div>
      </form>

      {status && (
        <p className={status.success ? 'success' : 'error'}>{status.message}</p>
      )}
    </div>
  );
}

export default ForgotPassword;
