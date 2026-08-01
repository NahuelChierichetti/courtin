const express = require('express');

const { getDashboard, getReports } = require('../controllers/statsController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const { requiereSuscripcionActiva } = require('../middlewares/subscriptionGuard');
const ROLES = require('../config/roles');

const router = express.Router();

router.use(protect);
// Nivel 2: un complejo suspendido no accede al panel.
router.use(requiereSuscripcionActiva);

router.get('/dashboard', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getDashboard);
router.get('/reports', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getReports);

module.exports = router;
