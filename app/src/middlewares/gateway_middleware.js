const { forwardRequest, __resolveLoginGC, __returnURL, resolveRequest,
    resolveResponse, register, getAllUsers, devolver401, compareHashes } = require('../core/index');
const router = require('express').Router();
const constants = require('../../utils/configs/config');
const { SECRET_KEY, SECRET_KEY_INTERNA } = require('../../utils/configs/config');
const { validateConsumerBasicAuth, 
    getServiceInformation, returnServiceFlag } = require('../../utils/utils');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const axios = require('axios').default;
const fs = require('node:fs');
const fsProm = require( "node:fs/promises" );
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


    router.post('/auth/login', (req, res) => {
        const temphash = req.headers['basic_auth'];
        const debunked = compareHashes(temphash, SECRET_KEY);
        if (debunked) {

            const user = {
                user: req.headers['user'],
                id: req.headers['id'],
            };
            let token = jwt.sign(user, SECRET_KEY, {
                expiresIn: 60 * 60 * 1 // expires in 1 hour
            });

            const status_code = 200;
            const expiresIn = 60 * 60 * 1;
            const data = {
                validated: true,
                expiresIn,
                token
            };
            res.status(status_code).json(data);
        }
        else {
            devolver401(res, 'basic auth');
        }
    });

    router.post('/renewtoken', (req, res) => {
        let token = req.headers['authorization'];

        if (!token) {
            devolver401(res, 'basic auth');
        }
        else {
            token = token.replace('Bearer ', '');
            jwt.verify(token, SECRET_KEY, function(err, tokn) {
                if (err) {
                    devolver401(res, err.message);
                } 
                else {
                    const sameUser = {
                        user: tokn.user,
                        pass: tokn.pass
                    }
                    const Rtoken = jwt.sign(sameUser, SECRET_KEY, {
                        expiresIn: 60 * 60 * 1 // expires in 1 hour
                    });

                    const status_code = 200;
                    const expiresIn = 60 * 60 * 1;
                    const data = {
                        ok: true,
                        expiresIn,
                        Rtoken
                    };
                    res.status(status_code).json(data);
                }
            });
        }
    });

    router.post('/chat/getdata', (req, res) => {
        let token = req.headers['authorization'];

        if (!token) {
            devolver401(res, 'basic auth');
            return;
        }

        token = token.replace('Bearer ', '');
        jwt.verify(token, SECRET_KEY, function(err, tokn) {
            if (err) {
                devolver401(res, err.message);
                return;
            } 

            const jsonFile = JSON.parse(fs.readFileSync('./secure-files/data-node.json', 'utf8'));
            const baseUrl=jsonFile.BASE_URL
            const url=jsonFile.URL_GET
            const auth_token=jsonFile.AUTH_TOKEN_GET;

            console.log(jsonFile)

            axios({ 
                method: 'POST',
                baseURL: baseUrl,
                url: url,
                responseType: 'json',
                data: {
                    email: req.headers['email'],
                    base: req.headers['base'],
                    auth_token : auth_token,
                    offset: req.headers['offset'],
                }
            })
            .then(response => { res.status(200).json(response.data);})
            .catch(err => {     res.status(200).json(err); });
        });
    });
    
    router.post('/chat/insertdata', (req, res) => {
        let token = req.headers['authorization'];

        if (!token) {
            devolver401(res, 'basic auth');
            return;
        }

        token = token.replace('Bearer ', '');
        jwt.verify(token, SECRET_KEY, function(err, tokn) {
            if (err) {
                devolver401(res, err.message);
                return;
            } 

            const jsonFile = JSON.parse(fs.readFileSync('./secure-files/data-node.json', 'utf8'));
            const baseUrl=jsonFile.BASE_URL
            const url=jsonFile.URL_INSERT
            const auth_token=jsonFile.AUTH_TOKEN_INSERT;


            console.log(req.body.content)

            axios({ 
                method: 'POST',
                baseURL: baseUrl,
                url:     url,
                responseType: 'json',
                data: {
                    user_email: req.headers['user_email'],
                    content:  Buffer.from(req.body.content, 'base64').toString('utf8'),
                    uuid: req.headers['uuid'],
                    id: req.headers['id'],
                    is_audio: req.headers['is_audio'],
                    duration: req.headers['duration'],
                    auth_token : auth_token,
                    contexto: Buffer.from(req.body.contexto, 'base64').toString('utf8')
                }
            })
            .then(response => { 
                res.status(200).json(response.data); 
            })
            .catch(err => {     
                console.log(err)
                res.status(200).json(err); 
            });
                
        });
    });

    router.post('/ia/testia', (req, res) => {

        const jsonFile = JSON.parse(fs.readFileSync('./secure-files/data-openai.json', 'utf8'));
        const baseUrl=jsonFile.URL_OPENAI
		const content=req.headers['content'];

        axios({ 
            method: 'POST',
            baseURL: baseUrl,
            url: '/TestIa',
            responseType: 'json',
            data: {content : content}
        })
        .then(response => { res.status(200).json(response.data); })
        .catch(err => {     res.status(200).json(err); });
    });


    router.post('/textract/*', upload.single('file'), (req, res) => {

        // si tiene un autenticado: revisarlo y validar que es correcto
        validateConsumerBasicAuth(req.headers['authorization'])
        .then(() => {

            // ver si está accediendo al servicio correcto
            getServiceInformation(req.headers['app_id'] || '').then((service) => {
                const serv = returnServiceFlag(service, req);

                if (serv) {

                    const urlbase = __returnURL(req.headers['app_id']);

                    // hacer login con google y su service account
                    __resolveLoginGC(urlbase).then((login) => {

                        if (req.headers['type_image'] && req.headers['type_image'] === "base64") {

                            const path = req.path.replace('/gateway', '');

                            const config = {
                                method: 'POST',
                                baseURL: urlbase + path,
                                data: {
                                    file: req.body.file,
                                    mimetype: req.body.mimetype,
                                    name: req.body.originalname
                                },
                                headers: {
                                    Authorization: login,
                                    'Content-type': "application/json"
                                },
                            };

                            axios(config)
                            .then(response => { 
                                res.status(200).json(response.data);
                            })
                            .catch(err => { res.status(403).json(err) });

                        } else {

                            const bufferToString = req.file.buffer.toString('base64');
                            const path = req.path.replace('/gateway', '');

                            const config = {
                                method: 'POST',
                                baseURL: urlbase + path,
                                data: {
                                    file: bufferToString,
                                    mimetype: req.file.mimetype,
                                    name: req.file.originalname
                                },
                                headers: {
                                    Authorization: login,
                                    'Content-type': "application/json"
                                },
                            };

                            axios(config)
                            .then(response => { 
                                res.status(200).json(response.data);
                            })
                            .catch(err => { res.status(403).json(err) });
                        }

                    }).catch(errr => {
                        res.status(403).json('No se pudo loguear con el servicio de Google Cloud');
                    });

                } else {
                    const err = {
                        type: 'NOT_FOUND',
                        module_source: 'request_resolver',
                        message: 'Request method is not found.'
                    };
                    res.status(403).json(err);
                }
            });

        }).catch( _ => {
            const err = {
                type: 'UNAUTHORIZED',
                module_source: 'request_resolver',
                message: 'Your signature is not valid.'
            }
            res.status(403).json(err);
        });

    });

    router.all('*', (req, res) => {
        if ( req.path !== 'app/v1/docs') {
            resolveResponse(res)
            resolveRequest(req, (request, service, error) => {
                if ( error ) {
                    let status_code
                    if ( error.hasOwnProperty('type') ) {
                        if ( error.type === 'UNAUTHORIZED' ) {
                            status_code = 401
                        } else if ( error.type === 'NOT_FOUND' ) {
                            status_code = 404
                        } else {
                            status_code = 403
                        }
                    } else {
                        status_code = 403
                    }
                    res.status(status_code).json(error)

                } else {
                    forwardRequest(request, service)
                    .then(response => {
                        res.json(response);
                    })
                    .catch(err => {
                        res.status(500).json(err);
                    })
                }
            })
        }
    });


module.exports = router;


/**
 * @swagger
 * 
 * 
 * /gateway/auth/login:
 *   post:
 *     tags:
 *       - /gateway/auth/login
 *     summary: Login interno entre frontend y api gateway
 *     description: El frontend antes de poder generar tráfico con la api gateway debe hacer un Login interno, encriptando una clave secreta que solamente tienen el frontend y esta api
 *     parameters:
 *       - in: headers
 *         name: basic_auth
 *         description: HASH (bcrypt) de la clave secreta que comparten frontend y api gateway
 *         required: true
 *       - in: headers
 *         name: user
 *         description: nombre de usuario
 *         required: true
 *       - in: headers
 *         name: password
 *         description: cualquier identificador, clave o nombre que se pueda usar como clave temporal del usuario
 *         required: true
 *     responses:
 *       200:
 *         description: Se recibe un objeto JSON con el token y la duración
 *       401:
 *         description: No se recibió el HASH (o alguno de los headers necesarios), está mal encriptado el hash o no corresponde con la clave interna que manejan las dos apis
 * 
 * /gateway/renewtoken:
 *   post:
 *     tags:
 *       - /gateway/renewtoken
 *     summary: Renovación del token
 *     description: El token que crea el Login tiene una duración máxima de 1h, por lo que debe renovarse antes de caducar para que el frontend pueda seguir manteniendo tráfico con la api gateway
 *     parameters:
 *       - in: headers
 *         name: authorization
 *         description: Bearer token creado con JWT, recibido desde la primera llamada Login
 *         required: true
 *     responses:
 *       200:
 *         description: Se recibe un nuevo token y la duración extendida de 1h
 *       401:
 *         description: No se envió por headers el token, está mal encriptado, o no corresponde
 * 
 * /gateway/test:
 *   get:
 *     tags:
 *       - gateway/test
 *     summary: Solo un endpoint de testeo
 *     description: Endpoint para testear la respuesta del api gateway en momentos oportunos
 *     responses:
 *       200:
 *         description: Se recibe un string "Todo bien"
 * 
 * /gateway/*:
 *   post:
 *     tags:
 *       - /gateway/*
 *     summary: Cualquier llamada POST
 *     description: Es la llamada universal, la api gateway revisa la seguridad, el token, los headers, entre otros, hace las peticiones que el frontend pidió y devuelve la data
 *     parameters:
 *       - in: headers
 *         name: authorization
 *         description: Bearer token creado con JWT, recibido desde la primera llamada Login
 *         required: true
 *     responses:
 *       200:
 *         description: Se recibe la data que se solicitó
 *       401:
 *         description: No se envió por headers el token, está mal encriptado, o no corresponde
 *   get:
 *     tags:
 *       - /gateway/*
 *     summary: Cualquier llamada GET
 *     description: Es la llamada universal, la api gateway revisa la seguridad, el token, los headers, entre otros, hace las peticiones que el frontend pidió y devuelve la data
 *     parameters:
 *       - in: headers
 *         name: authorization
 *         description: Bearer token creado con JWT, recibido desde la primera llamada Login
 *         required: true
 *     responses:
 *       200:
 *         description: Se recibe la data que se solicitó
 *       401:
 *         description: No se envió por headers el token, está mal encriptado, o no corresponde
 * 
 */
