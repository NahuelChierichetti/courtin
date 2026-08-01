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
  panelUrl
}) => {
  const esCancelacion = tipo === 'cancelacion';

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
  const contexto = esCancelacion
    ? notice('El turno volvió a quedar disponible para que lo tome otro jugador.')
    : notice('Ya le enviamos la confirmación al jugador. El turno está bloqueado en tu agenda.');

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
