const {GoogleAuth} = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('./configs/config');
const fs = require('node:fs');
const yaml = require('yaml');

/* Devuelve el id (token) firmado por Google */
async function getIdTokenFromServiceAccount(targetAudience, credentials) {
    const auth = new GoogleAuth({credentials});
    const client = await auth.getIdTokenClient(targetAudience);
    const id = await client.idTokenProvider.fetchIdToken(targetAudience);
    return id;
}

/* Función clonada de otro módulo. Aquí es más sencillo tenerla y exportarla */
function validateConsumerBasicAuth(authorization) {
    return new Promise((resolve, reject) => {
        let token = authorization;
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


// función interesante que:
// revisa si existe el servicio y si se le puede acceder. (es clon de otra)
function getServiceInformation(service_name) {
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

function returnServiceFlag(service, request) {
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
                break;
            }
        }
    }

    if ( flag ) {
        return service;
    } else {
        return false;
    }
}


module.exports = { getIdTokenFromServiceAccount, validateConsumerBasicAuth, 
    getServiceInformation,
    returnServiceFlag, 
};