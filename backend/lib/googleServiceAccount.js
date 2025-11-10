// backend/lib/googleServiceAccount.js
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

async function getServiceAccountClient(impersonateEmail = 'jim@bettermindcare.com') {
  // This tells Google to use the federated credentials from AWS → WIF
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
    // Impersonate the actual service account (the one you granted token creator to)
    clientOptions: {
      subject: impersonateEmail,
    },
  });

  // Authenticate automatically using federation
  const client = await auth.getClient();

  // Now return a usable Calendar API client
  return google.calendar({
    version: 'v3',
    auth: client,
  });
}

module.exports = { getServiceAccountClient };