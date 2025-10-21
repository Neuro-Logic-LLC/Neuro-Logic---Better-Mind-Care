// knex migrate:make add_doctor_and_drop_has_paid
exports.up = async function (knex) {
  // 1) Insert Doctor role if it doesn't exist
  const exists = await knex('roles').where({ role_name: 'Doctor' }).first();
  if (!exists) {
    await knex('roles').insert({
      id: '00000000-0000-0000-0000-000000000004', // next sequential GUID-style ID
      role_name: 'Doctor',
      date_created: knex.fn.now()
    });
    console.log('✅ Added Doctor role');
  } else {
    console.log('ℹ️ Doctor role already exists');
  }

  // 2) Drop has_paid column if present
  const hasColumn = await knex.schema.hasColumn('users', 'has_paid');
  if (hasColumn) {
    await knex.schema.table('users', (t) => {
      t.dropColumn('has_paid');
    });
    console.log('✅ Dropped has_paid column from users');
  } else {
    console.log('ℹ️ has_paid column already removed');
  }
};

exports.down = async function (knex) {
  // Revert changes
  await knex('roles').where({ role_name: 'Doctor' }).del();

  const hasColumn = await knex.schema.hasColumn('users', 'has_paid');
  if (!hasColumn) {
    await knex.schema.table('users', (t) => {
      t.boolean('has_paid').notNullable().defaultTo(false);
    });
  }
  console.log('🔄 Reverted Doctor role and restored has_paid column');
};