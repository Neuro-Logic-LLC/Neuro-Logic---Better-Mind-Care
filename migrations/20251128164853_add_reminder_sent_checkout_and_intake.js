/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.table("pending_signup", (table) => {
    table.renameColumn("reminder_sent", "reminder_sent_checkout");
    table.boolean("reminder_sent_intake").notNullable().defaultTo(false);
  });
};

exports.down = async function (knex) {
  await knex.schema.table("pending_signup", (table) => {
    table.renameColumn("reminder_sent_checkout", "reminder_sent");
    table.dropColumn("reminder_sent_intake");
  });
};
