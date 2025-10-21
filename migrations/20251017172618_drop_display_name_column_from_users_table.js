exports.up = async function (knex) {
  // 1) Add Doctor role if missing
  const doctorExists = await knex('roles').where({ role_name: 'Doctor' }).first();
  if (!doctorExists) {
    await knex('roles').insert({
      id: '00000000-0000-0000-0000-000000000004', // use next UUID pattern or gen_random_uuid()
      role_name: 'Doctor',
      date_created: knex.fn.now()
    });
    console.log('✅ Added Doctor role');
  } else {
    console.log('ℹ️ Doctor role already exists');
  }

  // 2) Drop obsolete columns if present
  const hasPaidExists = await knex.schema.hasColumn('users', 'has_paid');
  const displayNameExists = await knex.schema.hasColumn('users', 'display_name');

  await knex.schema.table('users', (table) => {
    if (hasPaidExists) {
      table.dropColumn('has_paid');
      console.log('✅ Dropped has_paid column');
    }
    if (displayNameExists) {
      table.dropColumn('display_name');
      console.log('✅ Dropped display_name column');
    }
  });
};

exports.down = async function (knex) {
  // 1) Remove Doctor role
  await knex('roles').where({ role_name: 'Doctor' }).del();

  // 2) Restore has_paid and display_name if missing
  const hasPaidMissing = !(await knex.schema.hasColumn('users', 'has_paid'));
  const displayNameMissing = !(await knex.schema.hasColumn('users', 'display_name'));

  await knex.schema.table('users', (table) => {
    if (hasPaidMissing) {
      table.boolean('has_paid').notNullable().defaultTo(false);
      console.log('🔄 Restored has_paid column');
    }
    if (displayNameMissing) {
      table.string('display_name').nullable();
      console.log('🔄 Restored display_name column');
    }
  });
};  