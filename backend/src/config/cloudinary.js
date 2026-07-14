const cloudinary = require('cloudinary').v2;

// El SDK toma automáticamente la env CLOUDINARY_URL (formato
// cloudinary://<api_key>:<api_secret>@<cloud_name>). Como alternativa, se puede
// configurar por variables sueltas.
if (!process.env.CLOUDINARY_URL && process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const isConfigured = () =>
  Boolean(process.env.CLOUDINARY_URL) ||
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

module.exports = { cloudinary, isConfigured };
