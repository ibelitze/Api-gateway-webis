const router = require('express').Router();


function __grabRequest(req) {
    const ipAddress = (req.headers['x-forwarded-for'] || '').split(',').pop() || 
    req.connection.remoteAddress || 
    req.socket.remoteAddress || 
    req.connection.socket.remoteAddress
    const apiSignatureKey = req.headers['basic_auth'] || ''
    return {
        ip_address: ipAddress,
        basic_auth: apiSignatureKey,
        host: req.headers['host'],
        user_agent: req.headers['user-agent'] || '',
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        query: req.query,
        params: req.params,
        app_id: req.headers['app_id'],
        body: req.body,
        authorization: req.headers['authorization'] || '',
    }
}


router.post('/', (req, res) => {

    const requestsx = __grabRequest(req);

    // let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

    res.status(200).json(requestsx);

});


module.exports = router;