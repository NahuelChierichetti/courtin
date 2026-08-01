// URLs públicas de la app, para armar links que se consumen FUERA del backend:
// emails, redirects del navegador y las back_urls que recibe MercadoPago.
//
// El único motivo por el que esto es un módulo y no un template string suelto
// es el esquema. Una variable cargada como `courtinapp.com` (sin `https://`)
// pasa desapercibida en cualquier revisión y rompe en silencio tres cosas
// distintas: los links de los emails quedan inválidos, un `res.redirect()` se
// interpreta como ruta relativa y termina pegado al dominio del backend, y
// MercadoPago rechaza la preferencia por back_urls mal formadas. Ninguna de las
// tres tira un error que diga "te falta el https".

const normalize = (raw) => {
  const value = (raw || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

/** URL pública del frontend (panel y sitio público). */
const appUrl = () => normalize(process.env.APP_PUBLIC_URL);

/** URL pública del backend. La usa MercadoPago para llegar al webhook. */
const apiUrl = () => normalize(process.env.API_PUBLIC_URL);

module.exports = { appUrl, apiUrl, normalize };
