/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.table("users", function (table) {
    table.string("mfa_code");
    table.timestamp("mfa_expires_at");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table("users", function (table) {
    table.dropColumns("mfa_code", "mfa_expires_at");
  });
};
