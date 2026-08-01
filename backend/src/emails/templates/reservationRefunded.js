const { layout, notice, paragraph, BRAND, FONT } = require('../layout');

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

/**
 * Aviso de devolución al jugador.
 *
 * Lo dispara el complejo desde el panel, no un automatismo: la política de
 * devolución de señas la decide cada complejo caso por caso.
 */
const reservationRefunded = ({ nombre, clubNombre, canchaNombre, fecha, hora, monto }) => ({
  subject: `Devolución de tu pago · ${clubNombre} · ${fecha}`,
  html: layout({
    title: 'Te devolvimos el pago',
    preheader: `${monto} · ${canchaNombre} · ${fecha}`,
    body: `
      ${paragraph(
        `Hola${nombre ? ` ${nombre}` : ''}, <strong>${clubNombre}</strong> te devolvió el pago de tu turno.`
      )}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
        ${detailRow('Cancha', canchaNombre)}
        ${detailRow('Fecha', fecha)}
        ${detailRow('Hora', hora)}
        ${detailRow('Devuelto', monto)}
      </table>
      ${notice(
        'MercadoPago procesa la devolución al mismo medio de pago que usaste. Según el banco puede tardar hasta 20 días hábiles en aparecer en tu resumen.'
      )}
    `,
    footerNote: `Si tenés dudas sobre esta devolución, respondé este email y te contesta ${clubNombre}.`
  })
});

module.exports = reservationRefunded;
