require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';

// Trust proxy for HTTPS
app.set('trust proxy', 1);

/* ---------------------------------------------
   1) CORS — must be first
--------------------------------------------- */
app.use((_, res, next) => {
  res.setHeader('Vary', 'Origin');
  next();
});

app.use(
  cors({
    origin: [
      'https://staging.bettermindcare.com',
      'https://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204
  })
);

console.log("CORS initialized");

/* ---------------------------------------------
   2) Cookies
--------------------------------------------- */
app.use(cookieParser());

/* ---------------------------------------------
   3) Session — AFTER CORS + cookieParser
--------------------------------------------- */
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET missing before session()");
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
      sameSite: 'none',   // REQUIRED for cross-domain cookies
      path: '/',
      maxAge: 1000 * 60 * 60 * 4
    }
  })
);