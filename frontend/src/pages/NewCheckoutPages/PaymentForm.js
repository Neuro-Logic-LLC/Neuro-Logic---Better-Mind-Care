import { useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement
} from '@stripe/react-stripe-js';
import { PrimaryButton } from '../../components/button/Buttons';

export default function PaymentForm({
  clientSecret,
  amountLabel,
  disabled,
  onCollected,
  onBeforeSubmit
}) {
  const stripe = require('stripe')(stripeKey);
  const elements = useElements();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!stripe || !elements) return;

    // Prevent submission if validation fails (cart empty, TOS unchecked, etc.)
    if (onBeforeSubmit) {
      const shouldProceed = onBeforeSubmit();
      if (!shouldProceed) return;
    }

    // Block if PaymentElement isn't mounted yet
    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement) {
      setError('Payment form is still loading. Please wait a moment.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await stripe.confirmSetup({
      elements,
      clientSecret,
      confirmParams: {
        return_url: window.location.href
      }
    });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    onCollected({
      customerId: result.setupIntent.customer,
      paymentMethod: result.setupIntent.payment_method
    });
  }

  // Disable button until PaymentElement mounts
  const paymentElementReady = elements && elements.getElement(PaymentElement);

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border p-4 bg-white shadow-sm space-y-4">
        <PaymentElement
          onReady={() => console.log('PaymentElement READY')}
          onLoadError={(e) => console.error('PaymentElement LOAD ERROR:', e)}
          onError={(e) => console.error('PaymentElement ERROR:', e)}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <PrimaryButton
          type="button"
          disabled={disabled || loading || !paymentElementReady}
          onClick={handleSubmit}
          className="w-full h-11 rounded-lg bg-black text-white font-medium disabled:opacity-60"
        >
          {loading ? 'Processing…' : `Save Card — ${amountLabel}`}
        </PrimaryButton>
      </div>
    </div>
  );
}
