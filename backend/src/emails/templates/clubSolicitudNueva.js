const { layout, button, paragraph, BRAND, FONT } = require('../layout');

const detailRow = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; color: ${BRAND.muted}; white-space: nowrap;">${label}</td>
    <td align="right" style="padding: 10px 0; border-bottom: 1px solid ${BRAND.border}; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${BRAND.ink};">${value}</td>
  </tr>
`;

// Aviso al superadmin: hay un alta esperando aprobación.
//
// Es el único disparador del circuito. Nadie mira el backoffice todos los días
// esperando solicitudes, así que si este email no sale, el complejo se queda
// pendiente para siempre sin que nadie se entere.
const clubSolicitudNueva = ({
  clubNombre,
  ciudad,
  provincia,
  direccion,
  telefono,
  email,
  canchas,
  plan,
  deportes = [],
  adminNombre,
  adminEmail,
  adminTelefono,
  backofficeUrl
}) => {
  const ubicacion = [ciudad, provincia].filter(Boolean).join(', ');

  return {
    subject: `Nueva solicitud de alta · ${clubNombre}`,
    html: layout({
      title: 'Solicitud de alta pendiente',
      preheader: `${clubNombre}${ubicacion ? ` · ${ubicacion}` : ''} espera aprobación.`,
      body: `
        ${paragraph(`<strong>${clubNombre}</strong> se registró en CourtIn y espera que apruebes el alta.`)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 4px;">
          ${detailRow('Complejo', clubNombre)}
          ${ubicacion ? detailRow('Ubicación', ubicacion) : ''}
          ${direccion ? detailRow('Dirección', direccion) : ''}
          ${telefono ? detailRow('Teléfono', telefono) : ''}
          ${email ? detailRow('Email de avisos', email) : ''}
          ${canchas ? detailRow('Canchas declaradas', String(canchas)) : ''}
          ${plan ? detailRow('Plan que le toca', plan) : ''}
          ${deportes.length ? detailRow('Deportes', deportes.join(', ')) : ''}
          ${adminNombre ? detailRow('Administrador', adminNombre) : ''}
          ${adminEmail ? detailRow('Email del admin', adminEmail) : ''}
          ${adminTelefono ? detailRow('Tel. del admin', adminTelefono) : ''}
        </table>
        ${button('Revisar en el backoffice', backofficeUrl)}
        ${paragraph(
          `<span style="color: ${BRAND.muted}; font-size: 13px;">Hasta que lo apruebes, el complejo no puede entrar al panel ni aparece en el buscador, y su prueba gratis no empezó a correr.</span>`
        )}
      `
    })
  };
};

module.exports = clubSolicitudNueva;
