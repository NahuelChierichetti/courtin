const { cloudinary, isConfigured } = require('../config/cloudinary');

const clubIdFrom = (req) => req.body?.clubId || req.headers['x-club-id'] || null;

// POST /uploads — sube una imagen a Cloudinary y devuelve la URL (optimizada).
const uploadImage = async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({
        ok: false,
        message: 'El almacenamiento de imágenes no está configurado. Falta la variable CLOUDINARY_URL.'
      });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No se recibió ninguna imagen.' });
    }

    const clubId = clubIdFrom(req);
    const folder = `courtin/${clubId || 'general'}`;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (err, r) => (err ? reject(err) : resolve(r))
      );
      stream.end(req.file.buffer);
    });

    // f_auto,q_auto = Cloudinary sirve la imagen optimizada (WebP/AVIF) según el navegador.
    const url = (result.secure_url || '').replace('/upload/', '/upload/f_auto,q_auto/');

    res.status(201).json({ ok: true, url, publicId: result.public_id });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadImage };
