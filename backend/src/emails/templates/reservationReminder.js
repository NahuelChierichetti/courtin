const { layout, button, notice, paragraph, BRAND, FONT } = require('../layout');

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

// Recordatorio del turno, 24 h antes.
//
// El objetivo es bajar el no-show: por eso el cuerpo es corto y lo más visible
// es el link para cancelar. Que avisen con tiempo es mejor negocio para el
// complejo que un turno vacío.
const reservationReminder = ({
  nombre,
  clubNombre,
  canchaNombre,
  fecha,
  hora,
  manageUrl,
  direccion,
  telefono,
  toleranciaCancelacionHoras
}) => ({
  subject: `Mañana jugás en ${clubNombre} · ${hora}`,
  html: layout({
    title: 'Te recordamos tu turno',
    preheader: `${canchaNombre} · mañana ${fecha} a las ${hora}`,
    body: `
      ${paragraph(`Hola${nombre ? ` ${nombre}` : ''}, mañana tenés turno en <strong>${clubNombre}</strong>.`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
        ${detailRow('Cancha', canchaNombre)}
        ${detailRow('Fecha', fecha)}
        ${detailRow('Hora', hora)}
        ${direccion ? detailRow('Dónde', direccion) : ''}
        ${telefono ? detailRow('Teléfono', telefono) : ''}
      </table>
      ${button('Ver mi turno', manageUrl)}
      ${notice(
        toleranciaCancelacionHoras > 0
          ? `¿No podés ir? Cancelá desde el link hasta <strong>${toleranciaCancelacionHoras} horas antes</strong> y liberás el turno para otro jugador.`
          : '¿No podés ir? Avisale al complejo así libera el turno.'
      )}
    `,
    footerNote: `Este email es sobre tu turno en ${clubNombre}. Respondé este mensaje para contactarlos.`
  })
});

module.exports = reservationReminder;
