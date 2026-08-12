const Notification = require('../models/Notification');
const UserNotification = require('../models/UserNotification');

// Crea una notificación del complejo. Best-effort: nunca debe romper el flujo
// que la dispara.
const notify = async (clubId, { tipo, titulo, mensaje, reservation } = {}) => {
  try {
    if (!clubId || !titulo) return null;
    return await Notification.create({
      club: clubId,
      tipo: tipo || 'sistema',
      titulo,
      mensaje: mensaje || '',
      reservation: reservation || null
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo crear la notificación:', err.message);
    return null;
  }
};

// Crea una notificación para un jugador (campanita del sitio público).
//
// Igual de best-effort que `notify`, y con la misma regla: si no hay
// destinatario no pasa nada. Eso cubre solo el caso más común de este producto,
// que es la reserva de un invitado sin cuenta: no hay adónde mandarla, y no es
// un error.
//
// Con `dedupeKey`, repetir la llamada es un no-op: lo garantiza el índice único
// del modelo, no una lectura previa, así que dos corridas simultáneas del mismo
// job tampoco duplican.
const notifyUser = async (userId, { tipo, titulo, mensaje, club, reservation, dedupeKey } = {}) => {
  try {
    if (!userId || !titulo) return null;

    if (dedupeKey) {
      const result = await UserNotification.updateOne(
        { dedupeKey },
        {
          $setOnInsert: {
            user: userId,
            club: club || null,
            tipo: tipo || 'sistema',
            titulo,
            mensaje: mensaje || '',
            reservation: reservation || null,
            dedupeKey
          }
        },
        { upsert: true }
      );
      return result.upsertedId ? { _id: result.upsertedId } : null;
    }

    return await UserNotification.create({
      user: userId,
      club: club || null,
      tipo: tipo || 'sistema',
      titulo,
      mensaje: mensaje || '',
      reservation: reservation || null
    });
  } catch (err) {
    // Un duplicado se ignora SÓLO si veníamos pidiendo dedupe: ahí significa que
    // otro proceso ganó la carrera, que es justo lo que se buscaba. Sin
    // `dedupeKey`, un 11000 es un índice mal definido y hay que verlo.
    if (err.code === 11000 && dedupeKey) return null;

    // eslint-disable-next-line no-console
    console.error('No se pudo crear la notificación del jugador:', err.message);
    return null;
  }
};

module.exports = { notify, notifyUser };
