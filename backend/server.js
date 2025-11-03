require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');
const { initGoogle } = require('./auth/OIDC');

async function loadSSMIntoEnv(pathPrefix) {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2';
  const ssm = new SSMClient({ region });
  const base = pathPrefix.endsWith('/') ? pathPrefix : pathPrefix + '/';
  let nextToken;
  do {
    const out = await ssm.send(new GetParametersByPathCommand({
      Path: base, Recursive: true, WithDecryption: true, NextToken: nextToken
    }));
    for (const p of out.Parameters || []) {
      const k = p.Name.replace(base, '');
      if (!(k in process.env)) process.env[k] = p.Value ?? '';
    }
    nextToken = out.NextToken;
  } while (nextToken);

  const got = ['SESSION_SECRET','JWT_SECRET','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']
    .filter(k => process.env[k])
    .join(', ');
  console.log(`[ssm] loaded from ${base} -> ${got || 'none'}`);
}

(async () => {
  const isProd = process.env.NODE_ENV === 'production';
  const ssmPath = isProd ? '/bmc/prod' : '/bmc/dev';
  await loadSSMIntoEnv(ssmPath);

  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET missing after SSM load');
  }

  const app = require('./app'); // Now load the Express/Koa/etc app after environment is ready

  // Init OIDC AFTER env is present
  const base = isProd
    ? 'https://staging.bettermindcare.com'
    : 'http://localhost:5050';
  await initGoogle({ base });

  const PORT = process.env.PORT || 5050;

  if (isProd) {
    // Production: HTTPS server
    const keyFile  = process.env.SSL_KEY_FILE  || path.resolve(__dirname, '../https-on-localhost/key.pem');
    const certFile = process.env.SSL_CERT_FILE || path.resolve(__dirname, '../https-on-localhost/cert.pem');
    const key  = fs.readFileSync(keyFile);
    const cert = fs.readFileSync(certFile);

    https.createServer({ key, cert }, app).listen(PORT, () => {
      console.log(`🚀 HTTPS server running on ${base}`);
    });
  } else {
    // Development / local: HTTP server
    http.createServer(app).listen(PORT, () => {
      console.log(`🚀 HTTP server running on ${base}`);
    });
  }
})();
