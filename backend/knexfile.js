// knexfile.js
const loadSSMParams = require('./utils/loadSSMParams');
let cached = false;

async function getConnection() {
  if (!cached) {
    await loadSSMParams(); // Loads from SSM and sets process.env
    cached = true;
  }

  const sslRequired = process.env.DB_SSL ===   'true';

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(sslRequired && {
      ssl: {
        rejectUnauthorized: false, // disable cert verification for self-signed or default RDS certs
      },
    }),
  };
}

module.exports = {
  development: {
    client: 'pg',
    connection: getConnection,
    migrations: {
      directory: '../migrations',
    },
  },
  production: {
    client: 'pg',
    connection: getConnection,
    migrations: {
      directory: '../migrations',
    },
  },
};