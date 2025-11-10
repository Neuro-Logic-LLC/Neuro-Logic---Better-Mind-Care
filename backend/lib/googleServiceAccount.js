const { google } = require('googleapis');

function getServiceAccountClient(impersonateEmail = 'jim@bettermindcare.com') {
  const auth = new google.auth.JWT({
    email: 'bmc-calendar-access@tactical-prism-468521-f6.iam.gserviceaccount.com',
    scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.events'],
    subject: impersonateEmail // ← use the function argument!
  });

  return google.calendar({ version: 'v3', auth });
}

module.exports = { getServiceAccountClient };
