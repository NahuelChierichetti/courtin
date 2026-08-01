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
 * Cubre los dos caminos con un solo email a propósito:
 *
 *  • Reserva sin pago online: nace `pendiente` y la confirma el complejo.
 *  • Reserva pagada: llega ya `confirmada` y suma el detalle del cobro.
 *
 * Mandar un email de "turno confirmado" y otro de "pago acreditado" con un
 * segundo de diferencia es ruido, y a la tercera vez el jugador lo marca como
 * spam. La plata cobrada es un dato del turno, no una novedad aparte.
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
  toleranciaCancelacionHoras,
  // Datos del cobro online. Ausentes en las reservas que se pagan en el complejo.
  pagado,
  saldoPendiente
}) => {
  const esConfirmada = estado === 'confirmada';
  const huboPago = Boolean(pagado);
  const esSena = huboPago && Boolean(saldoPendiente);

  const title = huboPago ? '¡Turno pago y confirmado!' : esConfirmada ? '¡Turno confirmado!' : 'Recibimos tu reserva';

  let intro;
  if (esSena) {
    intro = `Recibimos tu seña y tu turno en <strong>${clubNombre}</strong> quedó confirmado. Al llegar abonás el saldo.`;
  } else if (huboPago) {
    intro = `Recibimos tu pago y tu turno en <strong>${clubNombre}</strong> quedó confirmado. Te esperamos.`;
  } else if (esConfirmada) {
    intro = `Tu turno en <strong>${clubNombre}</strong> quedó confirmado. Te esperamos.`;
  } else {
    intro = `Tomamos tu pedido de turno en <strong>${clubNombre}</strong>. Queda <strong>pendiente de confirmación</strong> por el complejo; te avisamos apenas lo confirmen.`;
  }

  const detalle = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
      ${detailRow('Cancha', canchaNombre)}
      ${detailRow('Fecha', fecha)}
      ${detailRow('Hora', hora)}
      ${duracion ? detailRow('Duración', duracion) : ''}
      ${precio ? detailRow(huboPago ? 'Total del turno' : 'Precio', precio) : ''}
      ${huboPago ? detailRow(esSena ? 'Seña pagada' : 'Pagado', pagado) : ''}
      ${esSena ? detailRow('Resta en el complejo', saldoPendiente) : ''}
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

  const asunto = huboPago ? 'Turno pago' : esConfirmada ? 'Turno confirmado' : 'Reserva recibida';

  return {
    subject: `${asunto} · ${clubNombre} · ${fecha}, ${horaInicio}`,
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
