const CashMovement = require('../models/CashMovement');

// Métodos que representan un pago efectivo desde la plataforma (ingresa plata
// al complejo al momento de reservar). "complejo" (pagar en el mostrador) NO
// genera ingreso: se registra en persona cuando se cobra.
const ONLINE_METHODS = { mercadopago: 'mercadopago', tarjeta: 'tarjeta' };

// Registra el ingreso de una reserva pagada online. Es best-effort: si algo
// falla, NO debe romper la creación de la reserva (se loguea y sigue).
const recordReservationPayment = async (reservation, metodoPago) => {
  try {
    const metodo = ONLINE_METHODS[metodoPago];
    if (!metodo) return null; // pago en el complejo / método no online
    if (!reservation?.precioFinal) return null;

    return await CashMovement.create({
      club: reservation.club,
      tipo: 'ingreso',
      categoria: 'reserva',
      concepto: `Reserva ${reservation.guestName || ''}`.trim(),
      monto: reservation.precioFinal,
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
