/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema.createTable('pending_signup', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.string('email').notNullable().unique();

    // Progress flags
    table.boolean('email_ok').notNullable().defaultTo(false);
    table.boolean('stripe_ok').notNullable().defaultTo(false);
    table.boolean('intake_ok').notNullable().defaultTo(false);

    // Magic link
    table.string('magic_token_hash');
    table.timestamp('magic_token_expires_at');

    // Stripe info
    table.string('stripe_customer_id');
    table.string('stripe_checkout_session_id');
    table.string('stripe_payment_intent_id');

    // Timestamps
    table.timestamp('date_created').defaultTo(knex.fn.now());
    table
      .timestamp('date_last_modified')
      .defaultTo(knex.fn.now());
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('pending_signup');
}
