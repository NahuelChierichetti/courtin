const Client = require('../models/Client');

// Crea o actualiza el cliente del club a partir de una reserva. La clave de
// deduplicación es (club, email): si ya existe un cliente con ese email en el
// club, suma la reserva; si no, lo registra. Sin email no se puede identificar,
// así que no se registra cliente. Best-effort: nunca debe romper la reserva.
const upsertClientFromReservation = async (reservation, extra = {}) => {
  try {
    const email = (extra.email || reservation.guestEmail || '').toLowerCase().trim();
    if (!email) return null;

    const now = new Date();
    const monto = Number(reservation.precioFinal) || 0;

    const set = { ultimaReserva: now };
    if (extra.name || reservation.guestName) set.nombre = extra.name || reservation.guestName;
    if (extra.phone || reservation.guestPhone) set.telefono = extra.phone || reservation.guestPhone;
    if (extra.userId || reservation.customer) set.user = extra.userId || reservation.customer;

    const result = await Client.findOneAndUpdate(
      { club: reservation.club, email },
      {
        $setOnInsert: { primeraReserva: now },
        $set: set,
        $inc: { reservasCount: 1, totalGastado: monto }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, rawResult: true }
    );

    return {
      client: result.value,
      isNew: !result.lastErrorObject?.updatedExisting
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo registrar el cliente de la reserva:', err.message);
    return null;
  }
};

module.exports = { upsertClientFromReservation };
