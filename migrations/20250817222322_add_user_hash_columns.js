exports.up = async function (knex) {
  await knex.schema.alterTable('users', t => {
    t.string('email_hash', 64).nullable();
    t.string('username_hash', 64).nullable();
  });

  await knex.raw(
    'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_email_hash_uq ON "public"."users"(email_hash)'
  );
  await knex.raw(
    'CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS users_username_hash_uq ON "public"."users"(username_hash)'
  );
};

exports.down = async function (knex) {
  await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS users_email_hash_uq');
  await knex.raw('DROP INDEX CONCURRENTLY IF EXISTS users_username_hash_uq');

  await knex.schema.alterTable('users', t => {
    t.dropColumn('email_hash');
    t.dropColumn('username_hash');
  });
};

exports.config = { transaction: false };
