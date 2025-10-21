  // backend/utils/providers.js
  // Minimal provider registry. Extend as you add more doctors.
  const PROVIDERS = {
    jim: {
      email: 'jim@bettermindcare.com',
      calendarId: process.env.PROVIDER_JIM_CALENDAR_ID || process.env.CALENDAR_ID || 'primary',
      tz: process.env.PROVIDER_JIM_TZ || process.env.JIM_TZ || process.env.TZ || 'America/Chicago',
      workHours: { start: 9, end: 17 }, // 9am–5pm local time
      // Prefer SSM-loaded env var:
      refreshToken: process.env.PROVIDER_JIM_GOOGLE_REFRESH_TOKEN_CAL || process.env.GOOGLE_REFRESH_TOKEN_CAL
    }
  };

  function getProvider(key) {
    const p = PROVIDERS[key];
    if (!p) throw new Error(`unknown_provider:${key}`);
    if (!p.refreshToken) throw new Error(`missing_refresh_token_for:${key}`);
    return p;
  }

  module.exports = { getProvider };