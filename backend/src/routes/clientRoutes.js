const express = require('express');

const { getClients, getClientById, updateClient } = require('../controllers/clientController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const ROLES = require('../config/roles');

const router = express.Router();

router.use(protect);

router.get('/', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getClients);
router.get('/:id', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getClientById);
router.patch('/:id', authorizeClubRoles(ROLES.TENANT_ADMIN), updateClient);

module.exports = router;
