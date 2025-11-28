/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table('pending_signup', function (table) {
    table.boolean('reminder_sent').notNullable().defaultTo(false);
  });
};

// down
exports.down = function (knex) {
  return knex.schema.table('pending_signup', function (table) {
    table.dropColumn('reminder_sent');
  });
};