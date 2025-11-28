/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('pending_signup', function (table) {
    table.timestamp('checkout_reached_at');
  });
};

exports.down = function (knex) {
    return knex.schema.table('pending_signup', function(table) {
        table.timestamp('checkout_reached_at');
    });
};