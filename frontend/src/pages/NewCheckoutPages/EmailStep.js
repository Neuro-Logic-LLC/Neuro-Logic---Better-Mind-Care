import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignup } from './SignupContext';
import { useAuth } from '../../auth/AuthContext';
import {
  PrimaryButton,
  SecondaryButton
} from '../../components/button/Buttons';

export default function EmailStep() {
  const { user, loading } = useAuth();
  const { state, setField } = useSignup();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const navigate = useNavigate();

  async function checkAndValidateEmailExists(email) {
    try {
      const res = await fetch(
        `/api/auth/check-email-exists?email=${encodeURIComponent(email)}`,
        { method: 'GET' }
      );
      const data = await res.json();
      return !!data.exists;
    } catch (err) {
      console.error('Email check failed:', err);
      return false;
    }
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim();

    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.(com|org|net|edu|gov)$/i.test(trimmed)) {
      return setError('Enter a valid .com or .org email.');
    }

    setChecking(true);

    // Server-side duplicate check
    const exists = await checkAndValidateEmailExists(trimmed);

    if (exists) {
      setChecking(false);
      return setError(
        'This email is already registered. Please sign in instead.'
      );
    }

    // Store email and move forward
    setField('email', trimmed);
    setChecking(false);
    navigate('/join/checkout');
  };

  return (
    <div className="pl-4 md:pl-8 lg:pl-12 py-10">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div
          style={{ display: 'flex', alignItems: 'center', marginLeft: '20px' }}
        >
          <h1 className="text-2xl font-semibold mb-2">Join</h1>
        </div>
        <p
          style={{ marginLeft: '20px' }}
          className="text-sm text-neutral-600 mb-2"
        >
          Let's get your account set up.
        </p>
        <p
          style={{ marginLeft: '20px' }}
          className="text-sm text-neutral-600 mb-6"
        >
          Enter your email to begin. It only takes a moment.
        </p>
        <div style={{ marginLeft: '20px' }} className="flex items-center gap-3">
          <input
            style={{ cursor: 'pointer', marginRight: '30px' }}
            className="flex-1 h-11 rounded-lg border px-3"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <PrimaryButton type="submit">Continue</PrimaryButton>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </form>
    </div>
  );
}
