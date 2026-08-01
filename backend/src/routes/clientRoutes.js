const express = require('express');

const { getClients, getClientById, updateClient } = require('../controllers/clientController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const { requiereSuscripcionActiva } = require('../middlewares/subscriptionGuard');
const ROLES = require('../config/roles');

const router = express.Router();

router.use(protect);
// Nivel 2: un complejo suspendido no accede al panel.
router.use(requiereSuscripcionActiva);

router.get('/', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getClients);
router.get('/:id', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getClientById);
router.patch('/:id', authorizeClubRoles(ROLES.TENANT_ADMIN), updateClient);

module.exports = router;
