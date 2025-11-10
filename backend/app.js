require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const initKnex = require('../backend/db/initKnex');
const Stripe = require('stripe');
const stripeRoutes = require('./routes/stripeRoutes');
const evexiaWebhookRoutes = require('./routes/evexiaWebhookRoutes');
// Start the Evexia worker
require('./workers/evexiaWorker');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';

// Trust proxy for HTTPS
app.set('trust proxy', 1);

// ---- Base middleware ----
app.use(cookieParser());

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
      secure: IS_PROD,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 4
    }
  })
);

// ---- CORS ----
app.use((_, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});
const DEV_FRONTEND_ORIGIN = process.env.DEV_FRONTEND_ORIGIN || 'https://localhost:3000';
app.use(
  cors({
    origin: DEV_FRONTEND_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204
  })
);
console.log(`CORS: allowing ${DEV_FRONTEND_ORIGIN}`);

// ---- Health check ----
app.get('/', (_req, res) => res.send('Hello HTTPS!'));
app.get('/api/health', (_req, res) => res.send('ok'));

// ---- ✅ Stripe webhook FIRST (raw body, isolated) ----
const stripeKey =
  process.env.NODE_ENV === 'production'
    ? process.env.STRIPE_SECRET_KEY_LIVE
    : process.env.STRIPE_SECRET_KEY_LOCAL;

console.log('[stripe] NODE_ENV:', process.env.NODE_ENV);
console.log(
  '[stripe] STRIPE_SECRET_KEY_LOCAL:',
  process.env.STRIPE_SECRET_KEY_LOCAL ? '✅ set' : '❌ missing'
);
console.log(
  '[stripe] STRIPE_SECRET_KEY_LIVE:',
  process.env.STRIPE_SECRET_KEY_LIVE ? '✅ set' : '❌ missing'
);
console.log('[stripe] Using key:', stripeKey ? stripeKey.slice(0, 8) + '...' : '❌ undefined');

if (!stripeKey) {
  throw new Error(
    'Stripe secret key missing — check STRIPE_SECRET_KEY_LOCAL / STRIPE_SECRET_KEY_LIVE'
  );
}

const stripe = new Stripe(stripeKey);

// ✅ Webhook route — must come BEFORE express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const knex = await initKnex();
    const sig = req.headers['stripe-signature'];
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
    console.log('[webhook] ✅ Verified event:', event.type);

    // Handle completed checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('[webhook] checkout.session.completed fired:', session.id);

      const insertData = {
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
        product_key: session.metadata?.productKey || '',
        amount: session.amount_total / 100,
        currency: session.currency,
        status: session.payment_status || 'unknown',
        metadata: JSON.stringify(session.metadata || {}),
        evexia_processed: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      if (session.metadata?.user_id && session.metadata.user_id !== 'null') {
        insertData.user_id = session.metadata.user_id;
      }

      await knex('stripe_payments').insert(insertData);
      console.log('[webhook] ✅ Inserted payment (session.completed):', session.id);
    }

    // Handle charge succeeded / updated (contains billing + shipping info)
    if (event.type === 'charge.succeeded' || event.type === 'charge.updated') {
      const charge = event.data.object;
      console.log('[webhook] charge event received:', charge.id);

      const billing = charge.billing_details || {};
      const shipping = charge.shipping || {};

      const customerData = {
        billing_name: billing.name || '',
        billing_email: billing.email || '',
        billing_phone: billing.phone || '',
        billing_address: billing.address || {},
        shipping_name: shipping.name || '',
        shipping_phone: shipping.phone || '',
        shipping_address: shipping.address || {}
      };

      // Update existing payment record using the payment_intent
      if (charge.payment_intent) {
        await knex('stripe_payments')
          .where({ stripe_payment_intent_id: charge.payment_intent })
          .update({
            metadata: knex.raw(
              "metadata || ?::jsonb",
              JSON.stringify({ customer: customerData })
            ),
            updated_at: new Date()
          });
        console.log('[webhook] ✅ Updated metadata with billing/shipping for intent', charge.payment_intent);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[webhook] ❌ Failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
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
