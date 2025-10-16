const admin = require('firebase-admin');
const serviceAccount = require('./giggles-16518-a9080c48c9a1.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;