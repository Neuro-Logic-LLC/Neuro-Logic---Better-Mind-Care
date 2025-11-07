module.exports.up = async function(knex) {
  await knex.raw(`
    ALTER TABLE public.evexia_webhook_events
      ADD COLUMN IF NOT EXISTS headers_json jsonb,
      ADD COLUMN IF NOT EXISTS query_json   jsonb,
      ADD COLUMN IF NOT EXISTS body_blob    bytea;
  `);
}

module.exports.down = async function(knex) {
  await knex.raw(`
    ALTER TABLE public.evexia_webhook_events
      DROP COLUMN IF EXISTS headers_json,
      DROP COLUMN IF EXISTS query_json,
      DROP COLUMN IF EXISTS body_blob;
  `);
}