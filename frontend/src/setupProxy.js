const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const isProd = process.env.NODE_ENV === 'production';

  const target = isProd
    ? 'https://staging.bettermindcare.com'
    : 'https://localhost:5050';

  const common = {
    target,
    changeOrigin: true,
    secure: false, // ignore self-signed certs (safe for local only)
    logLevel: 'debug',
  };

  app.use('/api', createProxyMiddleware(common));
  app.use('/docs', createProxyMiddleware(common));
};