/** @format */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEyeOff, FiEye } from 'react-icons/fi';
import {
  OutlineButtonHoverDark,
  OutlineButton
} from '../../components/button/Buttons';
import './SignUp.css';

export default function SignUp() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    gender: ''
  });
  const [error, setError] = useState('');
  const [showResend, setShowResend] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowResend(false);

    // Build payload: email lowercased/trimmed, drop empty optionals
    const raw = {
      email: String(form.email || '')
        .trim()
        .toLowerCase(),
      password: String(form.password || ''), // don't trim passwords
      first_name: String(form.first_name || '').trim(),
      last_name: String(form.last_name || '').trim(),
      phone: String(form.phone || '').trim(),
      gender: String(form.gender || '').trim()
    };
    const payload = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== '')
    );

    // Minimal guards to mirror backend only
    if (!payload.email) {
      setError('Email is required.');
      return;
    }
    if (!payload.password || payload.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(payload.password)) {
      setError('Password must include at least one special character.');
      return;
    }

    try {
      const res = await fetch('/api/auth/public-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error || data.message || `Signup failed (${res.status})`
        );
      }

      alert('Signup successful! Check your email to confirm your account.');
      setShowResend(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      console.error('Signup error:', err);
      setError(String(err.message || err));
    }
  };

  const handleResend = async () => {
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: String(form.email || '')
            .trim()
            .toLowerCase()
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || 'Failed to resend confirmation');
      alert('Confirmation email sent again!');
    } catch (err) {
      console.error('Resend error:', err);
      alert('Could not resend email. Please try again later.');
    }
  };

  return (
    <div
      style={{
        background: 'var(--teal-gradient)',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div className="auth-form">
        <h2 className="title">Create Your Account</h2>
    <div
      style={{
        background: 'var(--teal-gradient)',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div className="auth-form">
        <h2 className="title">Create Your Account</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div>
            <input
              className="form-input"
              name="last_name"
              placeholder="Last Name (optional)"
              value={form.last_name}
              onChange={handleChange}
            />
            <input
              className="form-input"
              name="email"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            <input
              className="form-input"
              name="phone"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
             />
          <div>
            <input
              className="form-input"
              name="first_name"
              placeholder="First Name (optional)"
              value={form.first_name}
              onChange={handleChange}
            />
            <input
              className="form-input"
              name="last_name"
              placeholder="Last Name (optional)"
              value={form.last_name}
              onChange={handleChange}
            />
            <input
              className="form-input"
              name="email"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
            <input
              className="form-input"
              name="phone"
              placeholder="Phone (optional)"
              value={form.phone}
              onChange={handleChange}
              autoComplete="tel"
            />

            <div className="password-field" style={{ position: 'relative' }}>
              <input
                className="form-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 8 characters + 1 special character)"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                style={{ paddingRight: 44 }}
              />
              <span
                role="switch"
                aria-checked={showPassword}
                tabIndex={0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </span>
            </div>
            <div className="password-field" style={{ position: 'relative' }}>
              <input
                className="form-input"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 8 characters + 1 special character)"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="new-password"
                style={{ paddingRight: 44 }}
              />
              <span
                role="switch"
                aria-checked={showPassword}
                tabIndex={0}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </span>
              </div>
            </div>

            {/* Gender remains optional. Enable if you want to collect it. */}
            {/* <input
            {/* Gender remains optional. Enable if you want to collect it. */}
            {/* <input
            className="form-input"
            name="gender"
            placeholder="Gender (optional)"
            value={form.gender}
            onChange={handleChange}
          /> */}

            {error && <p className="error">{error}</p>}

            <OutlineButtonHoverDark
              type="submit"
              className="btn-outline-hover-dark"
              style={{
                width: '33.33%',
                margin: '0 auto',
                padding: '0.8rem 2rem',
                display: 'block'
              }}
            >
              Sign Up
            </OutlineButtonHoverDark>
          </div>
        </form>

        {showResend && (
          <div className="resend-confirmation-box">
            <p>Didn't get the confirmation email?</p>
            <OutlineButton
              type="button"
              className="btn-outline-teal"
              onClick={handleResend}
              style={{ width: '33.33%', margin: '0 auto' }}
            >
              Resend Email
            </OutlineButton>
            <p>Redirecting to login shortly...</p>
          </div>
        )}
      </div>
        {showResend && (
          <div className="resend-confirmation-box">
            <p>Didn't get the confirmation email?</p>
            <OutlineButton
              type="button"
              className="btn-outline-teal"
              onClick={handleResend}
              style={{ width: '33.33%', margin: '0 auto' }}
            >
              Resend Email
            </OutlineButton>
            <p>Redirecting to login shortly...</p>
          </div>
        )}
      </div>
    </div>
  );
}
