const loadSSMParams = require('./loadSSMParams');
const {
  SESClient,
  SendEmailCommand
} = require('@aws-sdk/client-ses');

let ses = null;

async function getSES() {
  if (!ses) {
    await loadSSMParams([
      '/bmc/shared/',
      process.env.NODE_ENV === 'production' ? '/bmc/prod/' : '/bmc/dev/'
    ]);

    ses = new SESClient({
      region: process.env.AWS_SES_REGION || 'us-east-2'
    });
  }
  return ses;
}

const FROM = `BetterMindCare <no-reply@bettermindcare.com>`;

// ------------------------------
// SEND MFA
// ------------------------------
exports.sendMfaCode = async (to, code) => {
  const ses = await getSES();
  const params = {
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: 'Your MFA Code' },
      Body: {
        Html: {
          Data: `<p>Your secure login code is: <b>${code}</b></p>`
        }
      }
    },
    Source: FROM
  };

  try {
    await ses.send(new SendEmailCommand(params));
  } catch (err) {
    console.error('❌ MFA email failed:', err);
    throw err;
  }
};

// ------------------------------
// PASSWORD RESET
// ------------------------------
exports.sendPasswordResetEmail = async (to, resetLink) => {
  const ses = await getSES();
  const params = {
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: 'Reset Your Password' },
      Body: {
        Html: {
          Data: `
            <p>You requested to reset your password.</p>
            <p><a href="${resetLink}" style="background:#333;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Reset Password</a></p>
            <p>If you didn't request this, you can safely ignore it.</p>
          `
        }
      }
    },
    Source: FROM
  };

  try {
    await ses.send(new SendEmailCommand(params));
  } catch (err) {
    console.error('❌ Password reset email failed:', err);
  }
};

// ------------------------------
// EMAIL CONFIRMATION
// ------------------------------
exports.sendEmailConfirmation = async (to, token) => {
  const ses = await getSES();
  const confirmLink = `${process.env.FRONTEND_URL}/confirm-email?token=${token}`;

  const params = {
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: 'Confirm Your Email Address' },
      Body: {
        Html: {
          Data: `
            <p>Thank you for signing up with BetterMindCare!</p>
            <p>Please confirm your email by clicking below:</p>
            <p><a href="${confirmLink}" style="background:#007bff;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Confirm My Email</a></p>
            <p>If you didn’t create this account, you can ignore this message.</p>
          `
        }
      }
    },
    Source: FROM
  };

  try {
    await ses.send(new SendEmailCommand(params));
  } catch (err) {
    console.error('❌ Confirmation email failed:', err);
  }
};

// ------------------------------
// USERNAME REMINDER (RARELY USED)
// ------------------------------
exports.sendUsernameReminder = async (to, username) => {
  const ses = await getSES();
  const loginUrl = `${(process.env.FRONTEND_URL || '').replace(/\/$/, '')}/login`;

  const params = {
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: 'Your Username Reminder' },
      Body: {
        Html: {
          Data: `
            <p>You requested a reminder of your username.</p>
            <p><strong>Username:</strong> ${username}</p>
            <p><a href="${loginUrl}" style="background:#333;color:#fff;padding:10px 15px;text-decoration:none;border-radius:4px;">Go to Sign In</a></p>
            <p>If you didn’t request this, you can ignore this message.</p>
          `
        }
      }
    },
    Source: FROM
  };

  try {
    await ses.send(new SendEmailCommand(params));
  } catch (err) {
    console.error('❌ Username reminder email failed:', err);
  }
};
