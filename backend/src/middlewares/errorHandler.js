// Manejador de errores central. Traduce los errores más comunes de Mongoose a
// mensajes claros (y status correcto) para que el frontend siempre reciba un
// `message` entendible por el usuario, en vez de un texto técnico o un 500 seco.
const errorHandler = (err, req, res, next) => {
  console.error(err);

  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Validación de esquema: junta los mensajes de cada campo inválido.
  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('. ');
  }

  // Id con formato inválido (p.ej. ObjectId mal formado en la URL).
  if (err.name === 'CastError') {
    status = 400;
    message = 'Identificador inválido.';
  }

  // Índice único violado (p.ej. slug de complejo repetido).
  if (err.code === 11000) {
    status = 400;
    const campo = Object.keys(err.keyValue || {})[0];
    message = campo
      ? `Ya existe un registro con ese ${campo}.`
      : 'Ya existe un registro con esos datos.';
  }

  // Nunca dejamos pasar un 500 sin un mensaje legible.
  if (status >= 500 && !err.message) {
    message = 'Error interno del servidor';
  }

  res.status(status).json({
    ok: false,
    message
  });
};

module.exports = errorHandler;
