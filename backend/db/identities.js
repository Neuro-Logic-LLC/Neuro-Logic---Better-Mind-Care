const initKnex = require('./initKnex');

async function upsertIdentity({ userId, provider, providerUserId, email, emailVerified }) {
  const knex = await initKnex();
  const row = {
    user_id: userId,
    provider,
    provider_user_id: providerUserId,
    email: email?.toLowerCase() || null,
    email_verified: !!emailVerified,
    last_login_at: knex.fn.now(),
  };

  await knex('identities')
    .insert(row)
    .onConflict(['provider', 'provider_user_id'])
    .merge({
      email: row.email,
      email_verified: row.email_verified,
      last_login_at: row.last_login_at,
      user_id: row.user_id,
    });

  return knex('users').where({ id: userId }).first('id');
}

module.exports = { upsertIdentity };