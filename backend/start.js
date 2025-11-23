// backend/start-ssm.js

// --- keep AWS TLS sane (don’t let OpenSSL globals break outbound HTTPS) ---
delete process.env.SSL_CERT_FILE;
delete process.env.SSL_CERT_DIR;
process.env.AWS_CA_BUNDLE = process.env.AWS_CA_BUNDLE
  || '/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem';

const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

async function loadSSMIntoEnv({
  path,
  region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-2',
  recursive = true,
  decrypt = true,
  stripPrefix = true,
  // set to true ONLY if you want process.env to win over SSM
    lockExistingEnv = false,
}) {
  if (!path) throw new Error('SSM_PARAMS_PATH missing');
  const ssm = new SSMClient({ region });

  const norm = path.endsWith('/') ? path : path + '/';
  let nextToken, count = 0;

  do {
    const out = await ssm.send(new GetParametersByPathCommand({
      Path: norm,
      Recursive: recursive,
      WithDecryption: decrypt,
      NextToken: nextToken,
    }));

    for (const p of (out.Parameters || [])) {
      const full = p.Name || '';
      const key = stripPrefix ? full.replace(new RegExp('^' + norm), '') : full;
      if (!key) continue;
      if (!lockExistingEnv || !(key in process.env)) {
        process.env[key] = p.Value ?? '';
      }
      count++;
    }
    nextToken = out.NextToken;
  } while (nextToken);

  return count;
}

(async () => {
  const path = process.env.SSM_PARAMS_PATH; // e.g. /bmc/prod
  const n = await loadSSMIntoEnv({ path });
  console.log(`[startup] Loaded ${n} SSM params from ${path}`);

  // sensible fallback: allow either key to satisfy the app
  if (!process.env.JWT_SECRET && process.env.SESSION_SECRET) {
    process.env.JWT_SECRET = process.env.SESSION_SECRET;
  }

  // Fail fast if required keys still missing
  const required = (process.env.REQUIRED_ENV_VARS
      || 'GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,JWT_SECRET'
    ).split(',').map(s => s.trim()).filter(Boolean);

  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error('[startup] Missing required env from SSM:', missing);
    process.exit(1);
  }

  // Helpful breadcrumb
  console.log('[startup] Keys present:',
    ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','JWT_SECRET','SESSION_SECRET']
      .filter(k => process.env[k]).join(', ')
  );

  // Start your server
  require('./server');
})().catch(err => {
  console.error('[startup] fatal:', err);
  process.exit(1);
});
    