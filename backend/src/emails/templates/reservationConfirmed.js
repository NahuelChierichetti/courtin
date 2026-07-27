const { layout, button, notice, paragraph, BRAND, FONT } = require('../layout');

// Fila del bloque de detalle del turno.
const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

/**
 * Confirmación de reserva para el jugador.
 *
 * Las reservas públicas nacen en estado `pendiente` (las confirma el complejo),
 * así que el copy cambia según el estado para no prometer algo que todavía no
 * pasó.
 */
const reservationConfirmed = ({
  nombre,
  clubNombre,
  canchaNombre,
  fecha,
  hora,
  duracion,
  precio,
  estado = 'pendiente',
  manageUrl,
  direccion,
  telefono,
  toleranciaCancelacionHoras
}) => {
  const esConfirmada = estado === 'confirmada';

  const title = esConfirmada ? '¡Turno confirmado!' : 'Recibimos tu reserva';
  const intro = esConfirmada
    ? `Tu turno en <strong>${clubNombre}</strong> quedó confirmado. Te esperamos.`
    : `Tomamos tu pedido de turno en <strong>${clubNombre}</strong>. Queda <strong>pendiente de confirmación</strong> por el complejo; te avisamos apenas lo confirmen.`;

  const detalle = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
      ${detailRow('Cancha', canchaNombre)}
      ${detailRow('Fecha', fecha)}
      ${detailRow('Hora', hora)}
      ${duracion ? detailRow('Duración', duracion) : ''}
      ${precio ? detailRow('Precio', precio) : ''}
      ${direccion ? detailRow('Dónde', direccion) : ''}
      ${telefono ? detailRow('Teléfono', telefono) : ''}
    </table>
  `;

  const politica =
    toleranciaCancelacionHoras > 0
      ? `Podés cancelar sin costo hasta <strong>${toleranciaCancelacionHoras} horas antes</strong> del turno desde el mismo link.`
      : 'Podés gestionar o cancelar tu turno desde el link de arriba.';

  // Gmail en mobile corta el asunto alrededor de los 70 caracteres, así que va
  // solo la hora de inicio y no el rango completo.
  const horaInicio = String(hora).split(' a ')[0];

  return {
    subject: `${esConfirmada ? 'Turno confirmado' : 'Reserva recibida'} · ${clubNombre} · ${fecha}, ${horaInicio}`,
    html: layout({
      title,
      preheader: `${canchaNombre} · ${fecha} a las ${hora}`,
      body: `
        ${paragraph(`Hola${nombre ? ` ${nombre}` : ''}, ${intro}`)}
        ${detalle}
        ${button('Ver o cancelar mi turno', manageUrl)}
        ${notice(`${politica}<br /><br />Guardá este email: el link es tu acceso al turno y no requiere cuenta.`)}
      `,
      footerNote: `Este email es sobre tu turno en ${clubNombre}. Respondé este mensaje para contactarlos.`
    })
  };
};

module.exports = reservationConfirmed;
