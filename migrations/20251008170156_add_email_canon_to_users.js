/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  // make sure pgcrypto exists
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  // add column if missing
  const hasColumn = await knex.schema.hasColumn('users', 'email_canon');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (t) => {
      t.text('email_canon').nullable();
    });
  }

  // backfill from encrypted email using ENC_KEY
  // if ENC_KEY is not set, skip backfill
  if (process.env.ENC_KEY) {
    await knex.raw(
      `
      UPDATE public.users
      SET email_canon = lower(pgp_sym_decrypt(email, ?))
      WHERE email IS NOT NULL
        AND email_canon IS NULL
      `,
      [process.env.ENC_KEY]
    );
  }

  // index it. pick one:
  // plain index for fast lookups
  await knex.raw('CREATE INDEX IF NOT EXISTS idx_users_email_canon ON public.users (email_canon);');

  // if you want to enforce uniqueness instead, comment the line above and use this:
  // await knex.raw('CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_canon ON public.users (email_canon);');
};

exports.down = async function down(knex) {
  // drop index if it exists
  await knex.raw('DROP INDEX IF EXISTS ux_users_email_canon;');
  await knex.raw('DROP INDEX IF EXISTS idx_users_email_canon;');

  // drop column
  const hasColumn = await knex.schema.hasColumn('users', 'email_canon');
  if (hasColumn) {
    await knex.schema.alterTable('users', (t) => {
      t.dropColumn('email_canon');
    });
  }
};
