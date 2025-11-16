/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const exists = await knex.schema.hasColumn("users", "has_paid");
  if (!exists) {
    await knex.schema.alterTable("users", (t) => {
      t.boolean("has_paid").notNullable().defaultTo(false);
    });
  }
};

exports.down = async function (knex) {
  const exists = await knex.schema.hasColumn("users", "has_paid");
  if (exists) {
    await knex.schema.alterTable("users", (t) => {
      t.dropColumn("has_paid");
    });
  }
};