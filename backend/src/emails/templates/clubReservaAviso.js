const { layout, button, notice, paragraph, BRAND, FONT } = require('../layout');

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

// Avisos al complejo sobre el movimiento de sus turnos.
//
// Sólo se mandan por lo que el complejo NO hizo: una reserva que entró por la
// web o una cancelación del jugador. Avisarle de lo que acaba de cargar él mismo
// en el backoffice sería ruido puro.
const clubReservaAviso = ({
  tipo, // 'nueva' | 'cancelacion'
  clubNombre,
  canchaNombre,
  fecha,
  hora,
  precio,
  jugadorNombre,
  jugadorTelefono,
  jugadorEmail,
  panelUrl,
  // Cobro online. Vacíos cuando la reserva se paga en el complejo.
  pagado,
  saldoPendiente
}) => {
  const esCancelacion = tipo === 'cancelacion';
  const huboPago = Boolean(pagado);

  const contacto = [
    jugadorTelefono ? `Tel: ${jugadorTelefono}` : null,
    jugadorEmail ? `Email: ${jugadorEmail}` : null
  ]
    .filter(Boolean)
    .join(' · ');

  const cabecera = esCancelacion
    ? paragraph(`<strong>${jugadorNombre || 'Un jugador'}</strong> canceló su turno en ${clubNombre}.`)
    : paragraph(`<strong>${jugadorNombre || 'Un jugador'}</strong> reservó por la web.`);

  // No hace falta advertir que canceló "fuera de plazo": el sistema no lo
  // permite. `cancelReservationByToken` rechaza con un 400 cualquier
  // cancelación que no respete la tolerancia del club, así que si este email
  // salió es porque avisó a tiempo.
  let contexto;
  if (esCancelacion) {
    contexto = notice('El turno volvió a quedar disponible para que lo tome otro jugador.');
  } else if (saldoPendiente) {
    contexto = notice(
      `El jugador pagó la seña de ${pagado} por MercadoPago. <strong>Cobrale ${saldoPendiente} al llegar.</strong> Ya le enviamos la confirmación.`
    );
  } else if (huboPago) {
    contexto = notice(
      `El jugador ya pagó ${pagado} por MercadoPago: el dinero está en tu cuenta y no hay nada que cobrar en el mostrador.`
    );
  } else {
    contexto = notice(
      'Ya le enviamos la confirmación al jugador. El turno está bloqueado en tu agenda y se cobra en el complejo.'
    );
  }

  return {
    subject: esCancelacion
      ? `Cancelaron un turno · ${canchaNombre} · ${fecha}, ${hora}`
      : `Nueva reserva · ${canchaNombre} · ${fecha}, ${hora}`,
    html: layout({
      title: esCancelacion ? 'Cancelaron un turno' : 'Nueva reserva',
      preheader: `${canchaNombre} · ${fecha} a las ${hora}`,
      body: `
        ${cabecera}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
          ${detailRow('Cancha', canchaNombre)}
          ${detailRow('Fecha', fecha)}
          ${detailRow('Hora', hora)}
          ${precio ? detailRow('Precio', precio) : ''}
          ${huboPago ? detailRow(saldoPendiente ? 'Seña cobrada' : 'Cobrado online', pagado) : ''}
          ${saldoPendiente ? detailRow('A cobrar en el complejo', saldoPendiente) : ''}
          ${jugadorNombre ? detailRow('Jugador', jugadorNombre) : ''}
          ${contacto ? detailRow('Contacto', contacto) : ''}
        </table>
        ${button('Ver mi agenda', panelUrl)}
        ${contexto}
      `,
      footerNote: 'Podés desactivar estos avisos desde Configuración → General.'
    })
  };
};

module.exports = clubReservaAviso;
