// migrations/XXXXXXXXXXXXXX_enforce_user_hash_uniqueness.js
exports.up = async function (knex) {
  // safety check: no nulls left
  const row = await knex("users")
    .whereNull("email_hash")
    .orWhereNull("username_hash")
    .count({ c: "*" })
    .first();
  if (Number(row.c) > 0) {
    throw new Error(`Backfill incomplete: ${row.c} rows missing hashes`);
  }

  await knex.schema.alterTable("users", (t) => {
    t.string("email_hash", 64).notNullable().alter();
    t.string("username_hash", 64).notNullable().alter();
  });

  // drop old unique on encrypted email, since we now rely on hashes
  await knex.raw('ALTER TABLE "public"."users" DROP CONSTRAINT IF EXISTS users_email_key');
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (t) => {
    t.string("email_hash", 64).nullable().alter();
    t.string("username_hash", 64).nullable().alter();
  });
  await knex.raw('ALTER TABLE "public"."users" ADD CONSTRAINT users_email_key UNIQUE (email)');
};