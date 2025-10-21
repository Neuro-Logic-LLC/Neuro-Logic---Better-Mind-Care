// migrations/20251020_create_lab_results.js
/**
 * @param { import('knex').Knex } knex
 */
export async function up(knex) {
  await knex.schema.createTable('lab_results', (t) => {
    t.increments('id').primary();

    t.integer('patient_id').notNullable();
    t.integer('patient_order_id').notNullable().unique(); // for upsert key
    t.text('external_client_id');
    t.text('specimen');

    t.timestamp('create_date');
    t.timestamp('collection_date');

    // store the decoded PDF bytes
    t.binary('report_pdf'); // Postgres: BYTEA

    // if you ALSO want to keep the original base64 for debugging, uncomment:
    // t.text('report_base64');

    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Helpful index if you’ll query by patient
  await knex.schema.alterTable('lab_results', (t) => {
    t.index(['patient_id']);
  });
}

/**
 * @param { import('knex').Knex } knex
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists('lab_results');
}