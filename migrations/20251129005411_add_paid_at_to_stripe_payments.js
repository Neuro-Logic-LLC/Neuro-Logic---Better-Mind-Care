/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('stripe_payments', function (table) {
    table.timestamp('paid_at').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('stripe_payments', function (table) {
    table.dropColumn('paid_at');
  });
};