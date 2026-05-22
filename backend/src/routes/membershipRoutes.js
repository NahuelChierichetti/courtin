const express = require('express');

const {
  createMembership,
  getClubMemberships,
  getMyMemberships,
  updateMembership
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
router.put('/:id', authorizeSuperadmin, updateMembership);

module.exports = router;