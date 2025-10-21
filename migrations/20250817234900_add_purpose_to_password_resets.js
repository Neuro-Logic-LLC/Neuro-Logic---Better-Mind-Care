// migrations/20250817_add_purpose_to_password_resets.js
exports.up = async (knex) => {
  await knex.schema.alterTable('password_resets', (t) => {
    t.text('purpose').notNullable().defaultTo('reset');
  });
  await knex.schema.alterTable('password_resets', (t) => {
    t.index(['token_hash'], 'password_resets_token_hash_idx');
    t.index(['expires_at'], 'password_resets_expires_at_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('password_resets', (t) => {
    t.dropIndex(['token_hash'], 'password_resets_token_hash_idx');
    t.dropIndex(['expires_at'], 'password_resets_expires_at_idx');
    t.dropColumn('purpose');
  });
};