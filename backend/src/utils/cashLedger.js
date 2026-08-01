const CashMovement = require('../models/CashMovement');

// Métodos que representan un pago efectivo desde la plataforma (ingresa plata
// al complejo al momento de reservar). "complejo" (pagar en el mostrador) NO
// genera ingreso: se registra en persona cuando se cobra.
const ONLINE_METHODS = { mercadopago: 'mercadopago', tarjeta: 'tarjeta' };

/**
 * Registra el ingreso de una reserva pagada online. Es best-effort: si algo
 * falla, NO debe romper la confirmación de la reserva (se loguea y sigue).
 *
 * @param {number} [monto] Lo efectivamente cobrado. Se pasa explícito porque
 *        con seña entra menos plata que el precio del turno, y anotar el total
 *        inflaría la caja con un saldo que todavía no cobró nadie. Sin este
 *        parámetro se asume que se pagó el turno completo.
 */
const recordReservationPayment = async (reservation, metodoPago, monto) => {
  try {
    const metodo = ONLINE_METHODS[metodoPago];
    if (!metodo) return null; // pago en el complejo / método no online

    const importe = monto ?? reservation?.precioFinal;
    if (!importe) return null;

    return await CashMovement.create({
      club: reservation.club,
      tipo: 'ingreso',
      categoria: 'reserva',
      concepto: `Reserva ${reservation.guestName || ''}`.trim(),
      monto: importe,
      metodoPago: metodo,
      origen: 'online',
      reservation: reservation._id,
      court: reservation.court,
      fecha: new Date(),
      createdBy: null
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo registrar el ingreso de la reserva en caja:', err.message);
    return null;
  }
};

module.exports = { recordReservationPayment };
