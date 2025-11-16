// src/backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// Use a dedicated name for the JWT cookie, never SESSION_COOKIE_NAME.
const AUTH_COOKIE = process.env.APP_AUTH_COOKIE_NAME || 'bmc_jwt';
const ISSUER = 'bettermindcare';

function readToken(req) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  // Look for our auth cookie first, then legacy 'token', then Bearer
  return req.cookies?.[AUTH_COOKIE] || req.cookies?.token || bearer || null;
}

function verifyAny(t) {
  try { return jwt.verify(t, process.env.JWT_SECRET, { issuer: ISSUER }); }
  catch {
    try { return jwt.verify(t, process.env.JWT_SECRET); } // legacy no-issuer
    catch { return null; }
  }
}

function normalize(payload) {
  if (!payload) return null;
  const id = payload.id || payload.sub || null;
  return {
    id,
    email: payload.email || null,
    role: payload.role || 'user',
    _jwt: payload,
      has_paid: payload.has_paid === true
  };
}

const jwtParts = (t='') => (t.split('.').length === 3 ? t.split('.') : []);
const b64urlToJson = (p) => {
  try {
    const s = Buffer.from(p.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8');
    return JSON.parse(s);
  } catch { return null; }
};

// Optional helper: attach user if present (never 401, never hang)
exports.attachUser = (req, _res, next) => {
  // 1) Real token first
  const t = readToken(req);
  if (t) {
    const payload = verifyAny(t);
    if (payload) {
      req.user = normalize(payload);
      return next();
    }
  }

  // 2) Allow session-based identity ONLY for OAuth routes, to survive restarts
  if (req.path.startsWith('/api/oauth/')) {
    if (req.session?.user) {
      req.user = req.session.user;
      return next();
    }
    const idt = req.session?.googleTokens?.id_token;
    if (idt) {
      const parts = jwtParts(idt);
      const payload = parts.length === 3 ? b64urlToJson(parts[1]) : null;
      if (payload?.sub) {
        req.user = { id: `google:${payload.sub}`, email: payload.email, role_name: undefined, has_paid:payload.has_paid === true };
      }
    }
  }

  // 3) Otherwise anonymous
  return next();
};



// Hard auth: require valid JWT
exports.verifyToken = (req, res, next) => {
  const cookieName = process.env.APP_AUTH_COOKIE_NAME || 'bmc_jwt';
  const token = req.cookies?.[cookieName];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id || decoded.sub,
      role: decoded.role || 'user',
      email: decoded.email || null,
      has_paid: decoded.has_paid === true,
    };

    if (!req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

exports.requireAdmin = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access only' });
  }
  next();
};

exports.requirePatient = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  if (role !== 'patient') {
    return res.status(403).json({ error: 'Patient access only' });
  }
  next();
};

exports.requireDoctor = (req, res, next) => {
  const role = (req.user?.role || '').toLowerCase();
  if (role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access only' });
  }
  next();
};

exports.requireAdminOrDoctor = (req, res, next) => {
  const role = String(req.user?.role || req.user?.role_name || '').toLowerCase();
  if (['admin', 'superadmin', 'doctor'].includes(role)) return next();
  return res.status(403).json({ message: 'Access denied: Admin or Doctor required' });
};