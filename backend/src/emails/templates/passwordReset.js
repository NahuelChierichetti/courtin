const { layout, button, notice, paragraph } = require('../layout');

// Email de recuperación de contraseña.
// `resetUrl` ya viene armado con el token en la query (lo hace el controlador).
const passwordReset = ({ nombre, resetUrl, expiraEnMinutos = 60 }) => ({
  subject: 'Restablecé tu contraseña de CourtIn',
  html: layout({
    title: '¿Olvidaste tu contraseña?',
    preheader: `El link vence en ${expiraEnMinutos} minutos.`,
    body: `
      ${paragraph(`Hola${nombre ? ` ${nombre}` : ''}, recibimos un pedido para restablecer la contraseña de tu cuenta.`)}
      ${paragraph('Tocá el botón para elegir una nueva:')}
      ${button('Restablecer contraseña', resetUrl)}
      ${paragraph(`<span style="color: #6b7280; font-size: 13px;">Si el botón no funciona, copiá y pegá este link en tu navegador:<br /><a href="${resetUrl}" style="color: #347048; word-break: break-all;">${resetUrl}</a></span>`)}
      ${notice(`El link vence en <strong>${expiraEnMinutos} minutos</strong> y se puede usar una sola vez. Si no pediste esto, ignorá el email: tu contraseña sigue igual.`)}
    `
  })
});

module.exports = passwordReset;
