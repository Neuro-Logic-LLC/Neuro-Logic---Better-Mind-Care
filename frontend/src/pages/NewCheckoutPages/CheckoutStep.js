import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignup } from './SignupContext';
import PaymentForm from './PaymentForm';

const PRICES = {
  CORE: 30000,
  NEURO: 37900,
  APOE: 9900,
  BUNDLE_CORE_APOE: 39900
};

const usd = (cents) =>
  (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });

const S = {
  page: { padding: 40, maxWidth: 960 },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  sub: { color: '#5a6b7a', fontSize: 14, marginBottom: 24 },
  section: {
    border: '1px solid #e6edf4',
    borderRadius: 16,
    padding: 16,
    marginTop: 16
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    border: '1px solid #e6edf4',
    marginTop: 8
  },
  error: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#b91c1c',
    padding: 12,
    borderRadius: 10,
    marginTop: 12
  },
  aside: {
    border: '1px solid #e6edf4',
    borderRadius: 16,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: 24
  },
  asideHead: {
    padding: 20,
    borderBottom: '1px solid #e6edf4',
    fontWeight: 600
  },
  asideBody: { padding: 20, fontSize: 14 }
};

export default function CheckoutStep() {
  const { state } = useSignup();
  const navigate = useNavigate();

  // cart selection
  const [cart, setCart] = useState({
    CORE: false,
    APOE: false,
    NEURO: false,
    BUNDLE_CORE_APOE: false,
  });

  const [agreeTos, setAgreeTos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const email = state.email || '';
  console.log('CheckoutStep email:', email);

  useEffect(() => {
    if (!email) navigate('/join');
  }, [email, navigate]);

  function toggle(key, val) {
    setCart((prev) => {
      const next = { ...prev, [key]: val };

      // auto rules
      if (key === 'BUNDLE_CORE_APOE' && val) {
        next.CORE = false;
        next.APOE = false;
      }

      if (!next.BUNDLE_CORE_APOE && next.CORE && next.APOE) {
        next.BUNDLE_CORE_APOE = true;
        next.CORE = false;
        next.APOE = false;
      }

      return next;
    });
  }

  const totalCents = cart.BUNDLE_CORE_APOE
    ? PRICES.BUNDLE_CORE_APOE + (cart.NEURO ? PRICES.NEURO : 0)
    : (cart.CORE ? PRICES.CORE : 0) +
      (cart.APOE ? PRICES.APOE : 0) +
      (cart.NEURO ? PRICES.NEURO : 0);

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let data;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    return { res, data };
  }

  async function startStripeCheckout() {
    const baseUrl = window.location.origin;

    const payload = {
      brainhealth: Boolean(cart.CORE || cart.BUNDLE_CORE_APOE),
      apoe: Boolean(cart.APOE || cart.BUNDLE_CORE_APOE),
      ptau: false, // disabled until backend supports it

      customer_email: email,

      success_url: `${baseUrl}/success`,
      cancel_url: `${baseUrl}/cancel-order`,

      meta: {
        source: 'JoinCheckout',
        ui_core: cart.CORE ? '1' : '0',
        ui_apoe: cart.APOE ? '1' : '0',
        ui_neuro: cart.NEURO ? '1' : '0',
        ui_bundle_core_apoe: cart.BUNDLE_CORE_APOE ? '1' : '0'
      }
    };

    let { res, data } = await postJson('/api/stripe/checkout', payload);
    if (res.status === 404)
      ({ res, data } = await postJson('/stripe/checkout', payload));

    if (!res.ok)
      throw new Error(
        data?.error ||
          data?.message ||
          data?.raw ||
          `Stripe checkout failed (${res.status})`
      );

    if (!data?.url) throw new Error('No redirect URL from server');

    window.location.href = data.url;
  }

  async function submit() {
    try {
      setLoading(true);
      setError('');

      if (!(cart.BUNDLE_CORE_APOE || cart.CORE || cart.APOE || cart.NEURO)) {
        throw new Error('Pick at least one item.');
      }

      if (!agreeTos) {
        throw new Error('You must accept the terms.');
      }

      await startStripeCheckout();
    } catch (err) {
      setError(String(err.message || err));
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <h2 style={S.heading}>Purchase</h2>

      {/* Tests */}
      <div style={S.section}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Choose your tests
        </div>

        <label style={S.checkboxRow}>
          <input
            type="checkbox"
            checked={cart.BUNDLE_CORE_APOE}
            onChange={(e) => toggle('BUNDLE_CORE_APOE', e.target.checked)}
          />
          <span style={{ flex: 1 }}>Bundle: Core + ApoE</span>
          <span>{usd(PRICES.BUNDLE_CORE_APOE)}</span>
        </label>

        <label
          style={{
            ...S.checkboxRow,
            opacity: cart.BUNDLE_CORE_APOE ? 0.6 : 1
          }}
        >
          <input
            type="checkbox"
            checked={cart.CORE}
            disabled={cart.BUNDLE_CORE_APOE}
            onChange={(e) => toggle('CORE', e.target.checked)}
          />
          <span style={{ flex: 1 }}>
            Brain Health & Prevention Assessment
          </span>
          <span>{usd(PRICES.CORE)}</span>
        </label>

        <label
          style={{
            ...S.checkboxRow,
            opacity: cart.BUNDLE_CORE_APOE ? 0.6 : 1
          }}
        >
          <input
            type="checkbox"
            checked={cart.APOE}
            disabled={cart.BUNDLE_CORE_APOE}
            onChange={(e) => toggle('APOE', e.target.checked)}
          />
          <span style={{ flex: 1 }}>ApoE Gene Test</span>
          <span>{usd(PRICES.APOE)}</span>
        </label>

        <label style={S.checkboxRow}>
          <input
            type="checkbox"
            checked={cart.NEURO}
            onChange={(e) => toggle('NEURO', e.target.checked)}
          />
          <span style={{ flex: 1 }}>NeuroEval (38 biomarkers)</span>
          <span>{usd(PRICES.NEURO)}</span>
        </label>
      </div>

      {/* Terms */}
      <div style={{ marginTop: 16 }}>
        <label style={{ display: 'flex', gap: 8 }}>
          <input
            type="checkbox"
            checked={agreeTos}
            onChange={(e) => setAgreeTos(e.target.checked)}
          />
          <span style={{ fontSize: 14 }}>
            I agree to the{' '}
            <Link to="/terms" target="_blank" rel="noreferrer">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" rel="noreferrer">
              Privacy Policy
            </Link>.
          </span>
        </label>
      </div>

      {error && <div style={S.error}>{error}</div>}

      {/* Pay */}
      <div style={{ marginTop: 16 }}>
        <PaymentForm
          amountLabel={usd(totalCents)}
          disabled={loading}
          onPay={submit}
        />
        {loading && (
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
            Processing…
          </p>
        )}
      </div>

      {/* Summary */}
      <aside style={S.aside}>
        <div style={S.asideHead}>Order summary</div>
        <div style={S.asideBody}>
          {cart.BUNDLE_CORE_APOE && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bundle: Core + ApoE</span>
              <span>{usd(PRICES.BUNDLE_CORE_APOE)}</span>
            </div>
          )}

          {!cart.BUNDLE_CORE_APOE && cart.CORE && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Brain Health & Prevention Assessment</span>
              <span>{usd(PRICES.CORE)}</span>
            </div>
          )}

          {!cart.BUNDLE_CORE_APOE && cart.APOE && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ApoE Gene Test</span>
              <span>{usd(PRICES.APOE)}</span>
            </div>
          )}

          {cart.NEURO && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>NeuroEval (38 biomarkers)</span>
              <span>{usd(PRICES.NEURO)}</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 8,
              marginTop: 8,
              borderTop: '1px solid #e6edf4',
              fontWeight: 600
            }}
          >
            <span>Total</span>
            <span>{usd(totalCents)}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
