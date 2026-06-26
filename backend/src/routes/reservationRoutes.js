const express = require('express');

const {
  createReservation,
  getReservationsByClub,
  getUpcomingReservationsByClub,
  getReservationById,
  updateReservation,
  cancelReservation,
  getReservationByToken,
  cancelReservationByToken,
  getMyReservations
} = require('../controllers/reservationController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const ROLES = require('../config/roles');

const router = express.Router();

// Gestión pública por token (invitado sin cuenta). Va ANTES de `protect`:
// estas rutas no requieren autenticación; el token es la prueba de propiedad.
router.get('/manage/:token', getReservationByToken);
router.patch('/manage/:token/cancel', cancelReservationByToken);

router.use(protect);

router.get('/my', getMyReservations);

router.get(
  '/club/:clubId',
  authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE),
  getReservationsByClub
);

// Debe ir antes de '/club/:clubId/:id' para que "upcoming" no se interprete como id.
router.get(
  '/club/:clubId/upcoming',
  authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE),
  getUpcomingReservationsByClub
);

router.get(
  '/club/:clubId/:id',
  authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE),
  getReservationById
);

router.post(
  '/club/:clubId',
  authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE),
  createReservation
);

router.put(
  '/club/:clubId/:id',
  authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE),
  updateReservation
);

router.patch(
  '/club/:clubId/:id/cancel',
  authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE),
  cancelReservation
);

module.exports = router;