const { layout, paragraph, BRAND, FONT } = require('../layout');

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

// Aviso interno: alguien pidió una demo desde la landing.
//
// El destinatario somos nosotros, no el complejo, así que no hay CTA ni
// explicaciones: lo único que importa es tener los datos de contacto a mano
// para poder responder. El `replyTo` del envío apunta al email de quien lo
// completó, así que responder este mail le llega directo.
const demoSolicitud = ({ clubNombre, email, telefono, canchas }) => ({
  subject: `Pedido de demo · ${clubNombre}`,
  html: layout({
    title: 'Pedido de demo',
    preheader: `${clubNombre} quiere ver CourtIn${canchas ? ` · ${canchas} canchas` : ''}.`,
    body: `
      ${paragraph(`<strong>${clubNombre}</strong> pidió una demo desde la landing.`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
        ${detailRow('Complejo', clubNombre)}
        ${detailRow('Email', `<a href="mailto:${email}" style="color: ${BRAND.green};">${email}</a>`)}
        ${detailRow('Teléfono', `<a href="tel:${telefono.replace(/[^\d+]/g, '')}" style="color: ${BRAND.green};">${telefono}</a>`)}
        ${canchas ? detailRow('Canchas', String(canchas)) : ''}
      </table>
      ${paragraph(
        `<span style="color: ${BRAND.muted}; font-size: 13px;">Respondé este mail y le llega directo a ${email}.</span>`
      )}
    `
  })
});

module.exports = demoSolicitud;
