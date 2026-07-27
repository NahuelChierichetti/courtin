const { Resend } = require('resend');

// Cliente de Resend. Usamos la API HTTPS y no SMTP a propósito: las plataformas
// de deploy (Render entre ellas) bloquean los puertos de SMTP saliente, y el
// puerto 443 nunca está bloqueado.
//
// El SDK se publica como ESM+CJS; acá lo consumimos con require porque el
// backend es CommonJS (el snippet de la doc de Resend usa `import`).
let client = null;

const isConfigured = () => Boolean(process.env.RESEND_API_KEY);

// Instancia perezosa: se crea recién en el primer envío, así el módulo se puede
// importar aunque la env var no esté seteada (tests, scripts, dev sin email).
const getClient = () => {
  if (!isConfigured()) return null;
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
};

module.exports = { getClient, isConfigured };
