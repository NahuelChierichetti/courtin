const { layout, button, notice, paragraph, BRAND, FONT } = require('../layout');

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

// Confirmación de pago. Sirve de comprobante y, cuando el complejo venía
// cortado, es el aviso de que volvió a estar operativo.
const pagoAcreditado = ({ clubNombre, periodo, monto, vigenciaHasta, panelUrl, veniaCortado }) => ({
  subject: `Pago recibido · ${clubNombre} · ${periodo}`,
  html: layout({
    title: veniaCortado ? '¡Listo, ya está todo activo!' : 'Recibimos tu pago',
    preheader: `${monto} · al día hasta el ${vigenciaHasta}`,
    body: `
      ${paragraph(
        veniaCortado
          ? `Registramos el pago de <strong>${clubNombre}</strong>. Tu complejo ya volvió a aparecer en las búsquedas y tenés el panel completo de nuevo.`
          : `Registramos el pago de <strong>${clubNombre}</strong>. Gracias.`
      )}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
        ${detailRow('Período', periodo)}
        ${detailRow('Importe', monto)}
        ${detailRow('Al día hasta', vigenciaHasta)}
      </table>
      ${button('Ver mi suscripción', panelUrl)}
      ${notice('Guardá este email como comprobante.')}
    `
  })
});

module.exports = pagoAcreditado;
