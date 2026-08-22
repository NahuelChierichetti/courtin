const express = require('express');

const {
  getRecurringByClub,
  previewRecurring,
  createRecurring,
  updateRecurring,
  cancelRecurring
} = require('../controllers/recurringController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const { requiereSuscripcionActiva } = require('../middlewares/subscriptionGuard');
const ROLES = require('../config/roles');

const router = express.Router();

// Turnos fijos: la REGLA. Las ocurrencias se gestionan por `/reservations`,
// incluida la cancelación de un día suelto. Ver docs/turnos-fijos.md.
//
// Todo el módulo es del backoffice: un turno fijo se negocia hablando (precio,
// permanencia, forma de pago), así que no hay puerta pública.
router.use(protect);
router.use(requiereSuscripcionActiva);

const soloDelComplejo = authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE);

router.get('/club/:clubId', soloDelComplejo, getRecurringByClub);
router.post('/club/:clubId/preview', soloDelComplejo, previewRecurring);
router.post('/club/:clubId', soloDelComplejo, createRecurring);
router.patch('/club/:clubId/:id', soloDelComplejo, updateRecurring);

// Dar de baja libera hasta 90 días de turnos de un cliente fiel. Es la acción
// más cara del módulo y la única irreversible desde la UI: sólo el dueño.
router.delete('/club/:clubId/:id', authorizeClubRoles(ROLES.TENANT_ADMIN), cancelRecurring);

module.exports = router;
