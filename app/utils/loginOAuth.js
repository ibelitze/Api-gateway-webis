const {google} = require('googleapis');
const router = require('express').Router();
const axios = require('axios').default;
const { getIdTokenFromServiceAccount } = require('./utils');
const fs = require('node:fs');
require('dotenv').config();

router.post('/', (req, res) => {
    main(res);
});



/* Llama a la función creadora del id (token) de Google, y devuelve el Token en formato listo para el header */
async function main(res) {

    const jsonFile = JSON.parse(fs.readFileSync('./secure-files/data.json', 'utf8'));

    const targetAudience = jsonFile.URL_MCRS;
    const targetAudience2 = jsonFile.URL_TUNEL;

    const credentials = JSON.parse(fs.readFileSync('./secure-files/webis-hub-services-fef0b1033539.json', 'utf8'));
    const credentials2 = JSON.parse(fs.readFileSync('./secure-files/webis-hub-services-521fc2e2d088.json', 'utf8'));

    const id1 = await getIdTokenFromServiceAccount(targetAudience, credentials);
    const id2 = await getIdTokenFromServiceAccount(targetAudience2, credentials2);

    const final1 = 'Bearer ' + id1;
    const final2 = 'Bearer ' + id2;

    const response = [];
    response.push(final1);
    response.push(final2);

    res.status(200).json(response);
}


module.exports = router;