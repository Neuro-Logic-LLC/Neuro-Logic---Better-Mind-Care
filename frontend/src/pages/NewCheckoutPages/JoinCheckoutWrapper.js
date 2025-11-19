import { useEffect, useState, useMemo, useRef } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutStep from './CheckoutStep';
import { useSignup } from './SignupContext';

export const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

export default function JoinCheckoutWrapper() {
  const { state } = useSignup();
  const email = state.email;

  const [clientSecret, setClientSecret] = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (!email) return;
    if (fetched.current) return;
    fetched.current = true;

    async function fetchIntent() {
      const res = await fetch('/api/stripe/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      console.log(data);
      console.log('SetupIntent clientSecret:', data.clientSecret);
      setClientSecret(data.clientSecret);
    }

    fetchIntent();
  }, [email]);

  const options = useMemo(() => {
    return clientSecret ? { clientSecret } : null;
  }, [clientSecret]);

  if (!options) {
    return <p style={{ padding: 40 }}>Preparing secure checkout…</p>;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutStep />
    </Elements>
  );
}
