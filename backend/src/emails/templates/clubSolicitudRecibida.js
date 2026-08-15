const { layout, button, notice, paragraph, BRAND } = require('../layout');

// Acuse de recibo de la solicitud de alta, al administrador que la envió.
//
// Existe porque el alta de un complejo no es instantánea: entre que se registra
// y que alguien la aprueba pasan horas. Sin este email la persona se queda con
// la pantalla de "pendiente" y nada en su casilla, que es exactamente la
// sensación de haber llenado un formulario que se perdió.
//
// Lleva adentro el link de verificación de email en vez de mandarlo por
// separado: son dos correos que salen en el mismo segundo y dicen casi lo mismo.
const clubSolicitudRecibida = ({
  nombre,
  clubNombre,
  deportes = [],
  plan,
  trialDias = 30,
  verifyUrl = null,
  verifyTtlHoras = 48
}) => {
  const deportesTexto = deportes.length ? deportes.join(', ') : null;

  return {
    subject: `Recibimos tu solicitud para ${clubNombre}`,
    html: layout({
      title: 'Recibimos tu solicitud',
      preheader: `El alta de ${clubNombre} está en revisión.`,
      body: `
        ${paragraph(`Hola${nombre ? ` ${nombre}` : ''}, ya tenemos la solicitud de alta de <strong>${clubNombre}</strong>.`)}
        ${paragraph('Nuestro equipo la revisa y te avisamos por este mismo mail en cuanto quede aprobada. Recién ahí vas a poder entrar al panel y empezar a cargar tus canchas y horarios.')}
        ${deportesTexto ? paragraph(`Deportes que declaraste: <strong>${deportesTexto}</strong>.`) : ''}
        ${verifyUrl ? paragraph('Mientras tanto, confirmá que esta casilla es tuya:') : ''}
        ${verifyUrl ? button('Confirmar mi email', verifyUrl) : ''}
        ${
          verifyUrl
            ? paragraph(
                `<span style="color: ${BRAND.muted}; font-size: 13px;">El link vence en ${verifyTtlHoras} horas. Si no funciona, copiá y pegá esta dirección:<br /><a href="${verifyUrl}" style="color: ${BRAND.green}; word-break: break-all;">${verifyUrl}</a></span>`
              )
            : ''
        }
        ${notice(
          `Tu prueba gratis de <strong>${trialDias} días</strong>${plan ? ` en el plan <strong>${plan}</strong>` : ''} arranca el día que aprobemos el alta, no hoy: el tiempo que tarde la revisión no te descuenta nada.`
        )}
      `,
      footerNote: 'Si no fuiste vos quien pidió esta alta, ignorá este email.'
    })
  };
};

module.exports = clubSolicitudRecibida;
