const express = require('express');

const { register, registerClub, login, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/register-club', registerClub);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;