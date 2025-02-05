require('dotenv').config();
const fs = require('node:fs');

function securityMiddleware(req, res, next) {
  	let fullUrl = req.protocol + '://' + req.get('host');

  	const jsonFile = JSON.parse(fs.readFileSync('./secure-files/data.json', 'utf8'));

	const urlGoogle = jsonFile.GOOGLE_URL;
  	const urlGoogle2 = jsonFile.GOOGLE_URL.replace("https://", "http://");

  	if (fullUrl == urlGoogle || fullUrl == urlGoogle2) {
  		res.status(403).json('Not allowed by CORS');
  	} else {
  		next();
  	}

}


module.exports = { securityMiddleware };