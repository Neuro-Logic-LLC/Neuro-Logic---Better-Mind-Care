// knexfile.js
const loadSSMParams = require('./utils/loadSSMParams');
let cached = false;

async function getConnection() {
  if (!cached) {
    await loadSSMParams(); // Loads from SSM and sets process.env
    cached = true;
  }

  const sslRequired = process.env.NODE_ENV === 'production';

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: sslRequired ? {
      rejectUnauthorized: false, // disable cert verification for self-signed or default RDS certs
    } : false,
  };
}

module.exports = {
  development: {
    client: 'pg',
    connection: async () => {
      const conn = await getConnection();
      return { ...conn, ssl: false }; // Force no SSL for local dev
    },
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