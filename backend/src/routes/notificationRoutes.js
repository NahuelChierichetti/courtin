const express = require('express');

const { getNotifications, markAllRead, markRead } = require('../controllers/notificationController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const ROLES = require('../config/roles');

const router = express.Router();

router.use(protect);

router.get('/', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getNotifications);
router.patch('/read-all', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), markAllRead);
router.patch('/:id/read', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), markRead);

module.exports = router;
