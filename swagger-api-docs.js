const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Documentación Webis.io',
      version: '1.0.0',
      description: 'Documentación de rutas habilitadas para la Api Gateway',
    },
  },
  apis: [
    'app/src/middlewares/*.js'
  ],
};

const swaggerDocs = swaggerJsdoc(options);
module.exports = swaggerDocs;