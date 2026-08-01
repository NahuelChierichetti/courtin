const Club = require('../models/Club');
const ROLES = require('../config/roles');
const { puedeAccederPanel, puedeCrearReservas } = require('../utils/subscriptions');

// Corta el acceso según el estado de la suscripción del club.
//
// Va SIEMPRE después de `authorizeClubRoles`, que es quien resuelve de qué club
// se trata y deja la membresía en `req.membership`.
//
// Lo que este middleware NO cubre, a propósito:
//   • Las rutas de suscripción y facturación. Si las bloqueara, un club
//     suspendido no podría pagar y no habría forma de salir del bloqueo.
//   • Las rutas públicas del jugador (gestión de reserva por token). Un turno ya
//     reservado no se cae porque el complejo se atrasó con el pago.

// De dónde sale el club, según cómo esté armada la ruta.
const clubIdDeRequest = (req) =>
  req.params.clubId || req.body?.clubId || req.headers['x-club-id'] || req.membership?.club;

/**
 * Nivel 2 — `suspendido`: sin acceso al panel.
 *
 * El superadmin queda exento: tiene que poder entrar a cualquier complejo
 * justamente para resolver un problema de facturación.
 */
const requiereSuscripcionActiva = async (req, res, next) => {
  try {
    if (req.user?.globalRole === ROLES.SUPERADMIN) return next();

    const clubId = clubIdDeRequest(req);
    if (!clubId) return next(); // Sin club no hay nada que evaluar acá.

    const club = await Club.findById(clubId).select('estado nombre');
    if (!club) return next(); // Que el 404 lo resuelva el controlador.

    if (!puedeAccederPanel(club)) {
      return res.status(403).json({
        ok: false,
        code: 'SUSCRIPCION_SUSPENDIDA',
        estado: club.estado,
        message:
          'El acceso al complejo está bloqueado por falta de pago. Regularizá la suscripción para volver a usar el panel.'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Nivel 1 — `impago`: no se crean turnos nuevos.
 *
 * Se aplica a las rutas de alta; las de edición y cancelación siguen abiertas.
 */
const requiereSuscripcionParaCrear = async (req, res, next) => {
  try {
    if (req.user?.globalRole === ROLES.SUPERADMIN) return next();

    const clubId = clubIdDeRequest(req);
    if (!clubId) return next();

    const club = await Club.findById(clubId).select('estado nombre');
    if (!club) return next();

    if (!puedeCrearReservas(club)) {
      return res.status(403).json({
        ok: false,
        code: 'SUSCRIPCION_IMPAGA',
        estado: club.estado,
        message:
          'Tu suscripción está impaga, así que no se pueden cargar turnos nuevos. Regularizá el pago para reactivar el complejo.'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requiereSuscripcionActiva, requiereSuscripcionParaCrear };
