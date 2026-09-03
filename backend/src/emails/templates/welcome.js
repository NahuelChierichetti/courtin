const { layout, button, notice, paragraph } = require('../layout');

const welcome = ({ nombre, appUrl, cuentaUrl }) => {
  const primerNombre = (nombre || '').trim().split(/\s+/)[0] || '';

  return {
    subject: `¡Bienvenido a Courtin${primerNombre ? `, ${primerNombre}` : ''}!`,
    html: layout({
      title: 'Tu cuenta ya está lista',
      preheader: 'Buscá complejos, reservá tu cancha y guardá tus favoritos.',
      body: `
      ${paragraph(`Hola${primerNombre ? ` ${primerNombre}` : ''}, entraste con Google y tu cuenta quedó creada.`)}
      ${paragraph('Desde Courtin podés buscar complejos cerca tuyo, ver la disponibilidad real de cada cancha y reservar en el momento, sin llamar ni esperar que te contesten. Los lugares donde jugás siempre los guardás en favoritos para tenerlos a mano.')}
      ${button('Buscar canchas', appUrl)}
      ${notice(
        `Vas a entrar siempre con el botón de Google. Si alguna vez preferís entrar también con tu email y una contraseña, podés definirla desde <a href="${cuentaUrl}" style="color: #347048;">Mi cuenta</a>.`
      )}
    `
    })
  };
};

module.exports = welcome;
