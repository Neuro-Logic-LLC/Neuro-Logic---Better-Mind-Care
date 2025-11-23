const loadSSMParams = require('./utils/loadSSMParams');
loadSSMParams();
require('dotenv').config();
const fs = require('fs');
const https = require('https');
const path = require('path');
const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');
const { initGoogle } = require('./auth/OIDC');

// === Load AWS SSM Parameters ===
async function loadSSMIntoEnv(pathPrefix) {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2';
  const ssm = new SSMClient({ region });
  const base = pathPrefix.endsWith('/') ? pathPrefix : pathPrefix + '/';
  let nextToken;

  do {
    const out = await ssm.send(
      new GetParametersByPathCommand({
        Path: base,
        Recursive: true,
        WithDecryption: true,
        NextToken: nextToken
      })
    );
    for (const p of out.Parameters || []) {
      const k = p.Name.replace(base, '');
      if (!(k in process.env)) process.env[k] = p.Value ?? '';
    }

    nextToken = out.NextToken;
  } while (nextToken);

  const got = ['SESSION_SECRET', 'JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
    .filter(k => process.env[k])
    .join(', ');
  console.log(`[ssm] loaded from ${base} -> ${got || 'none'}`);
}

(async () => {
  const isProd = process.env.NODE_ENV === 'production';
  const ssmPath = isProd ? '/bmc/prod' : '/bmc/dev';
  await loadSSMIntoEnv(ssmPath);

  if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET missing after SSM load');

  const app = require('./app'); // env is ready now

  // Init OIDC AFTER env is present. Base is just for redirectUri construction.
  const base = isProd ? 'https://staging.bettermindcare.com' : 'https://localhost:5050';

  const PORT = process.env.PORT || 5050;

  let keyPath, certPath;

  // Prefer env vars

  // Check production certs first
  const prodKey = '/etc/letsencrypt/live/staging.bettermindcare.com/privkey.pem';
  const prodCert = '/etc/letsencrypt/live/staging.bettermindcare.com/fullchain.pem';

  if (fs.existsSync(prodKey) && fs.existsSync(prodCert)) {
    keyPath = prodKey;
    certPath = prodCert;
  } else {
    // Local dev fallback
    keyPath = path.resolve(__dirname, '../https-on-localhost/privkey.pem');
    certPath = path.resolve(__dirname, '../https-on-localhost/fullchain.pem');
  }

  // Verify they exist
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.warn('⚠️  SSL key/cert not found, falling back to HTTP.');
    app.listen(PORT, () => {
      console.log(`🚀 HTTPS server running on http://localhost:${PORT}`);
    });
    return;
  }

  const key = fs.readFileSync(keyPath);
  const cert = fs.readFileSync(certPath);

  https.createServer({ key, cert }, app).listen(PORT, () => {
    console.log(`🚀 HTTPS server running on ${base}`);
  });
})();
