const express = require('express');

const {
  getPublicClubs,
  getPublicClubBySlug,
  getCourtAvailability,
  getClubAvailability,
  createPublicReservation,
  getPublicCities,
  checkSlugAvailable,
  getReservationPaymentStatus,
  retryReservationPayment
} = require('../controllers/publicController');
const { mpOauthCallback, mpWebhook } = require('../controllers/mercadopagoController');
const { attachUserOptional } = require('../middlewares/authMiddleware');
const { retryPaymentLimiter } = require('../middlewares/rateLimit');

const router = express.Router();

// Rutas públicas (sin autenticación): descubrimiento, disponibilidad y reserva
// como invitado. La gestión de la reserva creada va por /reservations/manage/:token.
router.get('/cities', getPublicCities);
router.get('/slug-available', checkSlugAvailable);
router.get('/clubs', getPublicClubs);
router.get('/clubs/:slug', getPublicClubBySlug);
router.get('/clubs/:slug/availability', getClubAvailability);
router.get('/clubs/:slug/courts/:courtId/availability', getCourtAvailability);
router.post('/clubs/:slug/reservations', attachUserOptional, createPublicReservation);

// Estado y reintento del cobro, para la pantalla a la que vuelve el jugador
// desde MercadoPago. El token de gestión es la prueba de propiedad.
router.get('/reservations/:token/pago', getReservationPaymentStatus);
router.post('/reservations/:token/retry-payment', retryPaymentLimiter, retryReservationPayment);

// Callback de OAuth de MercadoPago. Va acá y no en /clubs porque quien llega es
// el navegador del complejo redirigido por MercadoPago, sin header de auth: lo
// que autentica el pedido es el `state` firmado.
router.get('/mp/oauth/callback', mpOauthCallback);

// Notificaciones de pago. Sin auth (la llama MercadoPago), pero firmadas: lo
// que valida el pedido es el HMAC del header `x-signature`.
router.post('/mp/webhook', mpWebhook);

module.exports = router;
