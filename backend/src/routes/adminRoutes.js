const express = require('express');
const { protect, authorizeSuperadmin } = require('../middlewares/authMiddleware');
const {
  getAdminClubs,
  getAdminClubById,
  createAdminClub,
  updateAdminClub,
  approveAdminClub,
  rejectAdminClub,
  suspendAdminClub,
  deleteAdminClub,
  restoreAdminClub,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  assignUserToClub,
  removeUserFromClub,
} = require('../controllers/adminController');

const router = express.Router();

router.use(protect, authorizeSuperadmin);

router.get('/clubs', getAdminClubs);
router.post('/clubs', createAdminClub);
router.get('/clubs/:id', getAdminClubById);
router.put('/clubs/:id', updateAdminClub);
// Circuito de aprobación del alta pedida desde el registro público.
router.patch('/clubs/:id/approve', approveAdminClub);
router.patch('/clubs/:id/reject', rejectAdminClub);
router.patch('/clubs/:id/suspend', suspendAdminClub);
router.patch('/clubs/:id/restore', restoreAdminClub);
router.delete('/clubs/:id', deleteAdminClub);

router.get('/users', getAdminUsers);
router.post('/users', createAdminUser);
router.put('/users/:id', updateAdminUser);
router.post('/users/:id/assign', assignUserToClub);
router.patch('/users/memberships/:membershipId/remove', removeUserFromClub);

module.exports = router;
