const { layout, notice, paragraph } = require('../layout');

// El alta no prosperó.
//
// Sin motivo el email no sirve de nada: la persona no sabe si le falta un dato,
// si el complejo ya estaba cargado o si tiene que insistir. Por eso el motivo lo
// escribe el superadmin al rechazar y viaja tal cual.
const clubRechazado = ({ nombre, clubNombre, motivo, soporteEmail }) => ({
  subject: `Sobre tu solicitud para ${clubNombre}`,
  html: layout({
    title: 'No pudimos aprobar tu solicitud',
    preheader: `Revisamos el alta de ${clubNombre}.`,
    body: `
      ${paragraph(`Hola${nombre ? ` ${nombre}` : ''}, revisamos la solicitud de alta de <strong>${clubNombre}</strong> y por ahora no pudimos aprobarla.`)}
      ${motivo ? notice(`<strong>Motivo:</strong> ${motivo}`) : ''}
      ${paragraph(
        soporteEmail
          ? `Si creés que es un error o querés volver a intentarlo con los datos corregidos, escribinos a <a href="mailto:${soporteEmail}" style="color: #347048;">${soporteEmail}</a> y lo vemos.`
          : 'Si creés que es un error o querés volver a intentarlo con los datos corregidos, respondé este email y lo vemos.'
      )}
    `
  })
});

module.exports = clubRechazado;
