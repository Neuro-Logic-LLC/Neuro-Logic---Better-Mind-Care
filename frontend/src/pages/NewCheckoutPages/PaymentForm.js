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
  const stripe = useStripe();
  const elements = useElements();

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentReady, setPaymentReady] = useState(false);
  
  async function handleSubmit() {
    if (!stripe || !elements) return;

    if (onBeforeSubmit) {
      const shouldProceed = onBeforeSubmit();
      if (!shouldProceed) return;
    }

    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement) {
      setError('Payment form is still loading. Please wait a moment.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await stripe.confirmSetup({
      elements,
      redirect: 'if_required'
    });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    // SUCCESS
    const si = result.setupIntent;

    onCollected({
      customerId: si.customer,
      paymentMethod: si.payment_method
    });
  }

  const paymentElementReady = elements && elements.getElement(PaymentElement);

  return (
    <div className="mt-3 space-y-3">
      <div className="rounded-xl border p-4 bg-white shadow-sm space-y-4">
        <PaymentElement
          onReady={() => {
            setPaymentReady(true);
            console.log('PaymentElement READY');
          }}
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
