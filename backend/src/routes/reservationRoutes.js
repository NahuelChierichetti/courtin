const express = require('express');

const {
  createReservation,
  getReservationsByClub,
  getReservationById,
  updateReservation,
  cancelReservation,
  getMyReservations
} = require('../controllers/reservationController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const ROLES = require('../config/roles');

const router = express.Router();

router.use(protect);

router.get('/my', getMyReservations);

router.get(
  '/club/:clubId',
  authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE),
  getReservationsByClub
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