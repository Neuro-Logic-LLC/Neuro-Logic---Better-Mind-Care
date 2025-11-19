exports.up = function(knex) {
  return knex.schema.createTable('messages', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('recipient_id').nullable().references('id').inTable('users').onDelete('CASCADE');
    table.enum('sender_type', ['system', 'admin', 'clinician']).notNullable();
    table.enum('category', ['system_update', 'announcement', 'one_to_one']).notNullable();
    table.string('title').notNullable();
    table.text('body').notNullable(); // HTML sanitized content
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('send_at').nullable(); // For scheduled messages
    table.boolean('is_sent').defaultTo(false); // For scheduled messages

    // Indexes
    table.index(['recipient_id']);
    table.index(['category']);
    table.index(['created_at']);
    table.index(['send_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('messages');
};