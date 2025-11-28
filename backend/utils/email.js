const formData = require("form-data");
const Mailgun = require("mailgun.js");

const mg = new Mailgun(formData).client({
  username: "api",
  key: process.env.MAILGUN_API_KEY
});

const DOMAIN = process.env.MAILGUN_DOMAIN; // e.g. mg.bettermindcare.com
const FROM = process.env.MAILGUN_FROM || `BetterMindCare <no-reply@bettermindcare.com>`;

// ------------------------------
// SEND MFA
// ------------------------------
exports.sendMfaCode = async (to, code) => {
  try {
    await mg.messages.create(DOMAIN, {
      from: FROM,
      to,
      subject: "Your MFA Code",
      html: `<p>Your secure login code is: <b>${code}</b></p>`
    });
  } catch (err) {
    console.error("❌ Mailgun MFA email failed:", err);
    throw err;
  }
};

// ------------------------------
// PASSWORD RESET
// ------------------------------
exports.sendPasswordResetEmail = async (to, resetLink) => {
  try {
    await mg.messages.create(DOMAIN, {
      from: FROM,
      to,
      subject: "Reset Your Password",
      html: `
        <p>You requested to reset your password.</p>
        <p><a href="${resetLink}" style="background:#333;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Reset Password</a></p>
        <p>If you didn't request this, ignore it.</p>
      `
    });
  } catch (err) {
    console.error("❌ Mailgun password reset email failed:", err);
  }
};

// ------------------------------
// EMAIL CONFIRMATION
// ------------------------------
exports.sendEmailConfirmation = async (to, token) => {
  const confirmLink = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;

  try {
    await mg.messages.create(DOMAIN, {
      from: FROM,
      to,
      subject: "Confirm Your Email Address",
      html: `
        <p>Thank you for signing up with BetterMindCare!</p>
        <p>Please confirm your email below:</p>
        <p><a href="${confirmLink}" style="background:#007bff;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Confirm My Email</a></p>
        <p>If you didn’t create this account, you can ignore this message.</p>
      `
    });
  } catch (err) {
    console.error("❌ Mailgun confirmation email failed:", err);
  }
};

exports.sendMagicResumeLink = async (to, token) => {
  const base = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  const link = `${base}/resume-signup?token=${encodeURIComponent(token)}`;

  try {
    await mg.messages.create(DOMAIN, {
      from: FROM,
      to,
      subject: "Resume Your Signup",
      html: `
        <p>You can resume your signup below:</p>
        <p><a href="${link}" style="background:#333;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Resume Signup</a></p>
        <p>If you didn't start creating an account, ignore this email.</p>
      `
    });
  } catch (err) {
    console.error("❌ Mailgun magic-link email failed:", err);
    throw err;
  }
};
// ------------------------------
// USERNAME REMINDER
// ------------------------------
exports.sendUsernameReminder = async (to, username) => {
  const loginUrl = `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/login`;

  try {
    await mg.messages.create(DOMAIN, {
      from: FROM,
      to,
      subject: "Your Username Reminder",
      html: `
        <p>You requested a reminder of your username.</p>
        <p><strong>Username:</strong> ${username}</p>
        <p><a href="${loginUrl}" style="background:#333;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Go to Sign In</a></p>
        <p>If you didn’t request this, ignore this message.</p>
      `
    });
  } catch (err) {
    console.error("❌ Mailgun username reminder email failed:", err);
  }
};