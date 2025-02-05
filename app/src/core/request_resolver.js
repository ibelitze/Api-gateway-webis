const fs = require('fs')
const yaml = require('yaml')
const jwt = require('jsonwebtoken')
const { SECRET_KEY } = require('../../utils/configs/config')


function upperize(obj) {
    let newObj = {};
    for (const key in obj) {
        newObj[key.charAt(0).toUpperCase() + key.substring(1)] = obj[key];
    }
    return newObj;
}


function __validateConsumerBasicAuth(req) {
    return new Promise((resolve, reject) => {
        let token = req['authorization'];
        token = token.replace('Bearer ', '');
        jwt.verify(token, SECRET_KEY, function(err, tokn) {
            if (err) {
                reject('Your authentication isn\'t valid');
            }
            else {
                resolve();
            }
        });
    })
}


/* Función que filtra los headers entrantes y deja solamente los autorizados/necesarios */
function _grabExtraHeaders(obj) {
    // Escribir acá los headers autorizados para ser enviados al exterior
    const AllowedHeaders = ['authorization', 'Authorization', 
        'format', 'Content-Type', 'content-type', 'Content-type', 'Connection', 'Accept',
        'url', 'grant_type', 'client_id', 'client_secret', 'access_token', 'token', 'id'];


    // obj = upperize(obj);
    const asArray = Object.entries(obj);

    const filtered = asArray.filter(([key, value]) => {
        if (AllowedHeaders.indexOf(key) > -1) {
            return true;
        }
        else {
            return false;
        }
    });
    const justStrings = Object.fromEntries(filtered);
    return justStrings;
}



function __grabRequest(req) {
    const ipAddress = (req.headers['x-forwarded-for'] || '').split(',').pop() || 
    req.connection.remoteAddress || 
    req.socket.remoteAddress || 
    req.connection.socket.remoteAddress
    const apiSignatureKey = req.headers['basic_auth'] || '';

    let headersExtra = _grabExtraHeaders(req.headers);

    const ct = headersExtra["Content-type"];

    if (ct && ct.includes("urlencoded")) {
        let postData = querystring.stringify(req.body);
        req.body = postData;
        headersExtra['Content-Type'] = ct;
    }

    let final;

    if (req.file) {
        final = {
            ip_address: ipAddress,
            basic_auth: apiSignatureKey,
            host: req.headers['host'],
            method: req.method,
            path: req.path.replace('/gateway', ''),
            query: req.query,
            params: req.params,
            app_id: req.headers['app_id'],
            body: req.body,
            authorization: req.headers['authorization'] || '',
            extra_headers: headersExtra,
            headers: req.headers
        };
    } else {
        final = {
            ip_address: ipAddress,
            basic_auth: apiSignatureKey,
            host: req.headers['host'],
            method: req.method,
            path: req.path.replace('/gateway', ''),
            query: req.query,
            params: req.params,
            app_id: req.headers['app_id'],
            body: req.body,
            authorization: req.headers['authorization'] || '',
            extra_headers: headersExtra,
            headers: req.headers,
        };
    }

    return final;
}


// función interesante que:
// revisa si existe el servicio y si se le puede acceder
function __getServiceInformation(service_name) {
    return new Promise((resolve, reject) => {
        const file = fs.readFileSync('./app/gateway_conf.yml', 'utf8')
        const conf = yaml.parse(file)
        if ( conf.services.hasOwnProperty(service_name) ) {
            resolve(conf.services[service_name])
        } else {
            const err = {
                type: 'NOT_FOUND',
                module_source: 'request_resolver',
                message: 'Invalid service access. Please check your request again'
            }
            reject(err)
        }
    })
}


/* cosas que hace esta función: 

    - Valida que el usuario/ip está autenticado (authorization en headers)
    - Valida que el request esté dentro de los servicios registrados en el config yml
    - Crea un log (para monitoreo de todas las acciones)

*/
function __resolveRequest(req, logModel, callback) {
    let request = __grabRequest(req)

    // si tiene un autenticado: revisarlo y validar que es correcto
    __validateConsumerBasicAuth(request)
    .then(() => {
        // Obtiene el servicio del archivo de configuración yml
        __getServiceInformation(request.app_id || '')
        .then(service => {
            let flag = false;

            const availableEndPoints = service.endpoints[request.method.toLowerCase()] || []
            const splittedRequestPath = request.path.replace(/^\/|\/$/g, '').split('/')

            for ( let i = 0; i < availableEndPoints.length; i++ ) {
                let splittedEndPointPath = availableEndPoints[i].replace(/^\/|\/$/g, '').split('/')

                if ( splittedRequestPath.length === splittedEndPointPath.length ) {
                    let fractalCheckFlag = true
                    for ( let j = 0; j < splittedEndPointPath.length; j++ ) {
                        if ( splittedEndPointPath[j] !== splittedRequestPath[j] && splittedEndPointPath[j] !== '*' ) {
                            fractalCheckFlag = false
                            break
                        }
                    }
                    if ( fractalCheckFlag ) {
                        flag = true
                        break
                    }
                }
            }

            /* SUPER IMPORTANTE ACÁ */
            /* SUPER IMPORTANTE ACÁ */
            /* Si se hizo un request a la api gateway y el método existe: */
            /* Esta parte del código crea un log del movimiento que se está haciendo con la IP */
            if ( flag ) { // If method found

                console.log('si se encuentra el service');

                callback(request, service, null)

                // si no existe el servicio al que le estamos haciendo request
            } else {
                const err = {
                    type: 'NOT_FOUND',
                    module_source: 'request_resolver',
                    message: 'Request method is not found.'
                }
                callback(null, null, err)
            }
        })
        .catch(err => {
            callback(null, null, err)
        })
    })
    .catch( _ => {
        const err = {
            type: 'UNAUTHORIZED',
            module_source: 'request_resolver',
            message: 'Your signature is not valid.'
        }
        callback(null, null, err)
    })
}

module.exports = (logModel) => {
    return {
        resolveRequest: (req, callback) => {
            return __resolveRequest(req, logModel, callback)
        }
    }
}