const express = require('express');

const {
  getMyNotifications,
  markAllRead,
  markRead
} = require('../controllers/userNotificationController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Notificaciones del jugador. Van bajo /me y no bajo /notifications (que es la
// campanita del complejo, con `authorizeClubRoles` y guard de suscripción):
// mismo concepto, audiencias y permisos distintos.
router.use(protect);

router.get('/notifications', getMyNotifications);
router.patch('/notifications/read-all', markAllRead);
router.patch('/notifications/:id/read', markRead);

module.exports = router;
