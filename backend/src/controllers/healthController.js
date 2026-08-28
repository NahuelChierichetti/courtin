const mongoose = require('mongoose');

// Cuánto se espera al ping de Mongo antes de darlo por caído. Corto a propósito:
// esto lo consulta un monitor externo cada pocos minutos y Render lo usa como
// health check, así que colgarse 30 segundos esperando una base que no responde
// es exactamente lo que no queremos.
const PING_TIMEOUT_MS = 3000;

const conEspera = (promesa, ms) =>
  Promise.race([
    promesa,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);

/**
 * GET /health
 *
 * Devuelve 200 sólo si la API puede REALMENTE hablar con la base, y 503 si no.
 *
 * Antes respondía `{ ok: true }` fijo, sin mirar nada. El problema de eso no es
 * teórico: el 28/08/2026, al migrar el cluster de Atlas de M0 a Flex, el replica
 * set se rearmó y la conexión abierta quedó apuntando al primario viejo. Todas
 * las consultas se colgaban 30 segundos y el sitio público estaba caído — y este
 * endpoint seguía contestando 200 en menos de un segundo, porque no tocaba la
 * base. Un monitor externo hubiera dicho "todo bien" durante toda la caída.
 *
 * Se hace un `ping` de verdad y no sólo `readyState`: en esa caída el estado de
 * la conexión era "conectado", y lo que fallaba eran las consultas. Preguntarle
 * a Mongoose cómo se siente no alcanza; hay que hacerle una pregunta a la base.
 *
 * Devolver 503 tiene un efecto deseado además de la alerta: Render usa esta ruta
 * como health check y reinicia la instancia cuando falla, que es exactamente lo
 * que hubo que hacer a mano ese día para recuperar el servicio.
 */
const getHealth = async (req, res) => {
  const db = mongoose.connection;

  // 1 = connected. Cualquier otro valor (conectando, desconectado, cerrando) ya
  // es motivo suficiente para no decir que estamos sanos.
  if (db.readyState !== 1) {
    return res.status(503).json({
      ok: false,
      message: 'La API está arriba pero no hay conexión con la base de datos',
      db: 'desconectada'
    });
  }

  try {
    await conEspera(db.db.admin().command({ ping: 1 }), PING_TIMEOUT_MS);
  } catch (error) {
    return res.status(503).json({
      ok: false,
      message: 'La base de datos no responde',
      db: error.message === 'timeout' ? 'sin respuesta' : 'error'
    });
  }

  res.status(200).json({
    ok: true,
    message: 'API funcionando correctamente',
    db: 'conectada'
  });
};

module.exports = {
  getHealth
};
