// migrations/20251009120000_add_auth_provider_and_sub.js

/**
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.text('auth_provider');
    table.text('auth_sub');
  });

  // Create a partial unique index like:
  // CREATE UNIQUE INDEX users_provider_sub_uniq
  //   ON users(auth_provider, auth_sub)
  //   WHERE auth_provider IS NOT NULL AND auth_sub IS NOT NULL;
  await knex.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_provider_sub_uniq
      ON users(auth_provider, auth_sub)
      WHERE auth_provider IS NOT NULL AND auth_sub IS NOT NULL
  `);
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('auth_provider');
    table.dropColumn('auth_sub');
  });

  await knex.raw(`DROP INDEX IF EXISTS users_provider_sub_uniq`);
};
