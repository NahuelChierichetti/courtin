const { layout, button, notice, paragraph, BRAND, FONT } = require('../layout');

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

/**
 * Aviso de turno cancelado al jugador.
 *
 * Cubre los dos orígenes de la cancelación:
 *
 *  • La canceló el complejo: es una novedad y el jugador no se entera por otro
 *    lado. Sin este email se presenta a jugar a un turno que ya no existe.
 *  • La canceló el jugador: es un comprobante de lo que acaba de hacer.
 *
 * El detalle del turno va completo igual en los dos casos: el email tiene que
 * poder leerse solo, sin el de confirmación al lado.
 */
const reservationCancelled = ({
  nombre,
  clubNombre,
  canchaNombre,
  fecha,
  hora,
  direccion,
  telefono,
  // Quién canceló. Cambia el tono del email, no el contenido.
  porElComplejo = false,
  // Link a la búsqueda pública del complejo, para volver a reservar.
  reservarUrl,
  // Plata cobrada online que quedó del lado del complejo. La devolución es
  // manual y a criterio de cada uno, así que acá sólo se avisa que existe.
  pagado
}) => {
  const intro = porElComplejo
    ? `<strong>${clubNombre}</strong> canceló tu turno. No hace falta que vayas: el horario quedó liberado.`
    : `Cancelamos tu turno en <strong>${clubNombre}</strong> como pediste. El horario quedó liberado.`;

  const detalle = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
      ${detailRow('Cancha', canchaNombre)}
      ${detailRow('Fecha', fecha)}
      ${detailRow('Hora', hora)}
      ${direccion ? detailRow('Dónde', direccion) : ''}
      ${telefono ? detailRow('Teléfono', telefono) : ''}
    </table>
  `;

  // Si hay plata de por medio, es lo primero que el jugador quiere saber.
  const avisoPago = pagado
    ? porElComplejo
      ? `Habías pagado <strong>${pagado}</strong>. ${clubNombre} se contacta con vos para coordinar la devolución; si no tenés novedades, respondé este email.`
      : `Habías pagado <strong>${pagado}</strong>. La devolución la define ${clubNombre} según su política de cancelación; respondé este email para coordinarla.`
    : null;

  // Gmail en mobile corta el asunto cerca de los 70 caracteres: va sólo la hora
  // de inicio y no el rango completo.
  const horaInicio = String(hora).split(' a ')[0];

  return {
    subject: `Turno cancelado · ${clubNombre} · ${fecha}, ${horaInicio}`,
    html: layout({
      title: porElComplejo ? 'El complejo canceló tu turno' : 'Turno cancelado',
      preheader: `${canchaNombre} · ${fecha} a las ${hora}`,
      body: `
        ${paragraph(`Hola${nombre ? ` ${nombre}` : ''}, ${intro}`)}
        ${detalle}
        ${reservarUrl ? button('Reservar otro turno', reservarUrl) : ''}
        ${avisoPago ? notice(avisoPago) : ''}
      `,
      footerNote: `Este email es sobre tu turno en ${clubNombre}. Respondé este mensaje para contactarlos.`
    })
  };
};

module.exports = reservationCancelled;
