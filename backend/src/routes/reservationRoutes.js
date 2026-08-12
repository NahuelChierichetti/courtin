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
  getMyReservations,
  cancelMyReservation,
  refundReservationPayment
} = require('../controllers/reservationController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const { requiereSuscripcionActiva } = require('../middlewares/subscriptionGuard');
const ROLES = require('../config/roles');

const router = express.Router();

// Gestión pública por token (invitado sin cuenta). Va ANTES de `protect`:
// estas rutas no requieren autenticación; el token es la prueba de propiedad.
router.get('/manage/:token', getReservationByToken);
router.patch('/manage/:token/cancel', cancelReservationByToken);

router.use(protect);

// Reservas del jugador logueado. Van ANTES del guard de suscripción: son suyas,
// no del complejo, y no tienen por qué caerse porque un club se atrasó con el
// pago. Es la misma razón por la que la gestión por token queda afuera.
router.get('/my', getMyReservations);
router.patch('/my/:id/cancel', cancelMyReservation);

// Nivel 2: un complejo suspendido no accede al panel.
router.use(requiereSuscripcionActiva);

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

// Devolver un pago mueve plata de la cuenta del complejo: sólo el dueño, no
// los empleados.
router.post(
  '/club/:clubId/:id/refund',
  authorizeClubRoles(ROLES.TENANT_ADMIN),
  refundReservationPayment
);

module.exports = router;