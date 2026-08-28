// Casilla a la que llega todo lo que la gente nos escribe: pedidos de demo,
// consultas de la landing y cualquier formulario de contacto que se agregue.
//
// Está centralizada acá y no repetida en cada template porque el día que
// cambie tiene que cambiar en un solo lugar. Ojo: NO es el remitente (eso es
// MAIL_FROM, que tiene que ser un dominio verificado en Resend) ni el
// destinatario de los avisos de alta de complejo (SUPERADMIN_EMAIL).
const DEFAULT_CONTACT_EMAIL = 'courtinapp@gmail.com';

const contactEmail = () => process.env.CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL;

module.exports = { contactEmail, DEFAULT_CONTACT_EMAIL };
