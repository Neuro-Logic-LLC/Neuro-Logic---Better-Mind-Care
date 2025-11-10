/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.schema.alterTable('stripe_payments', (table) => {
    table.integer('user_id').nullable().alter();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('stripe_payments', (table) => {
    table.integer('user_id').notNullable().alter();
  });
}
