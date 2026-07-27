const express = require('express');

const {
  createMembership,
  getClubMemberships,
  getMyMemberships,
  updateMembership,
  updateClubMembership
} = require('../controllers/membershipController');
const {
  protect,
  authorizeSuperadmin,
  authorizeClubRoles
} = require('../middlewares/authMiddleware');
const ROLES = require('../config/roles');

const router = express.Router();

router.use(protect);

router.get('/me', getMyMemberships);
router.post('/', authorizeClubRoles(ROLES.TENANT_ADMIN), createMembership);
router.get('/club/:clubId', authorizeClubRoles(ROLES.TENANT_ADMIN), getClubMemberships);
// Gestión del equipo por el dueño del complejo (acotada a su club).
router.put('/club/:clubId/:id', authorizeClubRoles(ROLES.TENANT_ADMIN), updateClubMembership);
// Versión sin restricciones, para el backoffice de superadmin.
router.put('/:id', authorizeSuperadmin, updateMembership);

module.exports = router;