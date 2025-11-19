exports.up = function(knex) {
  return knex.schema.createTable('message_read_states', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('message_id').notNullable().references('id').inTable('messages').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('read_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Composite unique constraint to prevent duplicate read states
    table.unique(['message_id', 'user_id']);
    table.index(['user_id']);
    table.index(['read_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('message_read_states');
};