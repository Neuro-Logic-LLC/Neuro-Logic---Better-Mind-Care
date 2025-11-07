// server.js
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const https = require('https');
const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');
const { initGoogle } = require('./auth/OIDC');

const LOCAL_CERT_DIR = path.resolve(__dirname, '../https-on-localhost');

function trimTrailingSlash(value = '') {
  return value.replace(/\/+$/, '');
}

async function loadSSMIntoEnv(pathPrefix) {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2';
  const ssm = new SSMClient({ region });
  const base = pathPrefix.endsWith('/') ? pathPrefix : `${pathPrefix}/`;
  let nextToken;
  do {
    const out = await ssm.send(new GetParametersByPathCommand({
      Path: base,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken,
    }));
    for (const p of out.Parameters || []) {
      const key = (p.Name || '').replace(base, '');
      if (!key) continue;
      if (!(key in process.env)) process.env[key] = p.Value ?? '';
    }
    nextToken = out.NextToken;
  } while (nextToken);

  const got = ['SESSION_SECRET', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
    .filter(k => process.env[k]).join(', ');
  console.log(`[ssm] loaded from ${base} -> ${got || 'none'}`);
}

(async () => {
  const isProd = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT) || 5050;

  const ssmPath = process.env.SSM_PARAMS_PATH || (isProd ? '/bmc/prod' : '/bmc/dev');
  if (process.env.DISABLE_SSM === 'true') {
    console.log('[ssm] Skipping SSM parameter load (DISABLE_SSM=true)');
  } else if (ssmPath) {
    try {
      await loadSSMIntoEnv(ssmPath);
    } catch (err) {
      if (isProd) throw err;
      console.warn(`[ssm] Failed to load ${ssmPath}: ${err.message}. Using existing env vars.`);
    }
  }

  if (!process.env.SESSION_SECRET) {
    if (isProd) throw new Error('SESSION_SECRET missing after env bootstrap');
    console.warn('[env] SESSION_SECRET missing, using dev fallback. Do not use in production.');
    process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-secret-change-me';
  }

  const wantsHttpsLocal = !isProd && process.env.LOCAL_HTTPS !== 'false';
  const keyPath = process.env.LOCAL_HTTPS_KEY || path.join(LOCAL_CERT_DIR, 'privkey.pem');
  const certPath = process.env.LOCAL_HTTPS_CERT || path.join(LOCAL_CERT_DIR, 'fullchain.pem');
  const haveCerts = fs.existsSync(keyPath) && fs.existsSync(certPath);
  const useHttps = wantsHttpsLocal && haveCerts;
  if (wantsHttpsLocal && !haveCerts) {
    console.warn('[https] Local TLS certs not found, falling back to HTTP.');
  }

  const envBase = trimTrailingSlash(
    process.env.BACKEND_PUBLIC_URL
    || process.env.GOOGLE_REDIRECT_BASE
    || ''
  );
  const fallbackBase = isProd
    ? 'https://staging.bettermindcare.com'
    : `${useHttps ? 'https' : 'http'}://localhost:${port}`;
  const base = trimTrailingSlash(envBase || fallbackBase);

  if (!process.env.BACKEND_PUBLIC_URL && base) {
    process.env.BACKEND_PUBLIC_URL = base;
  }

  const app = require('./app');

  await initGoogle({ base });

  const onListen = () => {
    console.log(`🚀 Server running on ${base}`);
  };

  if (useHttps) {
    const credentials = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    https.createServer(credentials, app).listen(port, onListen);
  } else {
    app.listen(port, onListen);
  }
})().catch(err => {
  console.error('[server] fatal startup error:', err);
  process.exit(1);
});
