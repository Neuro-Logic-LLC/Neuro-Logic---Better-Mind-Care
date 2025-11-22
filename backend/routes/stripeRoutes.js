const initKnex = require('../db/initKnex');
const runEvexiaSequence = require('./evexiaRoutes');
const evexiaQueue = require('../queues/EvexiaQueue');
// backend/routes/stripeRoutes.js — LAZY INIT VERSION
const express = require('express');
const Stripe = require('stripe');
const crypto = require('crypto');
const router = express.Router();

const IS_PROD = process.env.NODE_ENV === 'production';
const boolish = v => v === true || v === 'true' || v === 1 || v === '1';

const reqEnv = name => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env ${name}`);
  return v;
};

const pickBaseUrl = () =>
  pickEnv('EVEXIA_BASE', 'EVEXIA_API_BASE_URL', 'EVEXIA_SANDBOX_API_BASE_URL') ||
  'https://int.evexiadiagnostics.com';

// ---- lazy Stripe client so import order can’t break us ----
let stripe;
const stripeKey = process.env.STRIPE_SECRET_KEY;

function getStripe() {
  if (!stripe) {
    stripe = new new Stripe(stripeKey)
  }
  return stripe;
}

// Optional allowlist for return URLs
const ALLOWED_RETURN_HOSTS = (process.env.RETURN_URL_HOSTS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

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
  APOE: process.env.STRIPE_PRICE_APOE || '',
  PTAU: process.env.STRIPE_PRICE_PTAU || ''
};
const AMOUNTS = { BRAINHEALTH: 44900, APOE: 12500, PTAU: 29400 };
const nameMap = {
  BRAINHEALTH: 'Brain Health Blueprint',
  APOE: 'APOE Gene Test',
  PTAU: 'p-Tau217 Alzheimer’s Risk Marker'
};
function lineItemFromKey(key) {
  const priceId = PRICE_IDS[key];
  if (priceId) return { price: priceId, quantity: 1 };
  return {
    price_data: {
      currency: 'usd',
      product_data: { name: nameMap[key] || key },
      unit_amount: AMOUNTS[key]
    },
    quantity: 1
  };
}

// ---- Checkout Session ----
router.post('/checkout', express.json(), async (req, res) => {
  try {
    const s = getStripe(); // env read happens here, not at import-time

    const {
      brainhealth,
      apoe,
      ptau,
      customer_email,
      customer_first_name,
      customer_last_name,
      customer_phone,
      success_url,
      cancel_url,
      meta = {},
      patientId: bodyPatientId,
      patientOrderId: bodyPatientOrderId,
      splitApoePtau: bodySplit,
      requireBoth: bodyRequireBoth
    } = req.body || {};

    const items = [];
    if (brainhealth) items.push(lineItemFromKey('BRAINHEALTH'));
    if (apoe) items.push(lineItemFromKey('APOE'));
    if (ptau) items.push(lineItemFromKey('PTAU'));
    if (!items.length) return res.status(400).json({ error: 'No items selected' });
    if (!success_url || !cancel_url)
      return res.status(400).json({ error: 'success_url and cancel_url required' });

    const successUrlRaw = normalizeUrl(success_url);
    const cancelUrl = normalizeUrl(cancel_url);

    const resolvedPatientId = bodyPatientId ?? meta.patientId ?? '';
    const resolvedOrderId = bodyPatientOrderId ?? meta.patientOrderId ?? '';
    if (
      (process.env.REQUIRE_EVEXIA_IDS || '0') === '1' &&
      (!resolvedPatientId || !resolvedOrderId)
    ) {
      return res
        .status(400)
        .json({ error: 'Missing Evexia IDs. Include patientId and patientOrderId.' });
    }

    const splitApoePtau = boolish(bodySplit ?? meta.splitApoePtau ?? false);
    const requireBoth = boolish(bodyRequireBoth ?? meta.requireBoth ?? false);

    const cartSummary = JSON.stringify({ brainhealth: !!brainhealth, apoe: !!apoe, ptau: !!ptau });
    const idemKey = crypto.randomUUID();

    const finalMeta = {
      app: 'BetterMindCare',
      env: IS_PROD ? 'prod' : 'dev',
      ...meta,
      // Add Evexia patient fields here
      FirstName: req.body.customer_first_name ?? meta.FirstName,
      LastName: req.body.customer_last_name ?? meta.LastName,
      DOB: req.body.DOB ?? meta.DOB,
      join_email: req.body.EmailAddress ?? meta.EmailAddress,
      Gender: req.body.Gender ?? meta.Gender,
      EmailAddress: req.body.EmailAddress ?? meta.EmailAddress,
      StreetAddress: req.body.StreetAddress ?? meta.StreetAddress,
      City: req.body.City ?? meta.City,
      State: req.body.State ?? meta.State,
      PostalCode: req.body.PostalCode ?? meta.PostalCode,
      Phone: req.body.Phone ?? meta.Phone,
      ...(resolvedPatientId ? { patientId: String(resolvedPatientId) } : {}),
      ...(resolvedOrderId ? { patientOrderId: String(resolvedOrderId) } : {}),
      splitApoePtau: splitApoePtau ? '1' : '0',
      requireBoth: requireBoth ? '1' : '0',
      cart: cartSummary,
      idemKey
    };

    const successUrl = successUrlRaw.includes('{CHECKOUT_SESSION_ID}')
      ? successUrlRaw
      : `${successUrlRaw}${
          successUrlRaw.includes('?') ? '&' : '?'
        }session_id={CHECKOUT_SESSION_ID}`;

    if (!IS_PROD) {
      console.log('[stripe] checkout meta:', finalMeta);
      console.log('[stripe] items:', items);
    }

    const session = await s.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: items,
      success_url: successUrl,
      cancel_url: cancelUrl,

      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },

      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Standard Shipping'
          }
        }
      ],

      customer_creation: 'always',
      expand: ['customer_details', 'shipping'],

      customer_email: customer_email || undefined,

      // ONLY metadata — nothing else
      metadata: finalMeta
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('[stripe] checkout error:', err);
    res.status(400).json({ error: err.message || 'Stripe error' });
  }
});

// --------------------------------------------
//  CREATE SETUP INTENT (collect card but DO NOT charge)
// --------------------------------------------
router.post('/stripe-payment-intent', express.json(), async (req, res) => {
  try {
    const s = getStripe();

    // DEBUG LOG: show which secret key prefix is being used
    console.log('[stripe] secret key prefix:', (process.env.STRIPE_SECRET_KEY || '').slice(0, 8));

    const { email, meta = {} } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });

    // 1. Find or create customer
    const existing = await s.customers.list({ email, limit: 1 });

    let customer;
    if (existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await s.customers.create({
        email,
        metadata: {
          app: 'BetterMindCare',
          env: IS_PROD ? 'prod' : 'dev',
          ...meta
        }
      });
    }

    // 2. Check for existing usable SetupIntent
    const existingIntents = await s.setupIntents.list({
      customer: customer.id,
      limit: 1
    });

    let setupIntent = null;

    if (existingIntents.data.length > 0) {
      const intent = existingIntents.data[0];

      // Reusable if still in a "requires" state
      if (['requires_payment_method', 'requires_confirmation'].includes(intent.status)) {
        setupIntent = intent;
      }
    }

    // 3. If no reusable one, create a *new* modern SetupIntent
    if (!setupIntent) {
      setupIntent = await s.setupIntents.create({
        customer: customer.id,
        usage: 'off_session',
        confirm: false,
        automatic_payment_methods: { enabled: true },
        metadata: { app: 'BetterMindCare', env: IS_PROD ? 'prod' : 'dev', ...meta }
      });
    }

    // DEBUG LOG: intent id and client_secret (don’t log secrets in production)
    console.log('[stripe] setupIntent.id:', setupIntent.id);
    console.log(
      '[stripe] setupIntent.client_secret (prefix):',
      (setupIntent.client_secret || '').slice(0, 10)
    );

    res.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id
    });
  } catch (err) {
    console.error('[stripe] setup-intent error:', err);
    res.status(400).json({ error: err.message || 'Stripe error' });
  }
});

// --------------------------------------------
//  CHARGE AFTER SETUP — RUN AFTER STEP THREE
// --------------------------------------------
router.post('/charge-after-setup', express.json(), async (req, res) => {
  try {
    const s = getStripe();

    const { customerId, paymentMethod, amountCents, meta = {} } = req.body || {};

    if (!customerId) return res.status(400).json({ error: 'customerId required' });
    if (!paymentMethod) return res.status(400).json({ error: 'paymentMethod required' });
    if (!amountCents) return res.status(400).json({ error: 'amountCents required' });

    // This metadata folds into your standard approach
    const finalMeta = {
      app: 'BetterMindCare',
      env: IS_PROD ? 'prod' : 'dev',
      ...meta
    };

    const paymentIntent = await s.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethod,
      confirm: true, // <-- actual charge
      off_session: true, // <-- user doesn't re-enter card
      metadata: finalMeta
    });

    res.json({
      success: true,
      paymentIntent
    });
  } catch (err) {
    console.error('[stripe] charge-after-setup error:', err);
    res.status(400).json({ error: err.message || 'Payment failed' });
  }
});

module.exports = router;
