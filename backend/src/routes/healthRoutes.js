const express = require('express');
const { getHealth, getProxyDiag } = require('../controllers/healthController');

const router = express.Router();

router.get('/', getHealth);

// Diagnóstico de la cadena de proxies. Apagado salvo que exista DIAG_TOKEN.
router.get('/proxy', getProxyDiag);

module.exports = router;