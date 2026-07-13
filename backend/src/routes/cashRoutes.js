const express = require('express');

const {
  getMovements,
  createMovement,
  updateMovement,
  deleteMovement
} = require('../controllers/cashController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const ROLES = require('../config/roles');

const router = express.Router();

router.use(protect);

// El personal de mostrador (empleado) puede ver y registrar movimientos.
router.get('/', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), getMovements);
router.post('/', authorizeClubRoles(ROLES.TENANT_ADMIN, ROLES.EMPLOYEE), createMovement);
// Editar / eliminar queda para el administrador del complejo.
router.patch('/:id', authorizeClubRoles(ROLES.TENANT_ADMIN), updateMovement);
router.delete('/:id', authorizeClubRoles(ROLES.TENANT_ADMIN), deleteMovement);

module.exports = router;
