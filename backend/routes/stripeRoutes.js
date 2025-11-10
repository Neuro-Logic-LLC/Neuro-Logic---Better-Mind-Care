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
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(reqEnv('STRIPE_SECRET_KEY'));
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
      FirstName: req.body.FirstName ?? meta.FirstName,
      LastName: req.body.LastName ?? meta.LastName,
      DOB: req.body.DOB ?? meta.DOB,
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

      // ✅ Force Stripe to ask for name, email, phone, and address
      billing_address_collection: 'required',
      customer_creation: 'always',
      phone_number_collection: { enabled: true },
      shipping_address_collection: { allowed_countries: ['US'] },

      // ✅ Ensures we have a customer record for webhook retrieval
      customer_email: customer_email || undefined,

      // ✅ Keep your custom metadata
      metadata: finalMeta
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('[stripe] checkout error:', err);
    res.status(400).json({ error: err.message || 'Stripe error' });
  }
});
// ---- Webhook (must use raw body) ----
// router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//   let event;
//   try {
//     const sig = req.headers['stripe-signature'];
//     const whSecret = reqEnv('STRIPE_WEBHOOK_SECRET'); // read when needed
//     event = Stripe.webhooks.constructEvent(req.body, sig, whSecret);
//   } catch (e) {
//     console.error('[stripe] bad webhook signature:', e.message);
//     return res.status(400).end();
//   }

//   if (!IS_PROD) console.log('[stripe] webhook event:', event.type);

//   try {
//     // TODO: your existing business logic...
//   } catch (e) {
//     console.error('[stripe] webhook handler error:', e);
//   }

//   res.status(200).end();
// });

// router.post(
//   '/webhook',
//   express.raw({ type: 'application/json' }),
//   async (req, res) => {
//     let event;

//     try {
//       const sig = req.headers['stripe-signature'];
//       const whSecret = reqEnv('STRIPE_WEBHOOK_SECRET');
//       const s = getStripe();

//       // Stripe expects raw buffer here
//       event = s.webhooks.constructEvent(req.body, sig, whSecret);
//     } catch (err) {
//       console.error('[stripe] bad webhook signature:', err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     if (!IS_PROD) console.log('[stripe] webhook event:', event.type);

//     try {
//       if (event.type === 'checkout.session.completed') {
//         const session = event.data.object;
//         const s = getStripe();
//         const customer = await s.customers.retrieve(session.customer, {
//           expand: ['address']
//         });

//         const patientData = {
//           FirstName: customer.name?.split(' ')[0] || '',
//           LastName: customer.name?.split(' ').slice(1).join(' ') || '',
//           EmailAddress: customer.email || '',
//           Phone: customer.phone || '',
//           StreetAddress: customer.address?.line1 || '',
//           City: customer.address?.city || '',
//           State: customer.address?.state || '',
//           PostalCode: customer.address?.postal_code || '',
//           DOB: session.metadata?.DOB || '',
//           Gender: session.metadata?.Gender || ''
//         };

//         console.log('[stripe webhook] Patient data from Stripe:', patientData);

//         // Send to Evexia
//         const EVX_BASE = pickBaseUrl();
//         await fetch(`${EVX_BASE}/api/evexia/patient-add`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify(patientData)
//         });

//         console.log('[stripe webhook] Sent to Evexia:', patientData);

//         // ✅ Save to DB
//         try {
//           const knex = require('../db/knex'); // adjust path if needed
//           await knex('stripe_payments').insert({
//             stripe_session_id: session.id,
//             stripe_payment_intent_id: session.payment_intent || null,
//             user_id: session.metadata?.user_id || null,
//             product_key: session.metadata?.productKey || '',
//             amount: session.amount_total / 100,
//             currency: session.currency,
//             status: session.payment_status || 'unknown',
//             metadata: JSON.stringify(patientData),
//             evexia_processed: false,
//             created_at: new Date(),
//             updated_at: new Date()
//           });
//           console.log('[stripe webhook] Saved payment in DB');
//         } catch (dbErr) {
//           console.error('[stripe webhook] DB insert failed:', dbErr);
//         }
//       }
//     } catch (err) {
//       console.error('[stripe webhook] error:', err);
//     }

//     res.status(200).end();
//   }
// );
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;

    try {
      const sig = req.headers['stripe-signature'];
      const whSecret = reqEnv('STRIPE_WEBHOOK_SECRET');
      const s = getStripe();
      event = s.webhooks.constructEvent(req.body, sig, whSecret);
    } catch (err) {
      console.error('[stripe] bad webhook signature:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (!IS_PROD) console.log('[stripe] webhook event:', event.type);

    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const s = getStripe();
        const customer = await s.customers.retrieve(session.customer, {
          expand: ['address']
        });

        const patientData = {
          FirstName: customer.name?.split(' ')[0] || '',
          LastName: customer.name?.split(' ').slice(1).join(' ') || '',
          EmailAddress: customer.email || '',
          Phone: customer.phone || '',
          StreetAddress: customer.address?.line1 || '',
          City: customer.address?.city || '',
          State: customer.address?.state || '',
          PostalCode: customer.address?.postal_code || '',
          DOB: session.metadata?.DOB || '',
          Gender: session.metadata?.Gender || '',
          // Add cart info for order placement
          cart: JSON.parse(session.metadata?.cart || '{}'),
          splitApoePtau: session.metadata?.splitApoePtau === '1',
          requireBoth: session.metadata?.requireBoth === '1'
        };

        console.log('[stripe webhook] Patient data from Stripe:', patientData);

        // ✅ Save to DB
        let paymentId;
        try {
          const knex = await initKnex();
          const inserted = await knex('stripe_payments').insert({
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent || null,
            user_id: session.metadata?.user_id || null,
            product_key: session.metadata?.productKey || '',
            amount: session.amount_total / 100,
            currency: session.currency,
            status: session.payment_status || 'unknown',
            metadata: JSON.stringify(patientData),
            evexia_processed: false,
            created_at: new Date(),
            updated_at: new Date()
          }).returning('id');
          paymentId = inserted[0]?.id;
          console.log('[stripe webhook] Saved payment in DB, ID:', paymentId);
        } catch (dbErr) {
          console.error('[stripe webhook] DB insert failed:', dbErr);
          return res.status(500).end();
        }

        // ✅ Add to Evexia queue for processing
        try {
          await evexiaQueue.add('processOrder', { patientData, paymentId });
          console.log('[stripe webhook] Added to Evexia queue');
        } catch (queueErr) {
          console.error('[stripe webhook] Queue add failed:', queueErr);
        }
      }
    } catch (err) {
      console.error('[stripe webhook] error:', err);
    }

    res.status(200).end();
  }
);

module.exports = router;
