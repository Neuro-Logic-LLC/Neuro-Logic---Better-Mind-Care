/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex('roles').insert({
    id: '00000000-0000-0000-0000-000000000003',
    role_name: 'SuperAdmin'
  });

  // Add email confirmation fields to users table
  await knex.schema.alterTable('users', table => {
    table.binary('confirmation_token_encrypted'); // encrypted token (bytea)
    table.boolean('is_email_confirmed').notNullable().defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Remove the fields first
  await knex.schema.alterTable('users', table => {
    table.dropColumn('confirmation_token_encrypted');
    table.dropColumn('is_email_confirmed');
  });
  // Then remove the SuperAdmin role
  await knex('roles').where('id', '00000000-0000-0000-0000-000000000003').del();
};
