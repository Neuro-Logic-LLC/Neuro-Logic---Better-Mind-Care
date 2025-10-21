import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSignup } from './SignupContext';
import { useAuth } from '../../auth/AuthContext';
import PaymentForm from './PaymentForm';

const PRICES = {
  CORE: 30000,
  NEURO: 37900,
  APOE: 9900,
  BUNDLE_CORE_APOE: 39900
};
const usd = (cents) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const S = {
  page: {
    paddingLeft: 32,
    paddingRight: 32,
    paddingTop: 40,
    paddingBottom: 40,
    maxWidth: 960
  },
  heading: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  sub: { color: '#5a6b7a', fontSize: 14, marginBottom: 24 },
  field: { marginBottom: 16},
  label: { display: 'block', fontSize: 14, marginBottom: 6 },
  input: {
    display: 'flex',
    width: '33%',
    height: 44,
    borderRadius: 10,
    border: '1px solid #d9e3ec',
    padding: '0 12px',
    cursor: 'pointer'
  },
  section: {
    border: '1px solid #e6edf4',
    borderRadius: 16,
    padding: 16,
    marginTop: 16
  },
  rowBetween: { display: 'flex', alignItems: 'center', gap: 10 },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    border: '1px solid #e6edf4',
    marginTop: 8
  },
  small: { fontSize: 12, color: '#6b7280', marginTop: 8 },
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
  const [form, setForm] = useState({
    first_name: state.first_name || '',
    last_name: state.last_name || '',
    phone: state.phone || '',
    password: ''
  });
  const [agreeTos, setAgreeTos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingAccount, setExistingAccount] = useState(false);
  const [user, setUser] = useState(useAuth()) || '';
  const [resent, setResent] = useState(false);
  const navigate = useNavigate();

  if (!user) 
  console.log(user);

  const [cart, setCart] = useState({
    CORE: false,
    NEURO: false,
    APOE: false,
    BUNDLE_CORE_APOE: false
  });

  const totalCents = cart.BUNDLE_CORE_APOE
    ? PRICES.BUNDLE_CORE_APOE + (cart.NEURO ? PRICES.NEURO : 0)
    : (cart.CORE ? PRICES.CORE : 0) +
      (cart.APOE ? PRICES.APOE : 0) +
      (cart.NEURO ? PRICES.NEURO : 0);

  useEffect(() => {
    if (!state.email) navigate('/join'); 
    if (state.email) navigate('/join/checkout');
  }, [state.email, navigate]);

  function toggle(key, val) {
    setCart((prev) => {
      const next = { ...prev, [key]: val };
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

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function resendConfirm(email) {
    try {
      const res = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error('Resend failed');
      setResent(true);
    } catch {
      setError('Could not resend confirmation email. Try again later.');
    }
  }

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
      customer_email: state.email || undefined,
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

  const submitAll = async () => {
    setLoading(true);
    setError('');
    setExistingAccount(false);
    try {
      if (!(cart.BUNDLE_CORE_APOE || cart.CORE || cart.APOE || cart.NEURO))
        throw new Error('Pick at least one item.');
      if (!agreeTos) throw new Error('You must accept the terms.');
      if (!state.email)
        throw new Error('Missing email. Go back to the previous step.');

      const signupBody = {
        email: state.email,
        password: form.password,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim()
      };
      let { res, data } = await postJson('/api/auth/public-signup', signupBody);
      if (res.status === 404)
        ({ res, data } = await postJson('/auth/public-signup', signupBody));

      if (!res.ok) {
        if (res.status === 409 || data?.error === 'email_exists') {
          setExistingAccount(true);
        } else {
          if (!form.password || form.password.length < 8)
            throw new Error(
              'Password must be at least 8 characters and include 1 special character.'
            );
          if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
            setError('Password must include at least one special character.');
            return;
          }
          throw new Error(
            data?.error ||
              data?.message ||
              data?.raw ||
              `Signup failed (${res.status})`
          );
        }
      } else {
        if (!form.password || form.password.length < 8)
          throw new Error(
            'Password must be at least 8 characters and include 1 special character.'
          );
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
          setError('Password must include at least one special character.');
          return;
        }
        setField('first_name', form.first_name);
        setField('last_name', form.last_name);
        setField('phone', form.phone);
      }

      await startStripeCheckout();
    } catch (e) {
      setError(String(e.message || e));
      setLoading(false);
    }
  };

  const onPay = async () => {
    await submitAll();
  };

  return (
    <div style={S.page}>
      <h2 style={S.heading}>Purchase</h2>


      {/* Fields */}
      <div style={S.field}>
        <label htmlFor="first_name" style={S.label}>
          First name
        </label>
        <input
          id="first_name"
          name="first_name"
          style={S.input}
          value={form.first_name}
          onChange={onChange}
          autoComplete="given-name"
        />
      </div>
      <div style={S.field}>
        <label htmlFor="last_name" style={S.label}>
          Last name
        </label>
        <input
          id="last_name"
          name="last_name"
          style={S.input}
          value={form.last_name}
          onChange={onChange}
          autoComplete="family-name"
        />
      </div>
      <div style={S.field}>
        <label htmlFor="phone" style={S.label}>
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          style={S.input}
          value={form.phone}
          onChange={onChange}
          autoComplete="tel"
          inputMode="tel"
        />
      </div>
      <div style={S.field}>
        <label htmlFor="password" style={S.label}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          style={S.input}
          value={form.password}
          onChange={onChange}
          autoComplete="new-password"
          placeholder="8 characters and 1 special (!@#)"
          minLength={8}
        />
      </div>

      {/* Tests */}
      <div style={S.section}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>
          Choose your tests
        </div>

        <label style={S.checkboxRow}>
          <input
            style={{ cursor: 'pointer' }}
            type="checkbox"
            checked={cart.BUNDLE_CORE_APOE}
            onChange={(e) => toggle('BUNDLE_CORE_APOE', e.target.checked)}
          />
          <span style={{ flex: 1 }}>Bundle: Core + ApoE</span>
          <span>{usd(PRICES.BUNDLE_CORE_APOE)}</span>
        </label>

        <label
          style={{ ...S.checkboxRow, opacity: cart.BUNDLE_CORE_APOE ? 0.6 : 1 }}
        >
          <input
            style={{ cursor: 'pointer' }}
            type="checkbox"
            checked={cart.CORE}
            onChange={(e) => toggle('CORE', e.target.checked)}
            disabled={cart.BUNDLE_CORE_APOE}
          />
          <span style={{ flex: 1 }}>Brain Health & Prevention Assessment</span>
          <span>{usd(PRICES.CORE)}</span>
        </label>

        <label
          style={{ ...S.checkboxRow, opacity: cart.BUNDLE_CORE_APOE ? 0.6 : 1 }}
        >
          <input
            style={{ cursor: 'pointer' }}
            type="checkbox"
            checked={cart.APOE}
            onChange={(e) => toggle('APOE', e.target.checked)}
            disabled={cart.BUNDLE_CORE_APOE}
          />
          <span style={{ flex: 1 }}>ApoE Gene Test</span>
          <span>{usd(PRICES.APOE)}</span>
        </label>

        <label style={S.checkboxRow}>
          <input
            style={{ cursor: 'pointer' }}
            type="checkbox"
            checked={cart.NEURO}
            onChange={(e) => toggle('NEURO', e.target.checked)}
          />
          <span style={{ flex: 1 }}>NeuroEval (38 biomarkers)</span>
          <span>{usd(PRICES.NEURO)}</span>
        </label>

        <p style={S.small}>
          NEURO is shown here; enable billing for it in the backend when you’re
          ready.
        </p>
      </div>

      {/* Terms */}
      <div style={{ marginTop: 16 }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <input
            style={{ cursor: 'pointer' }}
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
            </Link>
            .
          </span>
        </label>
      </div>

      {existingAccount && (
        <div style={S.section}>
          You already have an account with {state.email}. We won’t change your
          password—just add these tests after payment.
          <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => resendConfirm(state.email)}
              disabled={resent}
              style={{ textDecoration: 'underline', fontSize: 12 }}
            >
              {resent ? 'Email sent' : 'Resend confirmation email'}
            </button>
          </div>
        </div>
      )}

      {error && <div style={S.error}>{error}</div>}

      <div style={{ marginTop: 16 }}>
        <PaymentForm
          amountLabel={usd(totalCents)}
          disabled={loading}
          onPay={onPay}
        />
        {loading && (
          <p
            style={{
              fontSize: 14,
              color: '#6b7280',
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            Processing…
          </p>
        )}
      </div>

      {/* Order summary */}
      <aside style={S.aside}>
        <div style={S.asideHead}>Order summary</div>
        <div style={S.asideBody}>
          {cart.BUNDLE_CORE_APOE && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0'
              }}
            >
              <span>Bundle: Core + ApoE</span>
              <span>{usd(PRICES.BUNDLE_CORE_APOE)}</span>
            </div>
          )}
          {!cart.BUNDLE_CORE_APOE && cart.CORE && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0'
              }}
            >
              <span>Brain Health & Prevention Assessment</span>
              <span>{usd(PRICES.CORE)}</span>
            </div>
          )}
          {!cart.BUNDLE_CORE_APOE && cart.APOE && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0'
              }}
            >
              <span>ApoE Gene Test</span>
              <span>{usd(PRICES.APOE)}</span>
            </div>
          )}
          {cart.NEURO && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0'
              }}
            >
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
