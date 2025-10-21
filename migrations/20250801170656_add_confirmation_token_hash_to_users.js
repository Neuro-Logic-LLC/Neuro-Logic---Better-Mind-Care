exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.text('confirmation_token_hash').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('confirmation_token_hash');
  });
};