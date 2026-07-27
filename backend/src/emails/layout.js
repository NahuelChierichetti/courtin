// Layout base de los emails de CourtIn.
//
// Los clientes de correo (sobre todo Outlook y Gmail) no soportan CSS moderno:
// nada de flex, grid, ni hojas de estilo externas. Por eso todo va con tablas
// anidadas y estilos inline, que es lo único que renderiza parejo en todos.

// Paleta de marca, espejo de frontend/src/style.css.
const BRAND = {
  green: '#347048',
  greenDark: '#22492f',
  lime: '#B9CF32',
  sand: '#F6EDE5',
  ink: '#16241b',
  muted: '#6b7280',
  border: '#e5e0d9',
  white: '#ffffff'
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Botón principal. Va como tabla y no como <a> con padding porque Outlook
// ignora el padding de los enlaces y el botón queda sin caja.
const button = (label, url) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0;">
    <tr>
      <td align="center" bgcolor="${BRAND.lime}" style="border-radius: 999px;">
        <a href="${url}" style="display: inline-block; padding: 14px 32px; font-family: ${FONT}; font-size: 15px; font-weight: 600; color: ${BRAND.greenDark}; text-decoration: none; border-radius: 999px;">${label}</a>
      </td>
    </tr>
  </table>
`;

// Bloque de aviso (fondo arena) para notas al margen o advertencias suaves.
const notice = (text) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 0;">
    <tr>
      <td style="background-color: ${BRAND.sand}; border-radius: 12px; padding: 16px 20px; font-family: ${FONT}; font-size: 13px; line-height: 1.6; color: ${BRAND.ink};">${text}</td>
    </tr>
  </table>
`;

const paragraph = (text) =>
  `<p style="margin: 0 0 16px; font-family: ${FONT}; font-size: 15px; line-height: 1.65; color: #3f4a43;">${text}</p>`;

/**
 * Envuelve el cuerpo de un email en el layout de marca.
 *
 * @param {string} title      Encabezado grande del email.
 * @param {string} body       HTML del cuerpo (usar los helpers de este módulo).
 * @param {string} preheader  Texto de vista previa en la bandeja de entrada.
 * @param {string} footerNote Línea extra en el pie (ej. datos del complejo).
 */
const layout = ({ title, body, preheader = '', footerNote = '' }) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.sand};">
  <!-- Vista previa de la bandeja: se muestra junto al asunto pero no en el cuerpo.
       El relleno evita que el cliente de correo complete con el texto que sigue. -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
    ${preheader}${'&#847;&zwnj;&nbsp;'.repeat(60)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.sand}; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; margin: 0 auto;">

          <!-- Marca. Va como texto y no como imagen a propósito: casi todos los
               clientes bloquean las imágenes por defecto, y un logo en SVG
               directamente no lo renderiza ninguno. -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-family: ${FONT}; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: ${BRAND.ink};">Court<span style="color: ${BRAND.green};">In</span></span>
            </td>
          </tr>

          <tr>
            <td style="background-color: ${BRAND.white}; border-radius: 16px; padding: 40px 36px;">
              <h1 style="margin: 0 0 20px; font-family: ${FONT}; font-size: 24px; font-weight: 700; line-height: 1.3; color: ${BRAND.ink};">${title}</h1>
              ${body}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 24px 16px 0; font-family: ${FONT}; font-size: 12px; line-height: 1.6; color: ${BRAND.muted};">
              ${footerNote ? `<p style="margin: 0 0 8px;">${footerNote}</p>` : ''}
              <p style="margin: 0;">CourtIn · Gestión de complejos deportivos</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

module.exports = { layout, button, notice, paragraph, BRAND, FONT };
