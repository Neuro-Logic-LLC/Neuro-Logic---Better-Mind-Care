// lib/googleServiceAccount.js
const { google } = require('googleapis');

function getServiceAccountClient(impersonateEmail) {
  const auth = new google.auth.JWT({
    email: 'bmc-calendar-access@tactical-prism-468521-f6.iam.gserviceaccount.com',
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
    subject: 'jim@bettermindcare.com', // e.g. jim@bettermindcare.com
  });
  return google.calendar({ version: 'v3', auth });
}

module.exports = { getServiceAccountClient };
