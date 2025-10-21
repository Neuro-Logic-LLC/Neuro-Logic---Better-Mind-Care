// utils/issueSession.js
const jwt = require('jsonwebtoken');

const COOKIE_NAME = process.env.APP_AUTH_COOKIE_NAME || 'bmc_jwt';

function issueSessionCookie(arg1, arg2, arg3) {
  // Accept both signatures:
  //   issueSessionCookie(req, res, payload)
  //   issueSessionCookie(res, payload)
  let req = null, res = null, payload = null;

  if (arg3 !== undefined) {
    // 3-arg form
    req = arg1; res = arg2; payload = arg3;
  } else {
    // 2-arg form
    res = arg1; payload = arg2;
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('issueSession: payload object required');
  }
  const sub = payload.id || payload.sub;
  if (!sub) throw new Error('issueSession: payload.id (sub) required');

  const secret = process.env.JWT_SECRET || 'dev-only-change-me';

  const token = jwt.sign(
    {
      sub: String(sub),
      email: payload.email || '',
      role: payload.role || 'user',
    },
    secret,
    { expiresIn: '7d', issuer: 'bettermindcare' }
  );

  const isProd = process.env.NODE_ENV === 'production';
  const isSecure =
    req
      ? (req.secure || (req.headers['x-forwarded-proto'] || '').includes('https'))
      : isProd; // no req in 2-arg form

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: isProd ? 'lax' : 'none',
    path: '/',
    domain: isProd ? '.bettermindcare.com' : undefined,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
}

module.exports = { issueSessionCookie };