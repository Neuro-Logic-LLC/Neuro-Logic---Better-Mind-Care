// backend/utils/mailer-oauth.js
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

let cached;

async function getTransporter() {
  if (cached) return cached;

  const user         = process.env.SMTP_USER;
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN_MAIL;

  if (!user)         throw new Error('SMTP_USER not set');
  if (!clientId)     throw new Error('GOOGLE_CLIENT_ID not set');
  if (!clientSecret) throw new Error('GOOGLE_CLIENT_SECRET not set');
  if (!refreshToken) throw new Error('GOOGLE_REFRESH_TOKEN_MAIL not set');

  const oAuth2 = new google.auth.OAuth2(clientId, clientSecret);
  oAuth2.setCredentials({ refresh_token: refreshToken });
  const accessToken = await oAuth2.getAccessToken().then(r => r?.token);

  const t = nodemailer.createTransport({
    service: 'gmail',
    auth: { type: 'OAuth2', user, clientId, clientSecret, refreshToken, accessToken },
  });

  cached = t;
  return cached;
}

function fromAddr() {
  const from = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  if (!from) throw new Error('No FROM address: set SMTP_USER (and optionally SMTP_FROM)');
  return `"BetterMindCare" <${from}>`;
}

async function sendPasswordResetEmail(to, resetLink) {
  const tx = await getTransporter();
  await tx.verify();
  return tx.sendMail({
    from: fromAddr(),
    to,
    subject: 'Reset Your Password',
    text: `You requested to reset your password.\n\n${resetLink}\n\nIf you didn't request this, ignore this email.`,
    html: `<p>You requested to reset your password.</p>
           <p><a href="${resetLink}" style="background:#333;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Reset Password</a></p>
           <p>If you didn't request this, you can safely ignore it.</p>`
  });
}

async function sendMfaCode(to, code) {
  const tx = await getTransporter();
  await tx.verify();
  return tx.sendMail({
    from: fromAddr(),
    to,
    subject: 'Your MFA Code',
    text: `Your secure login code is: ${code}`,
    html: `<p>Your secure login code is: <b>${code}</b></p>`
  });
}

async function sendEmailConfirmation(to, token) {
  const tx = await getTransporter();
  await tx.verify();
  const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  const link = `${base}/confirm-email?token=${encodeURIComponent(token)}`;
  return tx.sendMail({
    from: fromAddr(),
    to,
    subject: 'Confirm your email',
    text: `Please confirm your email: ${link}`,
    html: `<p>Please confirm your email:</p>
           <p><a href="${link}" style="background:#333;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Confirm Email</a></p>`
  });
}

async function sendUsernameReminder(to, username) {
  const tx = await getTransporter();
  await tx.verify();
  return tx.sendMail({
    from: fromAddr(),
    to,
    subject: 'Your username',
    text: `Your username is: ${username}`,
    html: `<p>Your username is: <b>${username}</b></p>`
  });
}

// named exports (so destructuring works)
exports.getTransporter = getTransporter;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendMfaCode = sendMfaCode;
exports.sendEmailConfirmation = sendEmailConfirmation;
exports.sendUsernameReminder = sendUsernameReminder;
