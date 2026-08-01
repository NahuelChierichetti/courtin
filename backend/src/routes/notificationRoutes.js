const express = require('express');

const { getNotifications, markAllRead, markRead } = require('../controllers/notificationController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const { requiereSuscripcionActiva } = require('../middlewares/subscriptionGuard');
const ROLES = require('../config/roles');

const router = express.Router();

router.use(protect);
// Nivel 2: un complejo suspendido no accede al panel.
router.use(requiereSuscripcionActiva);

router.get('/', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getNotifications);
router.patch('/read-all', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), markAllRead);
router.patch('/:id/read', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), markRead);

module.exports = router;
