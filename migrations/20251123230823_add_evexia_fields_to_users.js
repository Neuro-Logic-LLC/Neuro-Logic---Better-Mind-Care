/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.table('users', (t) => {
    t.string('evx_patient_id');
    t.string('evx_patient_order_id');
    t.string('evx_product_id');
  });
};

exports.down = async function (knex) {
  await knex.schema.table('users', (t) => {
    t.dropColumn('evx_patient_id');
    t.dropColumn('evx_patient_order_id');
    t.dropColumn('evx_product_id');
  });
};
