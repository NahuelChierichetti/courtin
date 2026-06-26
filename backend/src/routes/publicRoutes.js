const express = require('express');

const {
  getPublicClubs,
  getPublicClubBySlug,
  getCourtAvailability,
  createPublicReservation,
  getPublicCities
} = require('../controllers/publicController');

const router = express.Router();

// Rutas públicas (sin autenticación): descubrimiento, disponibilidad y reserva
// como invitado. La gestión de la reserva creada va por /reservations/manage/:token.
router.get('/cities', getPublicCities);
router.get('/clubs', getPublicClubs);
router.get('/clubs/:slug', getPublicClubBySlug);
router.get('/clubs/:slug/courts/:courtId/availability', getCourtAvailability);
router.post('/clubs/:slug/reservations', createPublicReservation);

module.exports = router;
