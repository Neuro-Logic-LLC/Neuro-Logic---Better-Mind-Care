import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Checkout.css';

const CATALOG = [
  { key: 'APOE', name: 'ApoE Genetic Test', amount: 12500 },
  { key: 'PTAU', name: 'p-Tau217 Alzheimer’s biomarker', amount: 30900 },
  { key: 'DOCTORS_DATA', name: 'Doctors Data Test', amount: 9900 }
];

const usd = (cents) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function computeTotal(c) {
  return (
    (c.APOE ? 12500 : 0) + (c.PTAU ? 30900 : 0) + (c.DOCTORS_DATA ? 9900 : 0)
  );
}

function ProductRow({ item, selected, onToggle }) {
  return (
    <label className={`item-row ${selected ? 'selected' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onToggle(item.key, e.target.checked)}
      />
      <div className="item-info">
        <span className="item-title">{item.name}</span>
        <span className="item-price">{usd(item.amount)}</span>
      </div>
    </label>
  );
}

export default function CheckoutPage() {
  const [cart, setCart] = useState({
    APOE: false,
    PTAU: false,
    DOCTORS_DATA: false
  });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = computeTotal(cart);
  const requireBoth = false;

  function toggle(key, val) {
    setCart((prev) => ({ ...prev, [key]: val }));
  }

  async function handleCheckout() {
    setLoading(true);
    setError('');
    try {
      const hasAny = cart.APOE || cart.PTAU || cart.DOCTORS_DATA;
      if (!hasAny) throw new Error('Pick at least one item');

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Invalid email');
      }

      const selApoe = Boolean(cart.APOE);
      const selPtau = Boolean(cart.PTAU);
      const selDoctors = Boolean(cart.DOCTORS_DATA);
      const patientId = sessionStorage.getItem('evx_patientId') || undefined;
      const patientOrderId =
        sessionStorage.getItem('evx_patientOrderId') || undefined;

      const baseUrl = window.location.origin;

      const baseMeta = {
        source: 'frontend-pages',
        productKey: selApoe ? 'APOE' : selPtau ? 'PTAU' : 'MIXED',
        ...(patientId ? { patientId: String(patientId) } : {}),
        ...(patientOrderId ? { patientOrderId: String(patientOrderId) } : {})
      };

      const body = {
        ui_apoe: cart.APOE,
        ui_ptau: cart.PTAU,
        ui_doctors_data: cart.DOCTORS_DATA,

        apoe: selApoe,
        ptau: selPtau,
        doctors_data: selDoctors,

        requireBoth,
        customer_email: email || undefined,
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cancel-order`,
        meta: { ...baseMeta, requireBoth }
      };

      const res = await fetch(`${baseUrl}/stripe/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text || 'Bad server response');
      }

      if (!res.ok)
        throw new Error(data.error || `Checkout failed with ${res.status}`);
      if (!data?.url) throw new Error('No redirect URL from server');

      window.location.href = data.url;
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="max-w-4xl mx-auto" style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">BetterMindCare Checkout</h1>
        <Link className="text-sm underline" to="/success" title="Preview success">
          Preview success
        </Link>
      </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {CATALOG.map((item) => (
              <ProductRow
                key={item.key}
                item={item}
                selected={cart[item.key]}
                onToggle={toggle}
              />
            ))}
          </div>

        <aside className="md:col-span-1 p-4 rounded-2xl border border-gray-200 shadow-sm h-fit text-center">
          <h2 className="text-lg font-semibold mb-4">Order</h2>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-gray-700">Email (optional for receipt)</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
              />
            </label>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{usd(total)}</span>
              </div>

              {error && (
                <div
                  aria-live="polite"
                  className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-2"
                >
                  {error}
                </div>
              )}

              <PrimaryButton
                onClick={handleCheckout}
                disabled={loading || total === 0}
                className="w-full checkout-btn"
              >
                {loading ? 'Starting checkout...' : 'Pay with Stripe'}
              </PrimaryButton>

            <p className="text-xs text-gray-600">
              You will be redirected to Stripe Checkout.
            </p>
          </div>
        </aside>
      </div>
    </div>
    </div>
  );
}
