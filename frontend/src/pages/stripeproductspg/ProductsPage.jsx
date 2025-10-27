import React, { useState } from 'react';
import Card from '../../components/cards/Card';
import './productsPage.css';

const PRODUCTS = [
  {
    key: 'BRAINHEALTH',
    name: 'Brain Health Blueprint',
    tagline: 'Your Personalized Brain Health Experience.',
    amount: 44900,
    priceLabel: '$449 One-Time Purchase',
    summary:
      'Take control of your cognitive future with a comprehensive, science-based approach to brain health.',
    details: [
      {
        title: 'Brain Health Session',
        body: 'Private 30–60-minute consult to explore your brain health risks, lifestyle, and goals.'
      },
      {
        title: '25+ Biomarker Lab Panel',
        body: 'Blood test covering your inflammation, metabolism, key nutrients, hormones, and other factors tied to Alzheimer’s risk and brain performance.'
      },
      {
        title: '72-Point Cognitive Risk Scan',
        body: 'Deep analysis of your Alzheimer’s-related risk factors — across genetic, vascular, metabolic, medications, toxicity and lifestyle domains.'
      },
      {
        title: 'Personalized Risk Report',
        body: 'Clear breakdown of your brain health status and what’s driving risk — delivered in a simple, actionable format.'
      },
      {
        title: 'Risk Reduction Plan',
        body: 'Your customized strategy to help slow, stop, or reverse key drivers of cognitive decline.'
      }
    ]
  },
  // {
  //   key: 'APOE',
  //   name: 'APOE Gene Test',
  //   tagline: 'Understand your genetic risk for Alzheimer’s.',
  //   amount: 12500,
  //   summary:
  //     'Genetic insight to tailor your prevention strategy with precision.',
  //   details: [
  //     {
  //       title: 'DNA-Based Guidance',
  //       body: 'Gain clarity on your APOE status so you can personalize nutrition, lifestyle, and clinical follow-up with confidence.'
  //     }
  //   ]
  // },
  // {
  //   key: 'PTAU',
  //   name: 'p-Tau217 Alzheimer’s Risk Marker',
  //   tagline: 'Detect early Alzheimer’s-related brain changes.',
  //   amount: 29400,
  //   summary:
  //     'Advanced blood test that closely mirrors PET scan findings for early detection.',
  //   details: [
  //     {
  //       title: 'Leading Indicator',
  //       body: 'Measure a highly specific biomarker tied to amyloid and tau accumulation so you can monitor changes years before symptoms appear.'
  //     }
  //   ]
  // }
];

const OPTIONAL_ADDONS = [
  {
    key: 'APOE',
    flag: 'apoe',
    name: 'APOE Gene Test',
    priceLabel: '$0',
    description:
      'Understand your genetic risk for Alzheimer’s and tailor your prevention strategy accordingly.'
  },
  // {
  //   key: 'PTAU',
  //   flag: 'ptau',
  //   name: 'p-Tau217 Alzheimer’s Risk Marker',
  //   priceLabel: '$294',
  //   description:
  //     'Advanced blood test to detect early Alzheimer’s-related brain changes — shown in research to align up to 90% with PET scans.'
  // }
];

const usd = (cents) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

async function createCheckout(flags) {
  const baseUrl = window.location.origin;
  const success_url = `${baseUrl}/success`;
  const cancel_url = `${baseUrl}/cancel-order`;

  // If you have an email/user/order in app state, add it to metadata here
  const meta = { source: 'ProductsPage' };

  const res = await fetch('api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      // flags map directly to your backend expected keys
      ...flags,
      success_url,
      cancel_url,
      // Provide customer_email if you have it; otherwise omit
      customer_email: undefined,
      meta
    })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Checkout failed with ${res.status}`);
  }

  const data = await res.json();
  if (!data?.url) throw new Error('No redirect URL from server');
  window.location.href = data.url;
}

export default function ProductsPage() {
  const [loadingKey, setLoadingKey] = useState('');
  const [expandedKey, setExpandedKey] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState({
    apoe: false,
    ptau: false
  });

  const toggleDetails = (productKey) => {
    setExpandedKey((current) => (current === productKey ? null : productKey));
  };

  const toggleAddon = (flag) => {
    setSelectedAddons((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  // map product to request flags your backend expects
  const buy = async (productKey) => {
    try {
      setLoadingKey(productKey);

      // Flags expected by your /api/stripe/checkout route
      // CORE, NEURO, APOE, PTAU, BUNDLE_CORE_APOE
      switch (productKey) {
        case 'BRAINHEALTH':
          await createCheckout({
            brainhealth: true,
            ...(selectedAddons.apoe ? { apoe: true } : {}),
            ...(selectedAddons.ptau ? { ptau: true } : {})
          });
          break;
        case 'APOE':
          await createCheckout({ apoe: true });
          break;
        case 'PTAU':
          await createCheckout({ ptau: true });
          break;
        default:
          throw new Error('Unknown product');
      }
    } catch (e) {
      alert(e.message || 'Something went wrong');
      setLoadingKey('');
    }
  };

  return (
    <div className="products-page">
      <section className="products-hero">
        <h1>BetterMindCare — Order Tests</h1>
        <p>Pick a test and you’ll be taken to secure Stripe Checkout to pay.</p>
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
                  className={`product-card__toggle ${
                    expandedKey === product.key ? 'is-open' : ''
                  }`}
                  aria-expanded={expandedKey === product.key}
                >
                  <span>What’s Included</span>
                  <span className="product-card__caret" aria-hidden="true" />
                </button>

                <div
                  className={`product-card__details ${
                    expandedKey === product.key ? 'is-open' : ''
                  }`}
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
        <p>
          Select one or more add-ons with the Brain Health Blueprint to
          customize your package. Add-ons are only available alongside the core
          product.
        </p>

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
