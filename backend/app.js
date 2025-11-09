require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const knex = require('../backend/db/initKnex');
const Stripe = require('stripe');
const stripeRoutes = require('./routes/stripeRoutes');
const evexiaWebhookRoutes = require('./routes/evexiaWebhookRoutes');

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
const DEV_FRONTEND_ORIGIN = process.env.DEV_FRONTEND_ORIGIN || 'http://localhost:3000';
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
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('[webhook] Verified event:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('[webhook] checkout.session.completed for', session.id);

      const patientData = session.metadata || {};

      await knex('stripe_payments').insert({
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
      });

      console.log('[webhook] ✅ Saved payment for session', session.id);
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
const path = require('path');
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ---- Error handler ----
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

module.exports = app;