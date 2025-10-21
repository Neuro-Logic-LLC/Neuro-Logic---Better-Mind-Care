const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const common = {
    match: [
      /^\/api(\/|$)/,
    ],
    target: 'https://localhost:5050',
    changeOrigin: true,
    secure: false,          // accept mkcert
    logLevel: 'debug'
  };
  app.use('/api',  createProxyMiddleware(common));
  app.use('/docs', createProxyMiddleware(common));
};