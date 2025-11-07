const loadSSMParams = require('../utils/loadSSMParams');
const FormData = require('form-data');
const Mailgun = require('mailgun.js');

let transporter = null;

async function getTransporter() {
  if (!transporter) {
    await loadSSMParams([
      '/bmc/shared/',
      process.env.NODE_ENV === 'production' ? '/bmc/prod/' : '/bmc/dev/'
    ]);

    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'
    });

    transporter = {
      sendMail: async (mailOptions) => {
        return await mg.messages.create(process.env.MAILGUN_DOMAIN, {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          text: mailOptions.text,
          html: mailOptions.html
        });
      }
    };
  }
  return transporter;
}

// utils/mailer-oauth.js (or wherever this lives)
exports.sendMfaCode = async (to, code) => {
  const transporter = await getTransporter();

  const fromAddr = (process.env.MAILGUN_FROM || '').trim();
  if (!fromAddr) throw new Error('No FROM address: set MAILGUN_FROM');

  const mailOptions = {
    from: `"BetterMindCare" <${fromAddr}>`,
    to,
    subject: 'Your MFA Code',
    text: `Your secure login code is: ${code}`,
    html: `<p>Your secure login code is: <b>${code}</b></p>`
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    // console.log('MFA sent:', info.messageId, info.response);
    return info;
  } catch (err) {
    console.error('❌ MFA email failed:', err);
    throw err;
  }
};

exports.sendPasswordResetEmail = async (to, resetLink) => {
  const transporter = await getTransporter();

  const mailOptions = {
    from: `"BetterMindCare" <${process.env.MAILGUN_FROM}>`,
    to,
    subject: 'Reset Your Password',
    text: `You requested to reset your password.\n\nClick below:\n${resetLink}`,
    html: `
      <p>You requested to reset your password.</p>
      <p><a href="${resetLink}" style="background:#333;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Reset Password</a></p>
      <p>If you didn't request this, you can safely ignore it.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('❌ Password reset email failed:', err);
  }
};

exports.sendEmailConfirmation = async (to, token) => {
  const transporter = await getTransporter();

  const confirmLink = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;
  const mailOptions = {
    from: `"BetterMindCare" <${process.env.MAILGUN_FROM}>`,
    to,
    subject: 'Confirm Your Email Address',
    text: `Thank you for signing up!\n\nPlease confirm your email address:\n${confirmLink}`,
    html: `
      <p>Thank you for signing up with BetterMindCare!</p>
      <p>Please confirm your email by clicking below:</p>
      <p><a href="${confirmLink}" style="background:#007bff;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Confirm My Email</a></p>
      <p>If you didn’t create this account, you can ignore this message.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('❌ Confirmation email failed:', err);
  }
};

exports.sendUsernameReminder = async (to, username) => {
  const transporter = await getTransporter();
  const loginUrl = `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/login`;

  const mailOptions = {
    from: `"BetterMindCare" <${process.env.MAILGUN_FROM}>`,
    to,
    subject: 'Your Username Reminder',
    text: `You requested a reminder of your username.

Username: ${username}

Login here: ${loginUrl}

If you didn’t request this, you can ignore this email.`,
    html: `
      <p>You requested a reminder of your username.</p>
      <p><strong>Username:</strong> ${username}</p>
      <p><a href="${loginUrl}" style="background:#333;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Go to Sign In</a></p>
      <p>If you didn’t request this, you can ignore this message.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('❌ Username reminder email failed:', err);
  }
};
