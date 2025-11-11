module.exports = {
  apps: [{
    name: "bmc-api",
    cwd: __dirname,
    script: "./backend/start.js",        // <-- use the wrapper now
    instances: 1,
    exec_mode: "fork",
    watch: false,
    env_production: {
      NODE_ENV: "production",
      PORT: "5050",
      ENABLE_TLS: "true",
      TRUST_PROXY: "1",
      RUN_AS_LIBRARY: "1",
      SSL_CERT_FILE: "/bmc/prod/certs/fullchain.pem",
      SSL_KEY_FILE: "/bmc/prod/certs/privkey.pem",
      // Optional: Google service account email (for internal users)
      GOOGLE_APPLICATION_CREDENTIALS: "/opt/bmc/aws-wif.json",
      // --- SSM config (important) ---
      SSM_PARAMS_PATH: "/bmc/prod",   // or /bmc/prod
      // Optional comma list; startup will exit if any are missing:
      REQUIRED_ENV_VARS: "GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,JWT_SECRET"
    }
  }]
};
