const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const common = {
    match: [/^\/api(\/|$)/],
    target: 'http://localhost:5050',
    changeOrigin: true,
    logLevel: 'debug'
  };
  app.use('/api', createProxyMiddleware(common));
  app.use('/docs', createProxyMiddleware(common));
};
