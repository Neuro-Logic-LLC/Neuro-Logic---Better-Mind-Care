// migrations/20250731154000_create_password_resets_table.js

const crypto = require('crypto');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('password_resets', table => {
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash').primary(); // hashed token, not raw
    table.timestamp('expires_at').notNullable();
    table.timestamp('used_at'); // optional
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('password_resets');
};