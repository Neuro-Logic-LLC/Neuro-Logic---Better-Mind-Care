const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My Express API',
      version: '1.0.0'
    },
    servers: [
      { url: '/api/evexia', description: 'Evexia router' }
      // add more if you have other routers:
      // { url: "/api", description: "General API" }
    ]
  },
  apis: [path.join(__dirname, 'routes/**/*.js')] // absolute + recursive
};

const swaggerSpec = swaggerJsdoc(options);
const swaggerUiMiddleware = [swaggerUi.serve, swaggerUi.setup(swaggerSpec)];

module.exports = { swaggerSpec, swaggerUiMiddleware };
