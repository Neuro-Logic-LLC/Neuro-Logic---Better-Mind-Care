const loadSSMParams = require('../utils/loadSSMParams');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const initKnex = require('../db/initKnex');
const dayjs = require('dayjs');

const { info } = require('console');
const { v4: uuidv4 } = require('uuid');

// const { sendMfaCode, sendPasswordResetEmail, sendEmailConfirmation } = require ('../auth/mailer-oauth');

const { sendMfaCode, sendPasswordResetEmail, sendEmailConfirmation } = require('../utils/email');

const key = process.env.PGPCRYPTO_KEY;
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const { upsertIdentity } = require('../db/identities');
const { issueSessionCookie } = require('../utils/issueSessionCookie');
const { URLSearchParams } = require('url');
const { canon, identHash } = require('../utils/identHash');

dayjs.extend(utc);
dayjs.extend(timezone);

function normalizeEmail(x) {
  return typeof x === 'string' ? x.trim().toLowerCase() : '';
}
function isEmail(x) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
}

function getCentralTimestamp() {
  return dayjs().tz('America/Chicago').format('YYYY-MM-DD HH:mm:ss');
}

async function resolveRoleId(knex, input) {
  // Accepts UUID, numeric (legacy), or role name ('Admin', 'SuperAdmin', 'Patient')
  if (!input) return null;

  // if looks like UUID, trust it exists
  if (/^[0-9a-f-]{36}$/i.test(String(input))) return String(input);

  // if someone sent number-like, try mapping via name by id (optional legacy path)
  if (/^\d+$/.test(String(input))) {
    // treat "1/2/3" as names – adjust to your legacy mapping if needed
    const num = Number(input);
    const name = num === 1 ? 'SuperAdmin' : num === 2 ? 'Admin' : num === 3 ? 'Patient' : null;
    if (!name) return null;
    const row = await knex('roles').select('id').where({ role_name: name }).first();
    return row?.id || null;
  }

  // treat as role name
  const row = await knex('roles')
    .select('id')
    .where({ role_name: String(input) })
    .first();
  return row?.id || null;
}

const makeToken = () => crypto.randomBytes(32).toString('base64url');
const sha256Hex = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

exports.login = async (req, res) => {
  const knex = await initKnex();
  const { email, password } = req.body;

  try {
const user = await knex('users')
    .join('roles', 'users.role_id', 'roles.id')
    .select(
        'users.id',
        'users.email',
        'users.email_canon',
        'users.password', 
        'users.role_id',
        'roles.role_name',
        'users.is_email_confirmed'
    )
    .where({ 'users.email_hash': identHash(email) })
    .andWhere('users.is_deleted', false)
    .first();

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_email_confirmed) {
      return res.status(403).json({ error: 'Please confirm your email before logging in.' });
    }

    const xf = req.headers['x-forwarded-for'];
    const ip = Array.isArray(xf)
      ? xf[0]
      : (xf || '').split(',')[0]?.trim() || req.socket.remoteAddress;

    await knex('users').where({ id: user.id }).update({ last_login: knex.fn.now(), last_ip: ip });

    await knex('audit_log').insert({
      user_id: user.id,
      action: 'LOGIN_ATTEMPT',
      description: `User ${canon(email)} passed initial login, awaiting MFA`,
      ip_address: ip,
      timestamp: getCentralTimestamp()
    });

    // 6-digit code + 10 min expiry
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = dayjs().add(10, 'minute').toISOString();

    await knex('users').where({ id: user.id }).update({ mfa_code: code, mfa_expires_at: expires });

    // ---- FIX: derive a valid recipient ----
    const toAddress = normalizeEmail(user.email_canon);

    console.log('DEBUG MFA email:', {
      email: user.email,
      email_canon: user.email_canon,
      toAddress: toAddress,
      reqEmail: email
    });

    console.log('MAILGUN DEBUG', {
      DOMAIN: process.env.MAILGUN_DOMAIN,
      FROM: process.env.MAILGUN_FROM,
      API_KEY: process.env.MAILGUN_API_KEY ? '✅ set' : '❌ missing'
    });

    if (!toAddress) {
      console.error('MFA send aborted: no valid recipient email');
      return res.status(500).json({ error: 'no_recipient_email' });
    }

    await sendMfaCode(toAddress, code);

    req.session.user = {
      id: user.id,
      email: user.email_canon,
      role_name: user.role_id,
      is_email_confirmed: user.is_active,
      has_paid: user.has_paid 
    };

    const body = { message: 'MFA code sent' };
    if (process.env.NODE_ENV !== 'production') {
      body.dev_mfa = { code, expires };
    }
    return res.status(200).json(body);
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

const APEX = '.bettermindcare.com';
const JWT_NAME = process.env.APP_AUTH_COOKIE_NAME || 'bmc_jwt'; // issued here :contentReference[oaicite:5]{index=5}
const NAMES = [JWT_NAME, 'token', 'bmc_sess', 'bmc.sid', 'connect.sid'];

exports.logout = async (req, res) => {
  await new Promise(r => (req.session?.destroy ? req.session.destroy(() => r()) : r()));

  const isProd = process.env.NODE_ENV === 'production';
  const isHttps =
    req.secure || (req.headers['x-forwarded-proto'] || '').includes('https') || isProd;

  // These must match issueSessionCookie() exactly
  const commonOpts = {
    httpOnly: true,
    secure: true,
    sameSite:  'none',
    path: '/',
    domain: isProd ? '.bettermindcare.com' : undefined
  };

  for (const n of NAMES) {
    res.clearCookie(n, commonOpts);
  }

  res.set('Cache-Control', 'no-store');
  return res.status(204).end();
};

// unchanged
const uuidV4ish = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseProviderId(id) {
  if (typeof id !== 'string') return null;
  const [provider, rest] = id.split(':', 2);
  if (!provider || !rest) return null;
  return { provider, subject: rest };
}

// 🔐 Session check: uses `req.user` from middleware
exports.getMe = async (req, res) => {
  const knex = await initKnex();
  const key = process.env.PGPCRYPTO_KEY;

  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.user.id;

    const me = await knex('users')
      .leftJoin('roles', 'users.role_id', 'roles.id')
      .select(
        'users.id',
        'users.role_id',
        knex.raw('pgp_sym_decrypt(users.email, ?)::text AS email', [key]),
        knex.raw('pgp_sym_decrypt(users.first_name, ?)::text AS first_name', [key]),
        knex.raw('pgp_sym_decrypt(users.last_name, ?)::text AS last_name', [key]),
        'roles.role_name'
      )
      .where({ 'users.id': userId, 'users.is_deleted': false })
      .first();

    if (!me) return res.status(404).json({ error: 'Not found' });

    const role = String(me.role_name || '').toLowerCase();
    me.role = role;
    me.role_name = role;
    me.is_admin = role === 'admin' || role === 'superadmin';
    me.is_doctor = role === 'doctor';
    me.is_patient = role === 'patient';

    res.json({ user: me });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  const knex = await initKnex();
  const {
    email,
    password,
    first_name,
    last_name,
    phone,
    role_id, // optional if role_name provided
    role_name, // <-- NEW: allow role_name
    gender = ''
  } = req.body;
  const decoded = req.user;
  const key = process.env.PGPCRYPTO_KEY;
  if (!key) return res.status(500).json({ error: 'Encryption key not found' });

  try {
    const callerRole = (decoded.role || '').toLowerCase();
    if (!['admin', 'superadmin'].includes(callerRole))
      return res.status(403).json({ error: 'Access denied: Admins only' });

    if (!first_name || !last_name || !email || !password || !phone || (!role_id && !role_name)) {
      return res.status(400).json({ error: 'Missing required user fields' });
    }

    const resolvedRoleId = await resolveRoleId(knex, role_id || role_name);
    if (!resolvedRoleId) return res.status(400).json({ error: 'Invalid role' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const eCanon = canon(email);

    const [inserted] = await knex('users')
      .returning('id')
      .insert({
        password: hashedPassword,
        role_id: resolvedRoleId,
        member_since: knex.fn.now(),
        is_active: true,
        is_deleted: false,
        date_created: knex.fn.now(),
        date_last_modified: knex.fn.now(),
        last_modified_by: decoded.id,
        email: knex.raw('pgp_sym_encrypt(?, ?)', [eCanon, key]),
        email_hash: identHash(eCanon),
        first_name: knex.raw('pgp_sym_encrypt(?, ?)', [first_name, key]),
        last_name: knex.raw('pgp_sym_encrypt(?, ?)', [last_name, key]),
        phone: knex.raw('pgp_sym_encrypt(?, ?)', [phone, key]),
        gender: knex.raw('pgp_sym_encrypt(?, ?)', [gender, key])
      });

    await knex('audit_log').insert({
      user_id: decoded.id,
      action: 'CREATE_USER',
      description: `Created user: ${eCanon}`,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    res.status(201).json({ message: 'User created', userId: inserted.id || inserted });
  } catch (err) {
    if (err && err.code === '23505') return res.status(409).json({ error: 'Email' });
    console.error('❌ Error creating user:', err);
    res.status(500).json({ error: 'Server error during user creation' });
  }
};

exports.getUserById = async (req, res) => {
  const knex = await initKnex();
  const { id } = req.params; // <-- define it

  if (!id) return res.status(400).json({ error: 'id is required' });

  try {
    const key = process.env.PGPCRYPTO_KEY;

    const u = await knex('users as u')
      .leftJoin('roles as r', 'u.role_id', 'r.id')
      .select(
        'u.id',
        knex.raw('pgp_sym_decrypt(u.email, ?)::text       AS email', [key]),
        knex.raw('pgp_sym_decrypt(u.first_name, ?)::text  AS first_name', [key]),
        knex.raw('pgp_sym_decrypt(u.last_name, ?)::text   AS last_name', [key]),
        knex.raw('pgp_sym_decrypt(u.phone, ?)::text       AS phone', [key]),
        knex.raw(
          'CASE WHEN u.gender IS NOT NULL THEN pgp_sym_decrypt(u.gender, ?)::text ELSE NULL END AS gender',
          [key]
        ),
        'u.role_id',
        'r.role_name',
        knex.raw('u.date_created       AS created_at'),
        knex.raw('u.date_last_modified AS updated_at'),
        'u.is_active',
        'u.is_deleted'
      )
      .where('u.id', id)
      .first();

    if (!u) return res.status(404).json({ error: 'User not found' });

    // (optional) audit log here...

    return res.json(u);
  } catch (err) {
    console.error('getUserById error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getUserByEmail = async email => {
  const knex = await initKnex();
  const row = await knex('users')
    .join('roles', 'users.role_id', 'roles.id')
    .select('users.id', 'roles.role_name as role')
    .where({ 'users.email_hash': identHash(email) })
    .first();
  return row || null;
};

exports.getAllUsers = async (req, res) => {
  const knex = await initKnex();
  const decoded = req.user;

  const role = decoded.role?.toLowerCase();
  if (!['admin', 'superadmin', 'doctor'].includes(role)) {
    return res.status(403).json({ error: 'Access denied: Admins or SuperAdmins only' });
  }

  try {
    const users = await knex('users')
      .join('roles', 'users.role_id', 'roles.id')
      .select([
        'users.id',
        knex.raw('pgp_sym_decrypt(email::bytea, ?) as email', [process.env.PGPCRYPTO_KEY]),
        knex.raw('pgp_sym_decrypt(first_name::bytea, ?) as first_name', [
          process.env.PGPCRYPTO_KEY
        ]),
        knex.raw('pgp_sym_decrypt(last_name::bytea, ?) as last_name', [process.env.PGPCRYPTO_KEY]),
        knex.raw('pgp_sym_decrypt(phone::bytea, ?) as phone', [process.env.PGPCRYPTO_KEY]),
        knex.raw(
          'CASE WHEN gender IS NOT NULL THEN pgp_sym_decrypt(gender::bytea, ?) ELSE NULL END as gender',
          [process.env.PGPCRYPTO_KEY]
        ),
        'users.role_id',
        'roles.role_name',
        'users.member_since',
        'users.last_login',
        'users.last_ip',
        'users.is_active',
        'users.is_deleted',
        'users.date_created'
      ])
      .orderBy('users.date_created', 'desc');

    await knex('audit_log').insert({
      user_id: decoded.id,
      action: 'VIEW_USERS',
      description: 'Viewed all users',
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// controllers/authController.js
exports.resetPassword = async (req, res) => {
  const knex = await initKnex();
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ error: 'Missing token or password' });

  // 1) Basic password policy (tune as needed)
  const strongEnough =
    typeof newPassword === 'string' &&
    newPassword.length >= 8 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  if (!strongEnough) {
    return res.status(400).json({
      error:
        'Weak password: Password must be at least 8 characters long and include uppercase, lowercase, number, and one special character.',
      detail:
        'Password must be at least 8 characters long and include uppercase, lowercase, number, and one special character.'
    });
  }

  // Best-effort client IP (behind proxy aware)
  const xf = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xf)
    ? xf[0]
    : (xf || '').split(',')[0]?.trim() || req.socket.remoteAddress;

  try {
    const tokenHash = sha256Hex(token);

    await knex.transaction(async trx => {
      // 2) Atomically claim the token row to prevent reuse/races
      const rec = await trx('password_resets')
        .where({ token_hash: tokenHash, purpose: 'reset' })
        .andWhere('expires_at', '>', trx.fn.now())
        .whereNull('used_at')
        .forUpdate() // lock the row (InnoDB/PG)
        .first();

      if (!rec) {
        // Bail inside txn so nothing else runs
        throw Object.assign(new Error('invalid_or_expired'), { status: 400 });
      }

      // 3) Hash the password (cost 12–14 is a good default)
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // 4) Update user password
      await trx('users').where({ id: rec.user_id }).update({
        password: hashedPassword,
        date_last_modified: trx.fn.now(),
        last_modified_by: rec.user_id
      });

      // 5) Mark token as used (guard again to be safe)
      const used = await trx('password_resets')
        .where({ token_hash: tokenHash, purpose: 'reset' })
        .whereNull('used_at')
        .update({ used_at: trx.fn.now() });

      if (used === 0) {
        // If another request snuck in, abort (no partial state left)
        throw Object.assign(new Error('already_used'), { status: 400 });
      }

      // 6) (Optional) Invalidate active sessions for this user
      // if you have a sessions table or token_version, do it here.
      // await trx('sessions').where({ user_id: rec.user_id }).del();
      // or: await trx('users').where({ id: rec.user_id }).increment('token_version', 1);

      // 7) Audit
      await trx('audit_log').insert({
        user_id: rec.user_id,
        action: 'SELF_PASSWORD_RESET',
        description: 'User reset via token',
        ip_address: ip,
        timestamp: trx.fn.now()
      });
    });

    return res.json({ ok: true });
  } catch (err) {
    if (
      err &&
      err.status === 400 &&
      (err.message === 'invalid_or_expired' || err.message === 'already_used')
    ) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    console.error('❌ Reset password error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  const knex = await initKnex();
  const { email } = req.body;

  try {
    const result = await knex('users')
      .select('id')
      .where({ email_hash: identHash(email) });
    if (!result?.length) return res.status(404).json({ error: 'User not found' });

    const userId = result[0].id;
    const token = makeToken();
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const emailCanon = email.trim().toLowerCase();

    const emailHash = crypto.createHash('sha256').update(emailCanon).digest('hex');

    await knex('password_resets').insert({
      user_id: userId,
      token_hash: tokenHash,
      purpose: 'reset',
      expires_at: expiresAt,
      used_at: null,
      created_at: knex.fn.now()
    });

    const base = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    const resetLink = `${base}/reset-password?${new URLSearchParams({ token }).toString()}`;

    await sendPasswordResetEmail(canon(email), resetLink);

    return res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error('❌ Forgot password error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// exports.forgotUsername = async (req, res) => {

//   const knex = await initKnex();
//   const { email } = req.body || {};
//   if (!email) return res.status(400).json({ error: 'Email is required' });

//   try {
//     const key = process.env.PGPCRYPTO_KEY;
//     if (!key) return res.status(500).json({ error: 'Encryption key not found' });

//     const eCanon = canon(email); // <- normalize exactly like signup
//     const row = await knex('users')
//       .select(
//         'id',
//         'is_email_confirmed',
//         knex.raw('pgp_sym_decrypt(email, ?)::text AS decrypted_email', [key])
//       )
//       .where({ email_hash: identHash(eCanon) }) // <- use canon before hash
//       .andWhere('is_deleted', false)
//       .first();

//     const genericMsg = { message: 'If an account exists, an email was sent.' };
//     if (!row) return res.json(genericMsg);

//     // If this is blocking you in dev, comment the next 4 lines:
//     if (!row.is_email_confirmed) {
//       return res.json(genericMsg);
//     }

//     const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

//     await knex('audit_log').insert({
//       user_id: row.id,
//       action: 'FORGOT_USERNAME',
//       description: 'Email reminder sent',
//       ip_address: ip,
//       timestamp: knex.fn.now()
//     });

//     return res.json(genericMsg);
//   } catch (err) {
//     console.error('❌ Forgot username error:', err);
//     return res.status(500).json({ error: 'Server error' });
//   }
// };

// Admin-only Soft Delete User
exports.deleteUser = async (req, res) => {
  const knex = await initKnex();
  const decoded = req.user;
  const userId = req.params.id;

  try {
    const role = decoded.role?.toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    await knex('users').where({ id: userId }).update({
      is_deleted: true,
      is_active: false,
      date_last_modified: knex.fn.now(),
      last_modified_by: decoded.id
    });

    await knex('audit_log').insert({
      user_id: decoded.id,
      action: 'DELETE_USER',
      description: `Soft-deleted user ${userId}`,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    return res.status(200).json({ message: 'User soft-deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.verifyMfa = async (req, res) => {
  const knex = await initKnex();
  const { code } = req.body;

  try {
    // The login route created the temporary session
    const tempUser = req.session?.user;
    if (!tempUser?.id) {
      return res.status(401).json({ error: 'No active login challenge' });
    }

    const user = await knex('users')
      .join('roles', 'users.role_id', 'roles.id')
      .select(
        'users.id',
        'users.email_canon',
        'users.mfa_code',
        'users.mfa_expires_at',
        'roles.role_name'
      )
      .where({ 'users.id': tempUser.id })
      .first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid login session' });
    }

    // Validate MFA
    if (
      user.mfa_code !== code ||
      !user.mfa_expires_at ||
      dayjs().isAfter(dayjs(user.mfa_expires_at))
    ) {
      return res.status(401).json({ error: 'Invalid or expired MFA code' });
    }

    // Clear MFA code from DB
    await knex('users').where({ id: user.id }).update({
      mfa_code: null,
      mfa_expires_at: null
    });

    // Record success
    await knex('audit_log').insert({
      user_id: user.id,
      action: 'MFA_SUCCESS',
      description: `User ${user.email_canon} passed MFA`,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    // Issue final JWT cookie
    res.clearCookie(process.env.APP_AUTH_COOKIE_NAME || 'bmc_jwt');
    issueSessionCookie(res, {
      id: user.id,
      email: user.email_canon,
      role: user.role_name
    });

    return res.json({
      message: 'Authenticated successfully',
      user: {
        id: user.id,
        email: user.email_canon,
        role: user.role_name
      }
    });

  } catch (err) {
    console.error('MFA verification error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.getAuditLog = async (req, res) => {
  const knex = await initKnex();
  const decoded = req.user;

  if (!decoded || !['admin', 'superadmin'].includes(decoded.role.toLowerCase())) {
    return res.status(403).json({ error: 'Access denied: Admins only' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const { page = 1, limit = 100, action, user_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const safeLimit = Math.min(parseInt(limit), 500);

  try {
    const logs = await knex('audit_log')
      .select(
        'audit_log.id',
        'audit_log.user_id',
        'audit_log.action',
        'audit_log.description',
        'audit_log.ip_address',
        'audit_log.timestamp'
      )
      .leftJoin('users', 'audit_log.user_id', 'users.id')
      .orderBy('audit_log.timestamp', 'desc')
      .limit(safeLimit)
      .offset(offset)
      .modify(queryBuilder => {
        if (action) queryBuilder.where('audit_log.action', action);
        if (user_id) queryBuilder.where('audit_log.user_id', user_id);
      });

    const clientTime = req.headers['x-client-time'];
    const clientTimeZone = req.headers['x-client-timezone'];

    // 🛑 Check if the last log was already a VIEW_AUDIT_LOG in the last 3 seconds
    const recent = await knex('audit_log')
      .where({ user_id: decoded.id, action: 'VIEW_AUDIT_LOG' })
      .andWhere('timestamp', '>', knex.raw(`NOW() - INTERVAL '3 seconds'`))
      .orderBy('timestamp', 'desc')
      .first();

    if (!recent) {
      await knex('audit_log').insert({
        user_id: decoded.id,
        action: 'VIEW_AUDIT_LOG',
        description:
          action || user_id
            ? `Viewed filtered audit log: ${action || ''}${user_id ? ` for user ${user_id}` : ''}`
            : 'Viewed audit log',
        ip_address: ip,
        timestamp: new Date()
      });
    }

    res.json({ page: parseInt(page), count: logs.length, logs });
  } catch (err) {
    console.error('❌ Error retrieving audit log:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.reactivateUser = async (req, res) => {
  const knex = await initKnex();
  const decoded = req.user;
  const { userId } = req.body;

  try {
    const role = decoded.role?.toLowerCase();
    if (role !== 'admin' && role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    await knex('users').where({ id: userId }).update({
      is_deleted: false,
      is_active: true,
      date_last_modified: knex.fn.now(),
      last_modified_by: decoded.id
    });

    await knex('audit_log').insert({
      user_id: decoded.id,
      action: 'REACTIVATE_USER',
      description: `Admin reactivated user ${userId}`,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    return res.json({ message: 'User reactivated and marked as paid' });
  } catch (err) {
    console.error('Error reactivating user:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.updateUser = async (req, res) => {
  const knex = await initKnex();
  const { userId, email, phone, role_id, gender, first_name, last_name } = req.body;
  const decoded = req.user;

  try {
    const role = decoded.role?.toLowerCase();
    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const updatePayload = {
      date_last_modified: knex.fn.now(),
      last_modified_by: decoded.id
    };
    const enc = val => knex.raw('pgp_sym_encrypt(?, ?)', [String(val), process.env.PGPCRYPTO_KEY]);

    if (role_id) {
      const roleExists = await knex('roles').select('id').where({ id: role_id }).first();
      if (!roleExists) return res.status(400).json({ error: 'Invalid role_id' });
      updatePayload.role_id = role_id;
    }

    if (first_name !== undefined && first_name !== '') updatePayload.first_name = enc(first_name);
    if (last_name !== undefined && last_name !== '') updatePayload.last_name = enc(last_name);
    if (phone !== undefined && phone !== '') updatePayload.phone = enc(phone);
    if (gender !== undefined && gender !== '') updatePayload.gender = enc(gender);

    const emailWasUpdated = email !== undefined && email !== '';
    if (emailWasUpdated) {
      const eCanon = canon(email);
      updatePayload.email = enc(eCanon);
      updatePayload.email_hash = identHash(eCanon);
    }

    if (Object.keys(updatePayload).length <= 2) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const count = await knex('users').where({ id: userId }).update(updatePayload);
    if (count === 0) return res.status(404).json({ error: 'Target user not found' });

    await knex('audit_log').insert({
      user_id: decoded.id,
      action: 'UPDATE_USER',
      description: `Updated user ${userId}`,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    // Refresh token if caller updated themselves
    if (userId === decoded.id) {
      const roleRow = role_id
        ? await knex('roles').select('role_name').where({ id: role_id }).first()
        : { role_name: decoded.role };

      const key = process.env.PGPCRYPTO_KEY;
      const me = await knex('users')
        .select(
          knex.raw('pgp_sym_decrypt(email, ?) as email', [key]),
          knex.raw('pgp_sym_decrypt(first_name, ?) as first_name', [key]),
          knex.raw('pgp_sym_decrypt(last_name,  ?) as last_name', [key])
        )
        .where({ id: decoded.id })
        .first();

      res.clearCookie(process.env.APP_AUTH_COOKIE_NAME || 'bmc_jwt');
      issueSessionCookie(res, {
        id: decoded.id,
        role: roleRow.role_name,
        email: me.email
      });

      return res.json({ message: 'User updated + token refreshed' });
    }

    return res.json({ message: 'User updated successfully' });
  } catch (err) {
    if (err && err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error('updateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.updateMyProfile = async (req, res) => {
  const knex = await initKnex();
  const userId = req.user.id;
  const { email, first_name, last_name, phone } = req.body;

  try {
    const updatePayload = {
      date_last_modified: knex.fn.now(),
      last_modified_by: userId
    };
    const enc = val => knex.raw('pgp_sym_encrypt(?, ?)', [String(val), process.env.PGPCRYPTO_KEY]);

    const emailWasUpdated = email !== undefined && email !== '';
    if (emailWasUpdated) {
      const eCanon = canon(email);
      updatePayload.email = enc(eCanon);
      updatePayload.email_hash = identHash(eCanon);
    }
    if (first_name !== undefined) updatePayload.first_name = enc(first_name);
    if (last_name !== undefined) updatePayload.last_name = enc(last_name);
    if (phone !== undefined) updatePayload.phone = enc(phone);

    await knex('users').where({ id: userId }).update(updatePayload);

    await knex('audit_log').insert({
      user_id: userId,
      action: 'SELF_UPDATE_PROFILE',
      description: `User updated their profile fields`,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    const [updated] = await knex('users')
      .join('roles', 'users.role_id', 'roles.id')
      .select(
        'users.id',
        'roles.role_name',
        knex.raw('pgp_sym_decrypt(users.email::bytea, ?) as email', [process.env.PGPCRYPTO_KEY])
      )
      .where('users.id', userId);

    res.clearCookie(process.env.APP_AUTH_COOKIE_NAME || 'bmc_jwt');
    issueSessionCookie(res, {
      id: updated.id,
      role: updated.role_name,
      email: updated.email
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    if (err && err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.publicSignup = async (req, res) => {
  const knex = await initKnex();
  const {
    email,
    password,
    first_name = '',
    last_name = '',
    phone = ''
    // gender = ''   // if you want gender optional, add it back and insert only if non-empty
  } = req.body || {};

  try {
    // required only
    if (!email || !password || !first_name || !last_name || !phone) {
      return res.status(400).json({ error: 'missing_fields' });
    }

    // minimal policy: length >= 8, no special-char requirement
    if (
      typeof password !== 'string' ||
      password.length < 8 ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      return res.status(400).json({
        error:
          'Weak password: Password must be at least 8 characters long and include uppercase, lowercase, number, and one special character.',
        detail: 'Password must be at least 8 characters and include one special character.'
      });
    }

    const key = process.env.PGPCRYPTO_KEY;
    if (!key) return res.status(500).json({ error: 'Server misconfiguration' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const roleRow = await knex('roles').select('id').where({ role_name: 'Patient' }).first();
    if (!roleRow) {
      return res.status(400).json({ error: 'Default role not found' });
    }

    const confirmationToken = uuidv4();
    const tokenHash = await bcrypt.hash(confirmationToken, 10);

    const eCanon = canon(String(email).trim().toLowerCase());

    const [created] = await knex('users')
      .returning(['id'])
      .insert({
        password: hashedPassword,
        role_id: roleRow.id,
        member_since: knex.fn.now(),
        is_active: true,
        is_deleted: false,
        is_email_confirmed: false,
        date_created: knex.fn.now(),
        date_last_modified: knex.fn.now(),
        confirmation_token_hash: tokenHash,

        // encrypted PII
        email: knex.raw('pgp_sym_encrypt(?, ?)', [eCanon, key]),
        first_name: knex.raw('pgp_sym_encrypt(?, ?)', [first_name, key]),
        last_name: knex.raw('pgp_sym_encrypt(?, ?)', [last_name, key]),
        phone: knex.raw('pgp_sym_encrypt(?, ?)', [phone, key]),
        // if you add gender back:
        // gender: gender ? knex.raw('pgp_sym_encrypt(?, ?)', [gender, key]) : null,

        // fast lookups
        email_canon: eCanon,
        email_hash: identHash(eCanon)
      });

    await knex('audit_log').insert({
      user_id: created.id,
      action: 'SELF_SIGNUP',
      description: `New public signup: ${eCanon}`,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    await sendEmailConfirmation(eCanon, confirmationToken);

    return res.status(201).json({ message: 'Signup successful. Please confirm your email.' });
  } catch (err) {
    if (err && err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('signup failed', err);
    return res.status(500).json({ error: 'Server Error' });
  }
};

exports.confirmEmail = async (req, res) => {
  const knex = await initKnex();
  const { token } = req.body;

  if (!token) return res.status(400).json({ error: 'Missing confirmation token' });

  try {
    const users = await knex('users')
      .select('id', 'confirmation_token_hash')
      .whereNotNull('confirmation_token_hash');

    let matchedUser = null;

    for (const user of users) {
      const isMatch = await bcrypt.compare(token, user.confirmation_token_hash);
      if (isMatch) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    await knex('users').where({ id: matchedUser.id }).update({
      is_email_confirmed: true,
      confirmation_token_hash: null,
      date_last_modified: knex.fn.now()
    });

    await knex('audit_log').insert({
      user_id: matchedUser.id,
      action: 'EMAIL_CONFIRMED',
      description: 'User confirmed their email',
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    res.status(200).json({ message: 'Email confirmed successfully' });
  } catch (err) {
    console.error('❌ Email confirmation failed:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.adminCreateUser = async (req, res) => {
  const knex = await initKnex();
  const {
    email,
    password,
    first_name,
    last_name,
    phone,
    role_id, // may be UUID
    role_name, // or a name like "Admin", "SuperAdmin", "Patient"
    gender = ''
  } = req.body;

  const key = process.env.PGPCRYPTO_KEY;
  if (!key) return res.status(500).json({ error: 'Encryption key not found' });

  try {
    const callerRole = String(req.user?.role || '').toLowerCase();
    if (!['admin', 'superadmin'].includes(callerRole)) {
      return res.status(403).json({ error: 'Access denied: Admins only' });
    }

    if (!first_name || !last_name || !email || !password || !phone || (!role_id && !role_name)) {
      return res.status(400).json({ error: 'Missing required user fields' });
    }

    const resolvedRoleId = await resolveRoleId(knex, role_id || role_name);
    if (!resolvedRoleId) return res.status(400).json({ error: 'Invalid role' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const eCanon = canon(email);

    const payload = {
      password: hashedPassword,
      role_id: resolvedRoleId,
      member_since: knex.fn.now(),
      is_active: true,
      is_deleted: false,
      date_created: knex.fn.now(),
      date_last_modified: knex.fn.now(),
      last_modified_by: req.user.id,

      email: knex.raw('pgp_sym_encrypt(?, ?)', [eCanon, key]),
      email_hash: identHash(eCanon),
      first_name: knex.raw('pgp_sym_encrypt(?, ?)', [first_name, key]),
      last_name: knex.raw('pgp_sym_encrypt(?, ?)', [last_name, key]),
      phone: knex.raw('pgp_sym_encrypt(?, ?)', [phone, key]),
      gender: knex.raw('pgp_sym_encrypt(?, ?)', [gender, key]),

      // ✅ auto-confirm here for admin-created accounts
      is_email_confirmed: true,
      confirmation_token_hash: null
      // If you have this column, uncomment:
      // email_confirmed_at: knex.fn.now(),
    };

    const [inserted] = await knex('users').returning('id').insert(payload);

    await knex('audit_log').insert({
      user_id: req.user.id,
      action: 'CREATE_USER',
      description: `Admin created user (auto-confirmed): ${eCanon}`,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    return res.status(201).json({ message: 'User created', userId: inserted.id || inserted });
  } catch (err) {
    if (err && err.code === '23505') return res.status(409).json({ error: 'Email' });
    console.error('❌ adminCreateUser error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.resetPasswordViaToken = async (req, res) => {
  const knex = await initKnex();
  const { token, newPassword } = req.body;

  try {
    // Find all unexpired reset entries
    const resets = await knex('password_resets').where('expires_at', '>', new Date());

    let matchedReset = null;

    for (const entry of resets) {
      const match = await bcrypt.compare(token, entry.token_hash);
      if (match) {
        matchedReset = entry;
        break;
      }
    }

    if (!matchedReset) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await knex('users').where({ id: matchedReset.user_id }).update({
      password: hashedPassword,
      date_last_modified: knex.fn.now()
    });

    await knex('audit_log').insert({
      user_id: matchedReset.user_id,
      action: 'SELF_PASSWORD_RESET',
      description: 'User reset their password using token link',
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    await knex('password_resets').where('token_hash', matchedReset.token_hash).del();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('❌ Reset password via token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.hardDeleteUser = async (req, res) => {
  const knex = await initKnex();
  const decoded = req.user;
  const userId = req.params.id;

  try {
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied: SuperAdmins only' });
    }

    // Double-check: Don't allow deletion of another SuperAdmin
    const [targetUser] = await knex('users')
      .join('roles', 'users.role_id', 'roles.id')
      .select('users.id', 'roles.role_name')
      .where('users.id', userId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role_name === 'SuperAdmin') {
      return res.status(403).json({ error: 'Cannot delete another SuperAdmin' });
    }

    await knex('users').where({ id: userId }).del();

    await knex('audit_log').insert({
      user_id: decoded.id,
      action: 'HARD_DELETE_USER',
      description: `SuperAdmin permanently deleted user ${userId}`,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    res.status(200).json({ message: 'User hard-deleted successfully' });
  } catch (err) {
    console.error('❌ Hard delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.resendEmailConfirmation = async (req, res) => {
  const knex = await initKnex();
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await knex('users')
      .select('id', 'is_email_confirmed')
      .where({ email_hash: identHash(email) })
      .first();

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.is_email_confirmed) return res.status(400).json({ error: 'Email already confirmed' });

    const newToken = uuidv4();
    const tokenHash = await bcrypt.hash(newToken, 10);

    await knex('users').where({ id: user.id }).update({
      confirmation_token_hash: tokenHash,
      date_last_modified: knex.fn.now()
    });

    await knex('audit_log').insert({
      user_id: user.id,
      action: 'RESEND_CONFIRMATION',
      description: 'User requested email confirmation again',
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      timestamp: knex.fn.now()
    });

    await sendEmailConfirmation(canon(email), newToken);
    return res.status(200).json({ message: 'Confirmation email resent.' });
  } catch (err) {
    console.error('❌ Resend email failed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

exports.oauthCallback = async (req, res) => {
  try {
    const { provider, sub: providerUserId, email, email_verified } = req.oidc; // example
    const userId = req.user.id; // however you map/create user
    await upsertIdentity({
      userId,
      provider,
      providerUserId,
      email,
      emailVerified: email_verified
    });

    issueSession(res, {
      id: userId,
      role: req.user.role,
      email
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'OAuth link failed' });
  }
};
