/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('system_google_tokens', table => {
    table.increments('id').primary();

    table.text('access_token').notNullable();
    table.text('refresh_token').notNullable();

    table.timestamp('expiry').notNullable();   // When the token expires

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('system_google_tokens');
};
