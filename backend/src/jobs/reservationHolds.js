const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');

// Libera los horarios que quedaron bloqueados por un checkout que nadie
// terminó de pagar.
//
// Al reservar con pago online la reserva nace `pendiente`, y eso hace que el
// índice único parcial de `Reservation` (que cubre pendiente + confirmada) le
// guarde el slot mientras el jugador está en MercadoPago. Es exactamente lo que
// se quiere durante esos minutos y exactamente lo que NO se quiere después: sin
// esta tarea, cada persona que abre el checkout y cierra la pestaña deja un
// horario muerto para siempre.
//
// No manda ningún email: nadie quiere recibir un aviso por un pago que decidió
// no hacer.

/**
 * Cancela las reservas cuyo hold venció y marca sus intentos de cobro como
 * expirados.
 *
 * Corre seguido y es idempotente: una reserva ya cancelada no vuelve a entrar
 * porque el filtro exige `estado: 'pendiente'`.
 *
 * @returns {Promise<{revisadas:number, liberadas:number}>}
 */
const runReservationHolds = async () => {
  const ahora = new Date();

  const vencidas = await Reservation.find({
    estado: 'pendiente',
    'pago.estado': 'pendiente',
    expiraEn: { $ne: null, $lt: ahora }
  }).select('_id');

  const stats = { revisadas: vencidas.length, liberadas: 0 };
  if (vencidas.length === 0) return stats;

  const ids = vencidas.map((r) => r._id);

  // El filtro repite las condiciones para que un pago que se acreditó entre el
  // find y el update no termine cancelado: si el webhook llegó primero, la
  // reserva ya es `confirmada` y este update no la toca.
  const result = await Reservation.updateMany(
    { _id: { $in: ids }, estado: 'pendiente', 'pago.estado': 'pendiente' },
    { $set: { estado: 'cancelada' }, $unset: { expiraEn: '' } }
  );

  stats.liberadas = result.modifiedCount;

  await Payment.updateMany(
    { reservation: { $in: ids }, estado: 'pendiente' },
    { $set: { estado: 'expirado' } }
  );

  return stats;
};

module.exports = { runReservationHolds };
