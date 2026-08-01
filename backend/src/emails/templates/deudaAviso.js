const { layout, button, notice, paragraph, BRAND, FONT } = require('../layout');

// Avisos de deuda. Una plantilla para toda la escalera de cobranza: cambia el
// tono y la urgencia según la etapa, no la estructura.
//
// Cada etapa define el título, el cuerpo y si el corte ya ocurrió o está por
// ocurrir. Agregar un escalón nuevo es agregar una entrada acá.
const ETAPAS = {
  vencida: {
    titulo: 'Tu factura venció',
    urgencia: 'baja',
    cuerpo: (d) =>
      `La factura del período ${d.periodo} venció ${d.diasDeMora === 0 ? 'hoy' : `hace ${d.diasDeMora} día${d.diasDeMora === 1 ? '' : 's'}`}. Escribinos para regularizarla.`
  },
  'aviso-despublicacion': {
    titulo: 'En 2 días tu complejo deja de recibir reservas',
    urgencia: 'media',
    cuerpo: (d) =>
      `Seguimos sin registrar el pago del período ${d.periodo}. En 2 días tu complejo va a dejar de aparecer en las búsquedas y no vas a poder cargar turnos nuevos. Todavía estás a tiempo de evitarlo.`
  },
  despublicado: {
    titulo: 'Tu complejo dejó de recibir reservas',
    urgencia: 'alta',
    cuerpo: (d) =>
      `Por la deuda del período ${d.periodo}, tu complejo ya no aparece en las búsquedas y no podés cargar turnos nuevos. Seguís teniendo acceso al panel y los turnos ya reservados funcionan con normalidad.`
  },
  recordatorio: {
    titulo: 'Tu complejo sigue despublicado',
    urgencia: 'media',
    cuerpo: (d) =>
      `Van ${d.diasDeMora} días desde el vencimiento del período ${d.periodo}. Mientras la deuda siga abierta, no vas a recibir reservas nuevas.`
  },
  'aviso-suspension': {
    titulo: 'En 2 días se bloquea tu acceso al panel',
    urgencia: 'alta',
    cuerpo: (d) =>
      `La deuda del período ${d.periodo} lleva ${d.diasDeMora} días. En 2 días vas a perder el acceso al panel de gestión. Escribinos hoy para evitarlo.`
  },
  suspendido: {
    titulo: 'Acceso bloqueado',
    urgencia: 'alta',
    cuerpo: (d) =>
      `Por la deuda del período ${d.periodo} bloqueamos el acceso al panel de ${d.clubNombre}. Tus datos están intactos y los turnos ya reservados siguen funcionando: apenas regularices, se reactiva todo.`
  }
};

const COLOR_URGENCIA = {
  baja: BRAND.muted,
  media: '#a97f12',
  alta: '#b91c1c'
};

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

const deudaAviso = ({
  etapa,
  clubNombre,
  periodo,
  monto,
  vencimiento,
  diasDeMora,
  panelUrl,
  soporteEmail,
  soporteWhatsapp
}) => {
  const cfg = ETAPAS[etapa] || ETAPAS.vencida;
  const datos = { clubNombre, periodo, monto, diasDeMora };

  const contacto = [
    soporteEmail ? `Email: <a href="mailto:${soporteEmail}" style="color: ${BRAND.green};">${soporteEmail}</a>` : null,
    soporteWhatsapp ? `WhatsApp: ${soporteWhatsapp}` : null
  ]
    .filter(Boolean)
    .join('<br />');

  return {
    subject: `${cfg.titulo} · ${clubNombre}`,
    html: layout({
      title: cfg.titulo,
      preheader: `${periodo} · ${monto} · vencida hace ${diasDeMora} día${diasDeMora === 1 ? '' : 's'}`,
      body: `
        ${paragraph(`<span style="color: ${COLOR_URGENCIA[cfg.urgencia]};">${cfg.cuerpo(datos)}</span>`)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
          ${detailRow('Período', periodo)}
          ${detailRow('Importe', monto)}
          ${detailRow('Venció', vencimiento)}
          ${detailRow('Días de atraso', String(diasDeMora))}
        </table>
        ${button('Ver mi suscripción', panelUrl)}
        ${notice(
          `<strong>Para regularizar, contactate con soporte</strong><br />${contacto || 'Respondé este email y te contactamos.'}<br /><br />Apenas registremos el pago, tu complejo se reactiva automáticamente.`
        )}
      `,
      footerNote: 'Si ya pagaste, avisanos respondiendo este email.'
    })
  };
};

module.exports = deudaAviso;
module.exports.ETAPAS = ETAPAS;
