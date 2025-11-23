import React, { useState } from 'react';
import Card from '../../components/cards/Card';
import './productsPage.css';
import { useSignup } from '../NewCheckoutPages/SignupContext';

const PRODUCTS = [
  {
    key: 'BRAINHEALTH',
    name: 'Brain Health Blueprint',
    tagline: 'Your Personalized Brain Health Experience.',
    amount: 44900,
    priceLabel: '$0 One-Time Purchase',
    summary:
      'Take control of your cognitive future with a comprehensive, science-based approach to brain health.',
    details: [
      { title: 'Brain Health Session', body: 'Private 30–60-minute consult.' },
      {
        title: '25+ Biomarkers',
        body: 'Inflammation, metabolism, nutrients, etc.'
      },
      {
        title: '72-Point Risk Scan',
        body: 'Deep Alzheimer’s-related analysis.'
      },
      {
        title: 'Personalized Risk Report',
        body: 'Clear breakdown, simple format.'
      }
      // { title: 'Risk Reduction Plan', body: 'Customized prevention strategy.' }
    ]
  },
  {
    key: 'DOCTORS_DATA',
    flag: 'doctors_data',
    tagline: 'Your Personalized Doctors Data Test Experience.',
    name: 'Doctors Data Test',
    priceLabel: '$99 One time purchase',
    description: 'Doctors Lab',
    amount: 44900,
    summary:
      'Take control of your cognitive future with a comprehensive, science-based approach to brain health.'
  }
];

const OPTIONAL_ADDONS = [
  {
    key: 'APOE',
    flag: 'apoe',
    name: 'APOE Gene Test',
    priceLabel: '$0',
    description: 'Understand your genetic risk for Alzheimer’s.'
  }
  // {
  //   key: 'DOCTORS_DATA',
  //   flag: 'doctors_data',
  //   name: 'Doctors Data Test',
  //   priceLabel: '$99',
  //   description: 'Doctors Lab'
  // }
];

const usd = (cents) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function ProductsPage() {
  const [loadingKey, setLoadingKey] = useState('');
  const [expandedKey, setExpandedKey] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState({ apoe: false });
  const { state } = useSignup();
  const [email, setEmail] = useState(state.email || '');

  async function createCheckout(flags, product) {
    const baseUrl = window.location.origin;

    const payload = {
      customer_email: email || undefined,
      ...flags,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel-order`,
      meta: {
        source: 'ProductsPage',
        product_key: product.key,
        product_name: product.name,
        apoe_addon: selectedAddons.apoe ? '1' : '0'
      }
    };

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Checkout failed with ${res.status}`);
    }

    const data = await res.json();
    window.location.href = data.url;
  }

  const toggleAddon = (flag) => {
    setSelectedAddons((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  const toggleDetails = (productKey) => {
    setExpandedKey((current) => (current === productKey ? null : productKey));
  };

  const buy = async (productKey) => {
    try {
      if (!email.trim()) {
        alert('Enter your email before continuing.');
        return;
      }

      setLoadingKey(productKey);

      const product = PRODUCTS.find((p) => p.key === productKey);
      if (!product) throw new Error(`Product not found: ${productKey}`);

      const flags = {
        brainhealth: product.key === 'BRAINHEALTH',
        ...(selectedAddons.apoe ? { apoe: true } : {})
      };

      await createCheckout(flags, product);
    } catch (err) {
      alert(err.message || 'Something went wrong');
      setLoadingKey('');
    }
  };

  return (
    <div className="products-page">
      {/* Email (Step 2 requirement) */}
      <section className="products-form">
        <h3>Your Email</h3>
        <p>This email will be used for your receipt and account setup.</p>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </section>

      <section className="products-hero">
        <h1>BetterMindCare — Order Tests</h1>
        <p>Pick a test and proceed to secure Stripe Checkout.</p>
      </section>

      <section className="products-grid">
        {PRODUCTS.map((product) => (
          <Card
            key={product.key}
            className="product-card"
            title={product.name}
            subtitle={product.tagline}
          >
            {product.summary && (
              <p className="product-card__summary">{product.summary}</p>
            )}

            {!!product.details?.length && (
              <div className="product-card__details-block">
                <button
                  type="button"
                  onClick={() => toggleDetails(product.key)}
                  className={`product-card__toggle ${expandedKey === product.key ? 'is-open' : ''}`}
                  aria-expanded={expandedKey === product.key}
                >
                  <span>What’s Included</span>
                  <span className="product-card__caret" aria-hidden="true" />
                </button>

                <div
                  className={`product-card__details ${expandedKey === product.key ? 'is-open' : ''}`}
                >
                  <ul>
                    {product.details.map((item) => (
                      <li key={item.title}>
                        <strong>{item.title}</strong>
                        <span>{item.body}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="product-card__footer">
              <div className="product-card__price">
                {product.priceLabel || usd(product.amount)}
              </div>
              <button
                onClick={() => buy(product.key)}
                disabled={loadingKey === product.key}
                className="btn btn-navy"
              >
                {loadingKey === product.key ? 'Opening…' : 'Buy'}
              </button>
            </div>
          </Card>
        ))}
      </section>

      <section className="products-addons">
        <h3>Optional Add-Ons</h3>

        <ul className="products-addons__list">
          {OPTIONAL_ADDONS.map((addon) => (
            <li key={addon.key} className="products-addons__item">
              <label className="products-addons__name">
                <input
                  type="checkbox"
                  className="products-addons__checkbox"
                  checked={Boolean(selectedAddons[addon.flag])}
                  onChange={() => toggleAddon(addon.flag)}
                />
                <span className="products-addons__title">{addon.name}</span>
                <span className="products-addons__price">
                  {addon.priceLabel}
                </span>
              </label>
              <p className="products-addons__description">
                {addon.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
