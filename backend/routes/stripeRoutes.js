// backend/routes/stripeRoutes.js — LAZY INIT VERSION
const express = require('express');
const Stripe = require('stripe');
const crypto = require('crypto');
const router = express.Router();

const IS_PROD = process.env.NODE_ENV === 'production';
const boolish = (v) => v === true || v === 'true' || v === 1 || v === '1';

const reqEnv = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env ${name}`);
  return v;
};

// ---- lazy Stripe client so import order can’t break us ----
let stripe;
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(reqEnv('STRIPE_SECRET_KEY'));
  }
  return stripe;
}

// Optional allowlist for return URLs
const ALLOWED_RETURN_HOSTS = (process.env.RETURN_URL_HOSTS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

function normalizeUrl(u) {
  if (!u) return '';
  const parsed = new URL(u);
  if (ALLOWED_RETURN_HOSTS.length && !ALLOWED_RETURN_HOSTS.some(h => parsed.hostname.endsWith(h))) {
    throw new Error(`Host not allowed: ${parsed.hostname}`);
  }
  return parsed.toString();
}

// ---- Pricing config (same behavior) ----
const PRICE_IDS = {
  BRAINHEALTH: process.env.STRIPE_PRICE_BRAINHEALTH || '',
  APOE:        process.env.STRIPE_PRICE_APOE        || '',
  PTAU:        process.env.STRIPE_PRICE_PTAU        || '',
};
const AMOUNTS = { BRAINHEALTH: 44900, APOE: 12500, PTAU: 29400 };
const nameMap = {
  BRAINHEALTH: 'Brain Health Blueprint',
  APOE:        'APOE Gene Test',
  PTAU:        'p-Tau217 Alzheimer’s Risk Marker',
};
function lineItemFromKey(key) {
  const priceId = PRICE_IDS[key];
  if (priceId) return { price: priceId, quantity: 1 };
  return {
    price_data: { currency: 'usd', product_data: { name: nameMap[key] || key }, unit_amount: AMOUNTS[key] },
    quantity: 1,
  };
}

// ---- Checkout Session ----
router.post('/checkout', express.json(), async (req, res) => {
  try {
    const s = getStripe(); // env read happens here, not at import-time

    const {
      brainhealth, apoe, ptau,
      customer_email, success_url, cancel_url,
      meta = {},
      patientId: bodyPatientId,
      patientOrderId: bodyPatientOrderId,
      splitApoePtau: bodySplit,
      requireBoth: bodyRequireBoth,
    } = req.body || {};

    const items = [];
    if (brainhealth) items.push(lineItemFromKey('BRAINHEALTH'));
    if (apoe)        items.push(lineItemFromKey('APOE'));
    if (ptau)        items.push(lineItemFromKey('PTAU'));
    if (!items.length) return res.status(400).json({ error: 'No items selected' });
    if (!success_url || !cancel_url) return res.status(400).json({ error: 'success_url and cancel_url required' });

    const successUrlRaw = normalizeUrl(success_url);
    const cancelUrl     = normalizeUrl(cancel_url);

    const resolvedPatientId = bodyPatientId ?? meta.patientId ?? '';
    const resolvedOrderId   = bodyPatientOrderId ?? meta.patientOrderId ?? '';
    if ((process.env.REQUIRE_EVEXIA_IDS || '0') === '1' && (!resolvedPatientId || !resolvedOrderId)) {
      return res.status(400).json({ error: 'Missing Evexia IDs. Include patientId and patientOrderId.' });
    }

    const splitApoePtau = boolish(bodySplit ?? meta.splitApoePtau ?? false);
    const requireBoth   = boolish(bodyRequireBoth ?? meta.requireBoth ?? false);

    const cartSummary = JSON.stringify({ brainhealth: !!brainhealth, apoe: !!apoe, ptau: !!ptau });
    const idemKey = crypto.randomUUID();
    const finalMeta = {
      app: 'BetterMindCare',
      env: IS_PROD ? 'prod' : 'dev',
      ...meta,
      ...(resolvedPatientId ? { patientId: String(resolvedPatientId) } : {}),
      ...(resolvedOrderId   ? { patientOrderId: String(resolvedOrderId) } : {}),
      splitApoePtau: splitApoePtau ? '1' : '0',
      requireBoth:   requireBoth   ? '1' : '0',
      cart: cartSummary,
      idemKey,
    };

    const successUrl = successUrlRaw.includes('{CHECKOUT_SESSION_ID}')
      ? successUrlRaw
      : `${successUrlRaw}${successUrlRaw.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;

    if (!IS_PROD) {
      console.log('[stripe] checkout meta:', finalMeta);
      console.log('[stripe] items:', items);
    }

    const session = await s.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: items,
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customer_email || undefined,
        metadata: finalMeta,
      },
      { idempotencyKey: `checkout:${idemKey}` }
    );

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('[stripe] checkout error:', err);
    res.status(400).json({ error: err.message || 'Stripe error' });
  }
});

// ---- Webhook (must use raw body) ----
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    const whSecret = reqEnv('STRIPE_WEBHOOK_SECRET'); // read when needed
    event = Stripe.webhooks.constructEvent(req.body, sig, whSecret);
  } catch (e) {
    console.error('[stripe] bad webhook signature:', e.message);
    return res.status(400).end();
  }

  if (!IS_PROD) console.log('[stripe] webhook event:', event.type);

  try {
    // TODO: your existing business logic...
  } catch (e) {
    console.error('[stripe] webhook handler error:', e);
  }

  res.status(200).end();
});

module.exports = router;