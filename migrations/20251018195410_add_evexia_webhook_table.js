/**
* @param { import("knex").Knex } knex
 */

exports.up = async function (knex) {
  await knex.schema.createTable('evexia_webhook_events', (table) => {
    table.text('event_id').primary();
    table.text('patient_id').index();
    table.text('patient_order_id').index();
    table.text('content_type');
    table.jsonb('body_json');
    table.text('body_text');
    table.timestamp('received_at').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('lab_webhook_events');
};