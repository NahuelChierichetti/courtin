const { layout, button, notice, paragraph, BRAND, FONT } = require('../layout');

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

// Aviso de factura emitida al complejo.
//
// El abono de la suscripción se cobra por fuera de la plataforma: el email lleva
// al complejo a contactar a soporte para coordinar el pago. (MercadoPago es otra
// cosa: la usa cada complejo para cobrarle las reservas a sus jugadores.)
const invoiceIssued = ({
  clubNombre,
  periodo,
  monto,
  vencimiento,
  plan,
  ciclo,
  panelUrl,
  soporteEmail,
  soporteWhatsapp
}) => {
  const contacto = [
    soporteEmail ? `Email: <a href="mailto:${soporteEmail}" style="color: ${BRAND.green};">${soporteEmail}</a>` : null,
    soporteWhatsapp ? `WhatsApp: ${soporteWhatsapp}` : null
  ]
    .filter(Boolean)
    .join('<br />');

  return {
    subject: `Factura ${periodo} de CourtIn · ${monto}`,
    html: layout({
      title: 'Tu factura está lista',
      preheader: `${monto} · vence el ${vencimiento}`,
      body: `
        ${paragraph(`Hola, emitimos la factura de <strong>${clubNombre}</strong> correspondiente al período ${periodo}.`)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
          ${detailRow('Período', periodo)}
          ${detailRow('Plan', `${plan} · ${ciclo}`)}
          ${detailRow('Importe', monto)}
          ${detailRow('Vence', vencimiento)}
        </table>
        ${button('Ver mi factura', panelUrl)}
        ${notice(
          `<strong>Cómo pagar</strong><br />Escribinos y coordinamos el pago. Apenas lo recibamos te la marcamos como paga.${contacto ? `<br /><br />${contacto}` : '<br /><br />Podés responder este mismo email.'}`
        )}
      `,
      footerNote: 'Si ya pagaste, ignorá este email.'
    })
  };
};

module.exports = invoiceIssued;
