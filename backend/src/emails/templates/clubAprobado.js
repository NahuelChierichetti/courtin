const { layout, button, notice, paragraph } = require('../layout');

// El alta se aprobó: acá empieza todo para el complejo.
//
// Es el email que la persona está esperando desde que se registró, así que dice
// una sola cosa y con un solo botón: entrá al panel.
const clubAprobado = ({ nombre, clubNombre, loginUrl, plan, trialHasta }) => ({
  subject: `¡${clubNombre} ya está activo en CourtIn!`,
  html: layout({
    title: 'Tu complejo ya está activo',
    preheader: `Aprobamos el alta de ${clubNombre}. Ya podés entrar al panel.`,
    body: `
      ${paragraph(`Hola${nombre ? ` ${nombre}` : ''}, aprobamos el alta de <strong>${clubNombre}</strong>. Ya podés entrar al panel y empezar a usarlo.`)}
      ${paragraph('Lo primero que conviene hacer: cargar tus canchas, revisar los horarios de atención y publicar el complejo para que los jugadores puedan reservar online.')}
      ${button('Entrar al panel', loginUrl)}
      ${notice(
        `Tu prueba gratis${plan ? ` del plan <strong>${plan}</strong>` : ''} arrancó hoy${trialHasta ? ` y va hasta el <strong>${trialHasta}</strong>` : ''}. Durante ese período tenés todas las funciones disponibles y no se te cobra nada.`
      )}
    `
  })
});

module.exports = clubAprobado;
