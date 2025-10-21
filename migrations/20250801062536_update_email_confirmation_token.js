exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('confirmation_token_encrypted');
    table.text('confirmation_token_hash');
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('confirmation_token_hash');
    table.binary('confirmation_token_encrypted');
  });
};