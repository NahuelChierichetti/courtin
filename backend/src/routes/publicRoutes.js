const express = require('express');

const {
  getPublicClubs,
  getPublicClubBySlug,
  getCourtAvailability,
  getClubAvailability,
  createPublicReservation,
  getPublicCities
} = require('../controllers/publicController');
const { attachUserOptional } = require('../middlewares/authMiddleware');

const router = express.Router();

// Rutas públicas (sin autenticación): descubrimiento, disponibilidad y reserva
// como invitado. La gestión de la reserva creada va por /reservations/manage/:token.
router.get('/cities', getPublicCities);
router.get('/clubs', getPublicClubs);
router.get('/clubs/:slug', getPublicClubBySlug);
router.get('/clubs/:slug/availability', getClubAvailability);
router.get('/clubs/:slug/courts/:courtId/availability', getCourtAvailability);
router.post('/clubs/:slug/reservations', attachUserOptional, createPublicReservation);

module.exports = router;
