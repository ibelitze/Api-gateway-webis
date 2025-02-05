const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser =require('body-parser');
const {PORT} = require('./utils/configs/config');
const midlleware = require('./src/middlewares/gateway_middleware');
const loginOauth2 = require('./utils/loginOAuth');
const testUrl = require('./utils/testUrl');
const { securityMiddleware } = require('./utils/middlewares');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('../swagger-api-docs.js');


const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json({limit: '35mb'}));
app.use('/app/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/login/oauth2', securityMiddleware, loginOauth2);
app.use('/gateway', securityMiddleware, midlleware);
app.use('/testurl', securityMiddleware, testUrl);
app.use(express.urlencoded({
    extended: false, // Whether to use algorithm that can handle non-flat data strutures
    limit: 1000000, // Limit payload size in bytes
    parameterLimit: 10, // Limit number of form items on payload
 }))

// Start Server
app.listen(process.env.PORT || PORT, () => {
    console.log(`Server started on port ${PORT}`);
})
