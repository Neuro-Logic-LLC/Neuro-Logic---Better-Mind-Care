import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignup } from './SignupContext';
import { OutlineButtonHoverDark } from '../../components/button/Buttons';

const PRICES = {
  CORE: 44900,
  APOE: 12500,
  DOCTORS_DATA: 9900
};

const usd = (cents) =>
  (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });

const S = {
  page: { padding: 40, maxWidth: 960 },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
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
  const { state, setField } = useSignup();
  const navigate = useNavigate();

  const [cart, setCart] = useState({
    CORE: false,
    APOE: false,
    DOCTORS_DATA: false
  });
  const [agreeTos, setAgreeTos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const email = state.email || '';



  useEffect(() => {
  if (!email) return;

  fetch('/api/auth/reached-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
}, [email]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get('resume_id');

    if (!resumeId) return;

    async function load() {
      const res = await fetch(`/api/auth/pending-signup/${resumeId}`);
      const data = await res.json();

      if (!res.ok) return;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          setField(key, value);
        }
      });
    }

    load();
  }, []);

  function toggle(key, val) {
    setCart((prev) => ({ ...prev, [key]: val }));
  }

  async function startStripeCheckout() {
    setLoading(true);
    setError('');
    setField('pickedCore', cart.CORE);
    setField('pickedApoe', cart.APOE);
    setField('pickedDoctorsData', cart.DOCTORS_DATA);

    const body = {
      brainhealth: cart.CORE,
      apoe: cart.APOE,
      doctors_data: cart.DOCTORS_DATA,

      customer_email: state.email,
      success_url: `${window.location.origin}/account-info`,
      cancel_url: `${window.location.origin}/join/checkout`,

      meta: {
        pickedApoe: cart.APOE ? '1' : '0',
        pickedCore: cart.CORE ? '1' : '0',
        pickedDoctorsData: cart.DOCTORS_DATA ? '1' : '0'
      }
    };

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error || 'Stripe checkout failed.');
      setLoading(false);
    }
  }

  const totalCents =
    (cart.CORE ? PRICES.CORE : 0) +
    (cart.APOE ? PRICES.APOE : 0) +
    (cart.DOCTORS_DATA ? PRICES.DOCTORS_DATA : 0);

  function validateBeforeStripe() {
    if (!(cart.CORE || cart.APOE || cart.DOCTORS_DATA))
      return 'Pick at least one item.';
    if (!agreeTos) return 'You must accept the terms.';
    return null;
  }

  return (
    <div style={S.page}>
      <h2 style={S.heading}>Purchase</h2>

      <div style={S.section}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Choose your tests
        </div>

        <label style={S.checkboxRow}>
          <input
            type="checkbox"
            checked={cart.CORE}
            disabled={true}
            onChange={(e) => {
              toggle('CORE', e.target.checked);
              setField('pickedCore', e.target.checked);
            }}
          />
          <span style={{ flex: 1 }}>Brain Health & Prevention Assessment</span>
          <span>{usd(PRICES.CORE)}</span>
        </label>

        <label style={S.checkboxRow}>
          <input
            type="checkbox"
            checked={cart.APOE}
            onChange={(e) => {
              toggle('APOE', e.target.checked);
              setField('pickedApoe', e.target.checked);
            }}
          />
          <span style={{ flex: 1 }}>ApoE Gene Test</span>
          <span>{usd(PRICES.APOE)}</span>
        </label>
        {false && (
          <label style={S.checkboxRow}>
            <input
              type="checkbox"
              checked={cart.DOCTORS_DATA}
              onChange={(e) => {
                toggle('DOCTORS_DATA', e.target.checked);
                setField('pickedDoctorsData', e.target.checked);
              }}
            />

            <span style={{ flex: 1 }}>Doctors Data Test</span>
            <span>{usd(PRICES.DOCTORS_DATA)}</span>
          </label>
        )}  
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: 'flex', gap: 8 }}>
          <input
            type="checkbox"
            checked={agreeTos}
            onChange={(e) => setAgreeTos(e.target.checked)}
          />
          <span style={{ fontSize: 14 }}>
            I agree to the <Link to="/terms">Terms of Service</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>.
          </span>
        </label>
      </div>

      {error && <div style={S.error}>{error}</div>}

      <div style={{ marginTop: 16 }}>
        {totalCents > 0 ? (
          <OutlineButtonHoverDark
            disabled={!agreeTos || loading}
            onClick={startStripeCheckout}
          >
            Continue to Payment
          </OutlineButtonHoverDark>
        ) : (
          <p style={{ color: '#999', marginTop: 12 }}>
            Select at least one test to continue.
          </p>
        )}
      </div>

      <aside style={S.aside}>
        <div style={S.asideHead}>Order summary</div>
        <div style={S.asideBody}>
          {cart.CORE && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Brain Health & Prevention Assessment</span>
              <span>{usd(PRICES.CORE)}</span>
            </div>
          )}

          {cart.APOE && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>ApoE Gene Test</span>
              <span>{usd(PRICES.APOE)}</span>
            </div>
          )}
          {cart.DOCTORS_DATA && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Doctors Data Test</span>
              <span>{usd(PRICES.DOCTORS_DATA)}</span>
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
