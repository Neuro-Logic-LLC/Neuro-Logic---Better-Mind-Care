import { useEffect, useState, useMemo, useRef } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import CheckoutStep from './CheckoutStep';
import { useSignup } from './SignupContext';
import { use } from 'react';

//Stripe's own documentation “Publishable keys can safely be exposed in the browser.”
//Your publishable key is allowed to be exposed. Stripe designed it that way.

export const stripePromise = loadStripe(
  'pk_test_51S5ZjjRpCzJIcQaA7TceREs5c4Z8f6CeDIHsrwA2eB7tI6e8mmsj3XRaRulR0ZtQtSqNOJsIsKvVEakcrTc1p6Sa00Lu3Qntxa'
);

export default function JoinCheckoutWrapper() {
  const { state } = useSignup();
  const email = state.email;
  const [field, setField] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (!email) return;
    if (fetched.current) return;
    fetched.current = true;

    
    async function fetchIntent() {
      const res = await fetch('/api/stripe/stripe-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      console.log('SetupIntent data:', data);
      setClientSecret(data.clientSecret);

      // 💥 ADD THESE
      setField('stripeCustomerId', data.customerId);
      setField('stripeSetupIntentClientSecret', data.clientSecret);
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
      <CheckoutStep clientSecret={clientSecret} />
    </Elements>
  );
}
