exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email_hash').unique().notNullable();
    // Other columns added by later migrations
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};