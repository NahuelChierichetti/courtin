const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const CashMovement = require('../models/CashMovement');
const { recordReservationPayment } = require('./cashLedger');
const { upsertClientFromReservation } = require('./clients');
const { notify } = require('./notifications');
const { sendReservationConfirmation, sendClubReservationNotice } = require('./reservationEmails');
const { DEFAULT_TZ } = require('./timezone');

// Cuántos minutos se le bloquea el horario a alguien que arrancó el checkout.
// Alcanza de sobra para completar un pago con tarjeta y no deja el turno
// muerto tanto tiempo como para perder otra reserva.
const HOLD_MINUTES = 15;

/**
 * Cuánto se cobra por adelantado según la configuración del complejo.
 *
 * La seña se acota al precio del turno: un porcentaje mal cargado (o un monto
 * fijo mayor que una cancha barata) no puede terminar cobrándole al jugador
 * más de lo que sale el turno.
 *
 * @returns {{ monto: number, tipo: 'sena'|'total', saldo: number }}
 */
const montoACobrar = (club, precioFinal) => {
  const total = Math.round(Number(precioFinal) || 0);
  const pagos = club?.pagos || {};

  if (pagos.modalidad !== 'sena') {
    return { monto: total, tipo: 'total', saldo: 0 };
  }

  const valor = Number(pagos.senaValor) || 0;
  const bruto = pagos.senaTipo === 'fijo' ? valor : (total * valor) / 100;
  const monto = Math.min(Math.max(Math.round(bruto), 0), total);

  // Una seña que termina siendo el turno entero es un pago total: así el email
  // no le dice al jugador "resta $0 en el complejo".
  if (monto >= total) return { monto: total, tipo: 'total', saldo: 0 };

  return { monto, tipo: 'sena', saldo: total - monto };
};

/** Instante en que expira el bloqueo del horario. */
const holdExpiresAt = () => new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

/**
 * ¿Este club puede cobrar online? Requiere la cuenta vinculada.
 */
const cobraOnline = (club) => club?.pagos?.mp?.conectado === true;

/**
 * Confirma la reserva a partir de un pago acreditado.
 *
 * ES EL ÚNICO LUGAR donde una reserva pasa a `confirmada` por haber pagado, y
 * es idempotente: el webhook de MercadoPago llega varias veces por el mismo
 * pago, y además la pantalla de retorno del jugador también lo llama como red
 * de contención si el webhook se demora.
 *
 * La idempotencia se apoya en el update condicional de la reserva
 * (`pago.estado: 'pendiente'`): sólo el primer llamado modifica algo, y el
 * resto sale sin duplicar el ingreso en caja ni el email.
 *
 * @returns {Promise<boolean>} true si esta llamada fue la que confirmó.
 */
const confirmarPagoDeReserva = async ({ payment, reservation, club, court }) => {
  const { monto, tipo } = payment;
  const total = payment.montoTotalTurno ?? reservation.precioFinal ?? monto;
  const saldo = Math.max(total - monto, 0);

  // Update condicional: si otro llamado ya la confirmó, `modifiedCount` es 0 y
  // salimos sin repetir los efectos.
  const result = await Reservation.updateOne(
    { _id: reservation._id, 'pago.estado': 'pendiente' },
    {
      $set: {
        estado: 'confirmada',
        'pago.estado': 'pagado',
        'pago.tipo': tipo,
        'pago.montoPagado': monto,
        'pago.saldoPendiente': saldo
      },
      $unset: { expiraEn: '' }
    }
  );

  if (result.modifiedCount !== 1) return false;

  // El documento en memoria se usa abajo para los emails y la caja.
  reservation.estado = 'confirmada';
  reservation.pago = { estado: 'pagado', tipo, montoPagado: monto, saldoPendiente: saldo };

  // Ingreso en caja por lo efectivamente cobrado (la seña, no el turno entero):
  // el saldo entra recién cuando el complejo lo cobra en el mostrador.
  await recordReservationPayment(reservation, 'mercadopago', monto);

  const clientResult = await upsertClientFromReservation(reservation);

  const tz = club.timezone || DEFAULT_TZ;
  const cuando = dayjs(reservation.inicio).tz(tz).format('DD MMM HH:mm');
  const nombreCancha = court?.nombre || 'una cancha';

  await notify(club._id, {
    tipo: 'reserva',
    titulo: 'Nueva reserva',
    mensaje: `${reservation.guestName} reservó ${nombreCancha} · ${cuando}`,
    reservation: reservation._id
  });

  await notify(club._id, {
    tipo: 'pago',
    titulo: tipo === 'sena' ? 'Seña acreditada' : 'Pago acreditado',
    mensaje: `${reservation.guestName} pagó $${monto.toLocaleString('es-AR')} por ${nombreCancha}`,
    reservation: reservation._id
  });

  if (clientResult?.isNew) {
    await notify(club._id, {
      tipo: 'cliente',
      titulo: 'Nuevo cliente',
      mensaje: `${reservation.guestName} hizo su primera reserva`
    });
  }

  // Un solo email al jugador: confirma el turno Y el pago. Dos mails seguidos
  // diciendo casi lo mismo es la forma más rápida de terminar en spam.
  await sendReservationConfirmation({ reservation, club, court });
  await sendClubReservationNotice({ tipo: 'nueva', reservation, club, court });

  return true;
};

/**
 * Marca una devolución: el pago vuelve al jugador y la reserva queda sin cobro.
 *
 * El egreso en caja es compensatorio (no borra el ingreso original) para que el
 * libro de caja siga siendo un registro histórico y no una foto editable.
 */
const registrarReembolso = async ({ payment, reservation, monto }) => {
  const importe = monto ?? payment.monto;

  if (payment.estado === 'reembolsado') return false;

  payment.estado = 'reembolsado';
  payment.reembolsadoEn = new Date();
  await payment.save();

  if (reservation) {
    await Reservation.updateOne(
      { _id: reservation._id },
      { $set: { 'pago.estado': 'reembolsado', 'pago.montoPagado': 0, 'pago.saldoPendiente': 0 } }
    );
  }

  try {
    await CashMovement.create({
      club: payment.club,
      tipo: 'egreso',
      categoria: 'otro',
      concepto: `Devolución reserva ${reservation?.guestName || ''}`.trim(),
      monto: importe,
      metodoPago: 'mercadopago',
      origen: 'online',
      reservation: payment.reservation,
      court: reservation?.court || null,
      fecha: new Date(),
      createdBy: null
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo registrar la devolución en caja:', err.message);
  }

  return true;
};

/** Marca como rechazado un intento de cobro que MercadoPago no aprobó. */
const registrarRechazo = async (payment, mpPayment) => {
  payment.estado = 'rechazado';
  payment.rawStatus = mpPayment.status;
  payment.rawStatusDetail = mpPayment.status_detail;
  await payment.save();
};

/**
 * Busca nuestro registro del pago que MercadoPago está notificando.
 *
 * Se filtra por club aunque el `paymentId` ya sea único: es el corte que impide
 * que un aviso del club A pueda tocar una reserva del club B si alguna vez se
 * cruzan los ids.
 */
const findPaymentForMpNotification = async (clubId, mpPayment) => {
  const porId = await Payment.findOne({ club: clubId, paymentId: String(mpPayment.id) });
  if (porId) return porId;

  if (!mpPayment.external_reference) return null;

  // Primera vez que vemos este pago: se lo ubica por la reserva. El más
  // reciente, porque si al jugador le rechazaron la tarjeta y reintentó, el
  // pago aprobado corresponde al último intento y no al primero.
  return Payment.findOne({
    club: clubId,
    externalReference: String(mpPayment.external_reference),
    estado: 'pendiente'
  }).sort({ createdAt: -1 });
};

module.exports = {
  HOLD_MINUTES,
  montoACobrar,
  holdExpiresAt,
  cobraOnline,
  confirmarPagoDeReserva,
  registrarReembolso,
  registrarRechazo,
  findPaymentForMpNotification
};
