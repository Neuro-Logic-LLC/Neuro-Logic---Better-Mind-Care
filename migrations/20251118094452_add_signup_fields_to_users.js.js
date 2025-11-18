/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    // patient date of birth (encrypted)
    table.binary("dob");

    // caregiver flag (NOT encrypted, safe)
    table.boolean("is_caregiver").defaultTo(false);

    // encrypted caregiver PII
    table.binary("cg_first");
    table.binary("cg_last");
    table.binary("cg_phone");
    table.binary("cg_email");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("dob");
    table.dropColumn("is_caregiver");
    table.dropColumn("cg_first");
    table.dropColumn("cg_last");
    table.dropColumn("cg_phone");
    table.dropColumn("cg_email");
  });
};
