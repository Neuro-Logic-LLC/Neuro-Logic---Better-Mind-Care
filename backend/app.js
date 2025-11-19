const params = require('./utils/loadSSMParams');

// load SSM params (don't block module loading). Log failures.
params().catch(err => console.error('[loadSSMParams] failed:', err));

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const initKnex = require('./db/initKnex');
const Stripe = require('stripe');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';

// Trust proxy for HTTPS
app.set('trust proxy', 1);

const stripeRoutes = require('./routes/stripeRoutes');
const evexiaWebhookRoutes = require('./routes/evexiaWebhookRoutes');

// ---- HTTPS session setup ----
if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET missing before session()');
app.use(
  session({
    name: process.env.SESSION_COOKIE_NAME || 'bmc_jwt',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 1000 * 60 * 60 * 4
    }
  })
);

// ---- Base middleware ----
app.use(cookieParser());
// ---- CORS ----
app.use((_, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});
const DEV_FRONTEND_ORIGIN = process.env.DEV_FRONTEND_ORIGIN || 'https://localhost:3000';
const PROD_FRONTEND_ORIGIN = 'https://staging.bettermindcare.com';

app.use(
  cors({
    origin: [
      'https://staging.bettermindcare.com',
      'https://localhost:3000' // if you still want dev
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204
  })
);
console.log(`CORS: allowing ${PROD_FRONTEND_ORIGIN}`);

// ---- Health check ----
app.get('/', (_req, res) => res.send('Hello HTTPS!'));
app.get('/api/health', (_req, res) => res.send('ok'));

// ---- ✅ Stripe webhook FIRST (raw body, isolated) ----

const stripeKey = process.env.STRIPE_SECRET_KEY;

console.log('[stripe] NODE_ENV:', process.env.NODE_ENV);
console.log(
  '[stripe] STRIPE_SECRET_KEY_LOCAL:',
  process.env.STRIPE_SECRET_KEY ? '✅ set' : '❌ missing'
);
console.log(
  '[stripe] STRIPE_SECRET_KEY_LIVE:',
  process.env.STRIPE_SECRET_KEY ? '✅ set' : '❌ missing'
);
console.log('[stripe] Using key:', stripeKey ? stripeKey.slice(0, 8) + '...' : '❌ undefined');

if (!stripeKey) {
  throw new Error(
    'Stripe secret key missing — check STRIPE_SECRET_KEY_LOCAL / STRIPE_SECRET_KEY_LIVE'
  );
}

const stripe = new Stripe(stripeKey, {
  apiVersion: '2025-09-30.clover'
});

function splitName(full) {
  if (!full) return { first: null, last: null };
  const parts = full.trim().split(' ');
  return {
    first: parts.shift(),
    last: parts.join(' ') || null
  };
}

// ✅ Webhook route — must come BEFORE express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const knex = await initKnex();
    const sig = req.headers['stripe-signature'];
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
    console.log('[webhook] Verified:', event.type);

    // ----------------------------------------------------
    // Helper: split name safely
    // ----------------------------------------------------
    const splitName = full => {
      if (!full) return { first: null, last: null };
      const parts = full.trim().split(/\s+/);
      return {
        first: parts[0] || null,
        last: parts.length > 1 ? parts.slice(1).join(' ') : null
      };
    };

    // ====================================================
    // 1. CHECKOUT SESSION COMPLETED
    // ====================================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      const customerDetails = session.customer_details || {};
      const shipping = session.shipping || {};

      // Determine customer name + phone
      const name = customerDetails.name || shipping?.name || null;

      const phone = customerDetails.phone || shipping?.phone || null;

      const { first, last } = splitName(name);

      // Build shipping block
      const shippingInfo = {
        name: shipping.name || customerDetails.name || null,
        phone: shipping.phone || customerDetails.phone || null,
        address: {
          line1: shipping.address?.line1 || customerDetails.address?.line1 || null,
          line2: shipping.address?.line2 || customerDetails.address?.line2 || null,
          city: shipping.address?.city || customerDetails.address?.city || null,
          state: shipping.address?.state || customerDetails.address?.state || null,
          postal_code:
            shipping.address?.postal_code || customerDetails.address?.postal_code || null,
          country: shipping.address?.country || customerDetails.address?.country || null
        }
      };

      const email = customerDetails.email || session.customer_email || shipping.email || null;

      // Insert payment row
      await knex('stripe_payments').insert({
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
        product_key: session.metadata?.product_key || session.metadata?.productKey || '',
        amount: session.amount_total / 100,
        currency: session.currency,
        status: session.payment_status || 'unknown',
        customer_email: email,

        customer_first_name: name ? first : null,
        customer_last_name: name ? last : null,
        customer_phone: phone,

        shipping_address: JSON.stringify(shippingInfo.address),
        shipping_name: shippingInfo.name,
        shipping_phone: shippingInfo.phone,

        metadata: JSON.stringify(session.metadata || {}),
        evexia_processed: false,
        user_id: null, // updated later in charge.succeeded
        created_at: new Date(),
        updated_at: new Date()
      });

      console.log('[webhook] checkout.session completed inserted');
    }

    // ====================================================
    // 2. CHARGE SUCCEEDED — REAL PAYMENT
    // ====================================================
    if (event.type === 'charge.succeeded') {
      const charge = event.data.object;

      const email =
        charge.billing_details?.email ||
        charge.receipt_email ||
        charge.metadata?.EmailAddress ||
        null;

      if (!email) {
        console.log('[webhook] No email on charge.succeeded');
        return res.sendStatus(200);
      }

      if (!charge.paid || charge.status !== 'succeeded') {
        console.log('[webhook] Charge not paid; skipping');
        return res.sendStatus(200);
      }

      // Normalize email
      const email_canon = email.toLowerCase();

      // Try linking to user
      let userId = null;
      const user = await knex('users').where({ email_canon }).first();
      if (user) {
        userId = user.id;
        await knex('users')
          .where({ id: userId })
          .update({ has_paid: true, updated_at: new Date() });

        console.log('[webhook] Linked charge to user', userId);
      }

      // Split billing name
      const { first, last } = splitName(charge.billing_details?.name);

      // Update payment row
      await knex('stripe_payments')
        .where({ stripe_payment_intent_id: charge.payment_intent })
        .update({
          user_id: userId,
          customer_email: email,
          customer_first_name: first,
          customer_last_name: last,
          customer_phone: charge.billing_details?.phone || null,
          paid_at: new Date(),
          updated_at: new Date(),
          metadata: knex.raw(
            'metadata || ?::jsonb',
            JSON.stringify({
              billing_email: email,
              paid: true
            })
          )
        });

      console.log('[webhook] Payment updated:', charge.payment_intent);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('[webhook] FAILED:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// ---- Global parsers (after webhook only) ----
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- Other routers ----
app.use('/api/stripe', stripeRoutes); // checkout route
app.use('/api/evexia', require('./routes/evexiaRoutes'));
app.use('/api/evexia-webhook', evexiaWebhookRoutes);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/google-calendar', require('./routes/googleCalendarRoutes'));
app.use('/api/intake', require('./routes/intakeRoutes'));
app.use('/api/oauth', require('./routes/oauthRoutes'));
app.use('/api/evexia-import', require('./routes/evexiaImportRoutes'));

// ---- Static files ----

if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In development, just skip static serving
  app.get('/', (_req, res) => res.send('API running in development mode'));
}

// ---- Error handler ----
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

module.exports = app;
