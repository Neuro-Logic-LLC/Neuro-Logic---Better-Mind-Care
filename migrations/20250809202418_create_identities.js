// migrations/XXXXXXXXXXXXXX_create_identities.js
exports.up = async function (knex) {
  // ensure pgcrypto for gen_random_uuid() (likely already enabled)
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('identities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .index();
    table.text('provider').notNullable();           // 'google' | 'apple'
    table.text('provider_user_id').notNullable();   // OIDC 'sub'
    table.text('email');                            // lowercased or encrypted later
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('last_login_at').defaultTo(knex.fn.now());

    table.unique(['provider', 'provider_user_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('identities');
};