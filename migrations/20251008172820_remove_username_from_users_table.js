/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
// migrations/20251008_remove_username_from_users.js
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('username');
    t.dropColumn('username_hash');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    // roll back: re-add columns if you ever need them again
    t.binary('username').notNullable();
    t.string('username_hash', 64).notNullable();
    t.unique(['username_hash']);
  });
};