const knex = require('knex');
const knexfile = require('../knexfile');

let db;

const initKnex = async () => {
  if (db) return db; // Reuse existing instance

  // Normalize environment (e.g. 'prod' → 'production')
  const rawEnv = process.env.NODE_ENV || 'dev';
  const env =
    {
      dev: 'development',
      development: 'development',
      prod: 'production',
      production: 'production'
    }[rawEnv] || rawEnv;

  const config = knexfile[env];

  if (!config) {
    throw new Error(`❌ No knex config found for environment: '${env}'`);
  }

  if (typeof config.connection === 'function') {
    const resolvedConnection = await config.connection();
    db = knex({ ...config, connection: resolvedConnection });
  } else {
    db = knex(config);
  }

  return db;
};

module.exports = initKnex;
