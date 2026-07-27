const express = require('express');

const {
  createInvitation,
  getClubInvitations,
  revokeInvitation,
  getInvitation,
  acceptInvitation
} = require('../controllers/invitationController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const { invitationLimiter } = require('../middlewares/rateLimit');
const ROLES = require('../config/roles');

const router = express.Router();

// Rutas públicas del invitado: todavía no tiene cuenta ni sesión, así que van
// ANTES del `protect`. La prueba de identidad es el token del email.
router.get('/:token', getInvitation);
router.post('/:token/accept', acceptInvitation);

router.use(protect);

// Sólo el dueño del complejo suma gente a su equipo.
router.post('/', authorizeClubRoles(ROLES.TENANT_ADMIN), invitationLimiter, createInvitation);
router.get('/club/:clubId', authorizeClubRoles(ROLES.TENANT_ADMIN), getClubInvitations);
// El clubId va en la ruta (y no sólo el id) para que `authorizeClubRoles` pueda
// verificar la membresía: el cliente HTTP no manda el header `x-club-id`.
router.delete('/club/:clubId/:id', authorizeClubRoles(ROLES.TENANT_ADMIN), revokeInvitation);

module.exports = router;
