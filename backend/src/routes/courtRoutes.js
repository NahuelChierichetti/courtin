const express = require('express');

const {
  createCourt,
  getCourts,
  getCourtById,
  updateCourt,
  deleteCourt
} = require('../controllers/courtController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const ROLES = require('../config/roles');

const router = express.Router();

router.use(protect);

router.get('/', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getCourts);
router.get('/:id', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getCourtById);
router.post('/', authorizeClubRoles(ROLES.TENANT_ADMIN), createCourt);
router.put('/:id', authorizeClubRoles(ROLES.TENANT_ADMIN), updateCourt);
router.delete('/:id', authorizeClubRoles(ROLES.TENANT_ADMIN), deleteCourt);

module.exports = router;