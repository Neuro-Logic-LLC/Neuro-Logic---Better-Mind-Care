/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.boolean('has_paid').defaultTo(false);
    table.binary('first_name'); // store encrypted values
    table.binary('last_name');  // store encrypted values
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('users', table => {
    table.dropColumn('has_paid');
    table.dropColumn('first_name');
    table.dropColumn('last_name');
  });
};
