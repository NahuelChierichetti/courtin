const express = require('express');
const multer = require('multer');

const { uploadImage } = require('../controllers/uploadController');
const { protect, authorizeClubRoles } = require('../middlewares/authMiddleware');
const { requiereSuscripcionActiva } = require('../middlewares/subscriptionGuard');
const ROLES = require('../config/roles');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes.'));
  }
});

// Envuelve multer para devolver errores (tamaño/tipo) como 400 legible.
const uploadSingle = (req, res, next) =>
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera los 5 MB.' : err.message || 'No se pudo procesar la imagen.';
      return res.status(400).json({ ok: false, message: msg });
    }
    next();
  });

const router = express.Router();

router.use(protect);
// Nivel 2: un complejo suspendido no accede al panel.
router.use(requiereSuscripcionActiva);
router.post('/', authorizeClubRoles(ROLES.TENANT_ADMIN), uploadSingle, uploadImage);

module.exports = router;
