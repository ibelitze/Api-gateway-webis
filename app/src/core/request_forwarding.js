const axios = require('axios').default;
const { SECRET_KEY, SECRET_KEY_INTERNA } = require('../../utils/configs/config');
const { getIdTokenFromServiceAccount } = require('../../utils/utils');
const jwt = require('jsonwebtoken');
const fs = require('node:fs');
const { Buffer } = require('buffer');



function __generateGatewaySignature(serviceSecretKey, callback) {
    jwt.sign({
        gateway: 'WEBIS_GATEWAY',
        gateway_secret: SECRET_KEY
    }, serviceSecretKey, callback)
}


/* Función que retorna el URL al que se va a hacer la petición (nodejs, microcrm, o api tunnel)
   Dependiendo del servicio al que se está queriendo acceder
*/
function __returnURL(serviceName) {
    const jsonFile = JSON.parse(fs.readFileSync('./secure-files/data.json', 'utf8'));
    if (serviceName == 'salesforce') {
        return jsonFile.URL_MCRS;
    }
    else if (serviceName == 'textract') {
        return jsonFile.URL_TEXTRACT;
    }
    else {
        return jsonFile.URL_TUNEL;
    }

}

/* Función que hace login en Google cloud para poder usar los servicios internos */
function __resolveLoginGC(url) {
    return new Promise((resolve, reject) => {

        const jsonFile = JSON.parse(fs.readFileSync('./secure-files/data.json', 'utf8'));
        const targetAudience = url;
        const credentials = JSON.parse(fs.readFileSync('./secure-files/webis-hub-services-fef0b1033539.json', 'utf8'));
        getIdTokenFromServiceAccount(targetAudience, credentials).then((id) => {
            if (id && id.length > 0) {
                const final = 'Bearer ' + id;
                resolve(final);
            } else {
                reject(false);
            }
        });
    });
}


/* 
    Funciones de request forward:
        - revisa el tipo de request (get o post)
        - genera una firma (jwt) para los microservicios (aun no se va a usar)
        - Hace el request que el client pidió y devuelve la data finalmente

*/
function forwardRequest(request, service) {

    return new Promise((resolve, reject) => {

        const urlbase = __returnURL(request.app_id);

        __resolveLoginGC(urlbase).then((login) => {

            request.extra_headers['Authorization'] = login;

            const method = request.method.toLowerCase();
            if ( method === 'get' ) {

                axios({
                    method: method,
                    baseURL: urlbase,
                    url: request.path,
                    responseType: 'json',
                    headers: request.extra_headers,
                })
                .then(response => {
                    resolve(response.data) 
                })
                .catch(err => { reject(err) });

            } else { // POST

                const urlbase = __returnURL(request.app_id);
                let config;

                config = {
                    method: method,
                    baseURL: urlbase,
                    url: request.path,
                    responseType: 'json',
                    data: request.body,
                    headers: request.extra_headers,
                };

                axios(config)
                .then(response => { resolve(response.data); })
                .catch(err => { reject(err) });
            }

        }).catch(err => {
            resolve('No se pudo loguear con el servicio de Google Cloud');
        });


        /*
            Esto de abajo sirve para generar otro JWT entre servicios internos, para más seguridad
            por ahora no se va a usar, pero se deja para uso futuro.
        */


        // __generateGatewaySignature(service.secret_key, (err, token) => {
        //     if ( err ) { reject(err) } // If token sign got error
        //     if ( method === 'get' ) {
        //         axios({
        //             method: method,
        //             baseURL: service.base_url + ':' + service.port,
        //             url: request.path,
        //             responseType: 'json',
        //             headers: {
        //                 gateway_signature: token ,
        //                 authorization: request.authorization
        //             }
        //         })
        //         .then(response => {
        //             resolve(response.data) 
        //         })
        //         .catch(err => { reject(err) })
        //     } else {
        //         axios({
        //             method: method,
        //             baseURL: service.base_url + ':' + service.port,
        //             url: request.path,
        //             responseType: 'json',
        //             data: request.body,
        //             params: request.params,
        //             headers: { 
        //                 gateway_signature: token,
        //                 authorization: request.authorization
        //             }
        //         })
        //         .then(response => { resolve(response) })
        //         .catch(err => { reject(err) })
        //     }
        // })
    })
}

module.exports = { 
    forwardRequest,
    __resolveLoginGC,
    __returnURL 
}