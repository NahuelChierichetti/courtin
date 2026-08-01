const { layout, button, notice, paragraph } = require('../layout');

// Avisos del período de prueba.
//
// Una sola plantilla para los tres momentos (faltan 7 días, falta 1, terminó):
// el contenido es casi idéntico y tenerlos separados garantiza que se
// desincronicen apenas alguien cambie el copy en uno solo.
const trialAviso = ({ clubNombre, diasRestantes, panelUrl, soporteEmail, soporteWhatsapp }) => {
  const termino = diasRestantes <= 0;

  const contacto = [
    soporteEmail ? `Email: <a href="mailto:${soporteEmail}" style="color: #347048;">${soporteEmail}</a>` : null,
    soporteWhatsapp ? `WhatsApp: ${soporteWhatsapp}` : null
  ]
    .filter(Boolean)
    .join('<br />');

  const cuerpo = termino
    ? `
      ${paragraph(`Terminó el mes de prueba de <strong>${clubNombre}</strong>. Para seguir usando CourtIn sin interrupciones, escribinos y activamos tu plan.`)}
      ${paragraph('Por ahora no cambia nada: tenés unos días para regularizar antes de que tu complejo deje de aparecer en las búsquedas.')}
    `
    : `
      ${paragraph(`Tu mes de prueba en <strong>${clubNombre}</strong> termina ${diasRestantes === 1 ? '<strong>mañana</strong>' : `en <strong>${diasRestantes} días</strong>`}.`)}
      ${paragraph('Si querés seguir, escribinos y coordinamos la activación de tu plan. No hace falta que hagas nada más.')}
    `;

  return {
    subject: termino
      ? `Terminó tu prueba gratis · ${clubNombre}`
      : `Tu prueba termina ${diasRestantes === 1 ? 'mañana' : `en ${diasRestantes} días`} · ${clubNombre}`,
    html: layout({
      title: termino ? 'Terminó tu prueba gratis' : '¿Seguimos juntos?',
      preheader: termino
        ? 'Escribinos para activar tu plan.'
        : `Quedan ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} de prueba.`,
      body: `
        ${cuerpo}
        ${button('Ver mi suscripción', panelUrl)}
        ${notice(`<strong>Para activar tu plan</strong><br />${contacto || 'Respondé este email y te contactamos.'}`)}
      `
    })
  };
};

module.exports = trialAviso;
