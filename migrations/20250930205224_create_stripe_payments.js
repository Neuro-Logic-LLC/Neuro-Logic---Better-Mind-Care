/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async (knex) => {
  await knex.schema.createTable('stripe_payments', (t) => {
    t.increments('id').primary();                         // internal DB ID
    t.string('stripe_session_id').notNullable().unique(); // Stripe Checkout Session ID
    t.string('stripe_payment_intent_id').nullable();      // Stripe PaymentIntent ID
    t.string('user_id').notNullable();                    // internal user ID
    t.string('product_key').notNullable();                // which product was purchased
    t.integer('amount').notNullable();                    // amount in cents
    t.string('currency').notNullable().defaultTo('usd'); // currency
    t.string('status').notNullable().defaultTo('pending'); // pending, paid, failed
    t.jsonb('metadata').nullable();                        // safe, non-PHI metadata
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('stripe_payments', (t) => {
    t.index(['user_id'], 'stripe_payments_user_id_idx');
    t.index(['status'], 'stripe_payments_status_idx');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('stripe_payments');
};