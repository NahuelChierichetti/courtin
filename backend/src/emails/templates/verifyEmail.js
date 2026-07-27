const { layout, button, notice, paragraph } = require('../layout');

// Confirmación de la dirección de email.
//
// Se manda al registrarse. Su función real no es "activar la cuenta" (que ya
// funciona) sino asegurar que la casilla existe y es de quien dice ser: sin eso,
// un error de tipeo deja al usuario sin recibir nunca el reset de contraseña ni
// las confirmaciones de reserva.
const verifyEmail = ({ nombre, verifyUrl, expiraEnHoras = 48 }) => ({
  subject: 'Confirmá tu email en CourtIn',
  html: layout({
    title: 'Confirmá tu email',
    preheader: 'Un clic y tu cuenta queda verificada.',
    body: `
      ${paragraph(`¡Bienvenido${nombre ? ` ${nombre}` : ''}! Sólo falta confirmar que esta casilla es tuya.`)}
      ${paragraph('Es importante: es la dirección a la que van a llegarte las confirmaciones de reserva y, si alguna vez la necesitás, la recuperación de contraseña.')}
      ${button('Confirmar mi email', verifyUrl)}
      ${paragraph(`<span style="color: #6b7280; font-size: 13px;">Si el botón no funciona, copiá y pegá este link:<br /><a href="${verifyUrl}" style="color: #347048; word-break: break-all;">${verifyUrl}</a></span>`)}
      ${notice(`El link vence en <strong>${expiraEnHoras} horas</strong>. Mientras tanto podés usar CourtIn con normalidad. Si no creaste ninguna cuenta, ignorá este email.`)}
    `
  })
});

module.exports = verifyEmail;
