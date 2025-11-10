/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasConstraint = await knex.raw(`
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_google_tokens_user_id_unique'
  `);

  if (hasConstraint.rows.length === 0) {
    await knex.schema.alterTable('user_google_tokens', (table) => {
      table.unique(['user_id'], 'user_google_tokens_user_id_unique');
    });
    console.log('[Migration] Added unique constraint on user_google_tokens.user_id');
  } else {
    console.log('[Migration] Unique constraint already exists, skipping');
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.alterTable('user_google_tokens', (table) => {
    table.dropUnique(['user_id'], 'user_google_tokens_user_id_unique');
  });
  console.log('[Migration] Removed unique constraint on user_google_tokens.user_id');
};
