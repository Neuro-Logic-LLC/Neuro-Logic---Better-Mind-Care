/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('stripe_payments', function (table) {
    table.string('customer_email');
  });
};

exports.down = function (knex) {
  return knex.schema.table('stripe_payments', function (table) {
    table.dropColumn('customer_email');
  });
};
