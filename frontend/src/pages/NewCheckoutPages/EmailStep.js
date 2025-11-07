import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignup } from './SignupContext';
import { useAuth } from '../../auth/AuthContext';
import { PrimaryButton } from '../../components/button/Buttons';

export default function EmailStep() {
  const { setField } = useSignup();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.(com|org|net|edu|gov)$/i.test(email.trim())) {
      return setError('Enter a valid .com or .org email.');
    }
    setField('email', email.trim());
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
          className="text-sm text-neutral-600 mb-6"
        >
          Enter your email to start.
        </p>
        <div style={{ marginLeft: '20px' }} className="flex items-center gap-3">
          <input
            style={{ cursor: 'pointer', marginRight: '30px' }}
            className="flex-1 h-11 rounded-lg border px-3"
            type="email"
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
