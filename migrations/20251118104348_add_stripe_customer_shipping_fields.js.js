/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('stripe_payments', function (table) {
    table.string('customer_first_name').nullable();
    table.string('customer_last_name').nullable();
    table.string('customer_phone').nullable();

    table.jsonb('shipping_address').nullable();
    table.string('shipping_name').nullable();
    table.string('shipping_phone').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('stripe_payments', function (table) {
    table.dropColumn('customer_first_name');
    table.dropColumn('customer_last_name');
    table.dropColumn('customer_phone');

    table.dropColumn('shipping_address');
    table.dropColumn('shipping_name');
    table.dropColumn('shipping_phone');
  });
};
