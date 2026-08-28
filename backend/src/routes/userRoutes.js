const express = require('express');
const { getUsers, createUser, editUser, deleteUser } = require('../controllers/userController');
const { protect, authorizeSuperadmin } = require('../middlewares/authMiddleware');

const router = express.Router();

// Estas rutas quedaron del scaffolding inicial y nacieron sin ningún middleware:
// `GET /users` listaba el nombre, email, teléfono y googleId de TODOS los
// usuarios a cualquiera que supiera la URL, y el PUT/DELETE dejaban editar o
// borrar cualquier cuenta sin sesión.
//
// El panel no las usa —el ABM real de usuarios es `/admin/users`
// (`adminController`), que sí valida— así que cerrarlas no rompe nada. Se
// dejan montadas y no se borran porque siguen siendo una vía cómoda del
// superadmin, pero desde acá para adelante exigen sesión y rol.
router.use(protect);
router.use(authorizeSuperadmin);

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', editUser);
router.delete('/:id', deleteUser);

module.exports = router;
