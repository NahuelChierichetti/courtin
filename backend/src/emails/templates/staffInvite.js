const { layout, button, notice, paragraph } = require('../layout');

const ROLE_LABELS = {
  tenant_admin: 'administrador',
  employee: 'empleado'
};

// Invitación para sumarse al equipo de un complejo.
//
// Reemplaza al circuito viejo, donde un admin le inventaba la contraseña al
// nuevo usuario y se la pasaba por WhatsApp: acá la persona define su propia
// clave y nadie más que ella la conoce.
const staffInvite = ({
  nombre,
  clubNombre,
  role,
  invitadoPor,
  acceptUrl,
  expiraEnDias = 7,
  yaTieneCuenta = false
}) => {
  const rolLabel = ROLE_LABELS[role] || 'miembro del equipo';

  const quien = invitadoPor ? `<strong>${invitadoPor}</strong> te invitó` : 'Te invitaron';

  const queHacer = yaTieneCuenta
    ? 'Como ya tenés cuenta en CourtIn, con aceptar te alcanza: el complejo te va a aparecer al iniciar sesión.'
    : 'Aceptá la invitación y elegí tu contraseña para entrar.';

  return {
    subject: `${invitadoPor || 'Te invitaron'} a sumarte a ${clubNombre} en CourtIn`,
    html: layout({
      title: `Sumate a ${clubNombre}`,
      preheader: `Invitación para gestionar ${clubNombre} como ${rolLabel}.`,
      body: `
        ${paragraph(`Hola${nombre ? ` ${nombre}` : ''}, ${quien} a gestionar <strong>${clubNombre}</strong> en CourtIn como <strong>${rolLabel}</strong>.`)}
        ${paragraph(queHacer)}
        ${button('Aceptar invitación', acceptUrl)}
        ${paragraph(`<span style="color: #6b7280; font-size: 13px;">Si el botón no funciona, copiá y pegá este link:<br /><a href="${acceptUrl}" style="color: #347048; word-break: break-all;">${acceptUrl}</a></span>`)}
        ${notice(`La invitación vence en <strong>${expiraEnDias} días</strong>. Si no esperabas este email, ignoralo: sin aceptarlo no se crea ningún acceso.`)}
      `
    })
  };
};

module.exports = staffInvite;
