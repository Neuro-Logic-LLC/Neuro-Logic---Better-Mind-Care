// app.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
// general API
const evexiaWebhookRoutes = require('./routes/evexiaWebhookRoutes'); // webhook + queries

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// parsers first
app.use(cookieParser());

// IMPORTANT: do not put express.json before mounting the webhook router
// The webhook router defines its own express.raw() on the POST route.
// That keeps the exact body for signature or binary payloads.

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET missing before session()');
}

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

// CORS
app.use((_, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});

if (IS_PROD) {
  // Load URLs from env, but always include staging domain
  const allowList = new Set([
    'http://localhost:3000',
    'https://localhost:3000',
    'http://staging.bettermindcare.com',
    'https://staging.bettermindcare.com' // include https too, since staging may be served securely
  ]);
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        try {
          const u = new URL(origin);
          const full = `${u.protocol}//${u.host}`.toLowerCase();
    if (!origin) return cb(null, true); // allow tools or same-origin requests
    if (allowList.has(origin)) return cb(null, true);
          for (const entry of allowList) {
            if (!entry || entry.startsWith('http')) continue;
            const pat = entry.startsWith('.') ? entry.slice(1) : entry;
            const h = u.hostname.toLowerCase();
            if (h === pat || h.endsWith(`.${pat}`)) return cb(null, true);
          }
        } catch {}
        return cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true
    })
  );
  console.log('CORS: PROD allow list active');
} else {
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
  console.log(`CORS: DEV allow ${DEV_FRONTEND_ORIGIN}`);
}

// Lightweight health checks
app.get('/', (_req, res) => res.send('Hello HTTPS!'));
app.get('/api/health', (_req, res) => res.send('ok'));

// Mount routers BEFORE global JSON body parser for the webhook,
// because the webhook route uses express.raw() internally.

// Safe to enable JSON parsing for the rest of the API now
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/evexia', require('./routes/evexiaRoutes')); // your general Evexia API
app.use('/api/evexia-webhook', require('./routes/evexiaWebhookRoutes')); // POST /lab-result-webhook, GET /lab-results, GET /ping
// Other routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/google-calendar', require('./routes/googleCalendarRoutes'));
app.use('/api/intake', require('./routes/intakeRoutes'));
app.use('/api/oauth', require('./routes/oauthRoutes'));
app.use('/api/stripe', require('./routes/stripeRoutes'));
app.use('/api/evexia-import', require('./routes/evexiaImportRoutes'));


const path = require('path');

app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all for client routes, but NOT /api/*
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// Errors
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});


module.exports = app;
