const express = require('express');

const {
  register,
  registerClub,
  login,
  getMe,
  updateMe,
  changePassword,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  verifyEmail,
  resendVerification
} = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const {
  forgotPasswordLimiters,
  loginLimiters,
  registerClubLimiter,
  resendVerificationLimiter
} = require('../middlewares/rateLimit');

const router = express.Router();

router.post('/register', register);
// Solicitud de alta de complejo: crea el club en `pendiente` y avisa al
// superadmin. Con límite: es pública y manda emails.
router.post('/register-club', registerClubLimiter, registerClub);
// Con límite anti fuerza bruta. Sólo cuentan los intentos fallidos, así que
// loguearse muchas veces bien no consume nada.
router.post('/login', loginLimiters, login);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.put('/me/password', protect, changePassword);

// Recuperación de contraseña. Públicas a propósito: quien las usa justamente no
// puede iniciar sesión.
// Con límite de uso: es pública y manda un email en cada llamada.
router.post('/forgot-password', forgotPasswordLimiters, forgotPassword);
router.get('/reset-password', verifyResetToken);
router.post('/reset-password', resetPassword);

// Verificación de email. La confirmación es pública (el link puede abrirse en un
// navegador sin sesión); el reenvío exige sesión para que no se pueda usar como
// vía para mandarle correo a cualquiera.
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', protect, resendVerificationLimiter, resendVerification);

module.exports = router;