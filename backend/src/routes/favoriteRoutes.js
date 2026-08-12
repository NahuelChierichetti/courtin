const express = require('express');

const {
  getFavorites,
  addFavorite,
  removeFavorite
} = require('../controllers/favoriteController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Todo acá es del jugador logueado y se acota por `req.user`. No pasa por el
// guard de suscripción: los favoritos son suyos, no del complejo.
router.use(protect);

router.get('/', getFavorites);
router.post('/:clubId', addFavorite);
router.delete('/:clubId', removeFavorite);

module.exports = router;
