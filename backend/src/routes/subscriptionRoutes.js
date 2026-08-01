const express = require('express');

const {
  getPlanes,
  getClubSubscription,
  listSubscriptions,
  updateSubscription,
  createInvoice,
  payInvoiceManually
} = require('../controllers/subscriptionController');
const { protect, authorizeSuperadmin, authorizeClubRoles } = require('../middlewares/authMiddleware');
const ROLES = require('../config/roles');

const router = express.Router();

// ⚠️ Este router NO lleva `requiereSuscripcionActiva`, a diferencia del resto
// del backoffice. Es deliberado: si un club suspendido no pudiera entrar acá,
// no tendría dónde ver su deuda ni cómo pagarla, y el bloqueo no tendría salida.

// Catálogo de planes: precios de lista, sin datos de nadie.
router.get('/planes', getPlanes);

router.use(protect);

// El dueño ve la suscripción de su complejo.
router.get(
  '/club/:clubId',
  authorizeClubRoles(ROLES.TENANT_ADMIN),
  getClubSubscription
);

// Gestión comercial: sólo superadmin.
router.get('/', authorizeSuperadmin, listSubscriptions);
router.put('/club/:clubId', authorizeSuperadmin, updateSubscription);
router.post('/club/:clubId/invoices', authorizeSuperadmin, createInvoice);
router.post('/invoices/:id/pay', authorizeSuperadmin, payInvoiceManually);

module.exports = router;
