const fs = require('fs');
const https = require('https');
const app = require('./server-app'); // export your Express app from server

https.createServer({
  key:  fs.readFileSync('./localhost-key.pem'),
  cert: fs.readFileSync('./localhost.pem'),
}, app).listen(5050, () => {
  console.log('API on https://localhost:5050');
});