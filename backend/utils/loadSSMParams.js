// src/utils/loadSSMParams.js
const {
  SSMClient,
  GetParametersByPathCommand,
} = require('@aws-sdk/client-ssm');
const { fromInstanceMetadata, fromIni } = require('@aws-sdk/credential-providers');

// 🌎 Normalize common NODE_ENV values
const rawEnv = process.env.NODE_ENV || 'dev';
const ssmEnv = {
  dev: 'dev',
  development: 'dev',
  prod: 'prod',
  production: 'prod',
}[rawEnv] || rawEnv;

const region = process.env.AWS_REGION || 'us-east-2';
const credentials =
  ssmEnv === 'prod' ? fromInstanceMetadata() : fromIni({ profile: process.env.AWS_PROFILE || 'default' });

const ssm = new SSMClient({ region, credentials });

async function fetchParams(path) {
  const collected = [];
  let NextToken;
  do {
    const cmd = new GetParametersByPathCommand({
      Path: path,
      Recursive: true,
      WithDecryption: true,
      NextToken,
    });
    const res = await ssm.send(cmd);
    collected.push(...(res.Parameters || []));
    NextToken = res.NextToken;
  } while (NextToken);
  return collected;
}

async function loadSSMParams() {
  const paths = [`/bmc/shared/`, `/bmc/${ssmEnv}/`];

  for (const path of paths) {
    try {
      const params = await fetchParams(path);

      params.forEach(({ Name, Value }) => {
        const key = Name.split('/').pop();

        // Trim common troublemakers (newlines/whitespace). Safer app-wide.
        const clean =
          typeof Value === 'string' ? Value.replace(/\r?\n/g, '').trim() : Value;

        const prev = process.env[key];
        process.env[key] = clean;

        const maskedKeys = new Set([
          'DB_PASS',
          'DB_PASSWORD',
          'JWT_SECRET',
          'PGPCRYPTO_KEY',
          'GOOGLE_CLIENT_SECRET',
          'EMAIL_PASS',
          'WOOCOMMERCE_WEBHOOK_SECRET',
        ]);
        const show = maskedKeys.has(key) ? '<redacted>' : clean;
        if (prev !== undefined) {
        } else {
        }
      });


    } catch (err) {
      console.error(`❌ Failed to load SSM params from ${path}:`, err.message);
    }
  }

  return true;
}

module.exports = loadSSMParams;
