const Reservation = require('../models/Reservation');
const Court = require('../models/Court');
const User = require('../models/User');
const Club = require('../models/Club');
const Payment = require('../models/Payment');
const { validateReservationSlot, isReservationInProgress, canCancelReservation } = require('../utils/reservationRules');
const { upsertClientFromReservation } = require('../utils/clients');
const { notify, notifyUser } = require('../utils/notifications');
const {
  sendReservationConfirmation,
  sendReservationCancellation,
  sendClubReservationNotice,
  sendRefundNotice
} = require('../utils/reservationEmails');
const { puedeCrearReservas } = require('../utils/subscriptions');
const { registrarReembolso } = require('../utils/payments');
const { getClubAccessToken, refundPayment } = require('../utils/mercadopago');
const { formatInstant, localDayRange } = require('../utils/timezone');

const ACTIVE_RESERVATION_STATUSES = ['pendiente', 'confirmada'];

// El club poblado por defecto no trae los datos de contacto que necesita el
// email (dirección, teléfono, política de cancelación).
const CLUB_EMAIL_FIELDS =
  'nombre slug direccion ciudad telefono whatsapp email timezone moneda horarios notificaciones';

const POPULATE = [
  ['club', 'nombre slug estado timezone moneda'],
  ['court', 'nombre tipo estado precio duracionTurno'],
  ['customer', 'nombre email estado'],
  ['creadaPor', 'nombre email']
];

const populateReservation = (query) => {
  POPULATE.forEach(([path, fields]) => query.populate(path, fields));
  return query;
};

const isValidInstantRange = (inicio, fin) => {
  const a = new Date(inicio).getTime();
  const b = new Date(fin).getTime();
  return Number.isFinite(a) && Number.isFinite(b) && a < b;
};

const validateCustomerData = async ({ customerId, guestName, guestPhone }) => {
  if (!customerId && !guestName) {
    return { ok: false, status: 400, message: 'Debes indicar un cliente registrado o el nombre del invitado' };
  }

  if (!customerId && !guestPhone) {
    return { ok: false, status: 400, message: 'Debes indicar el teléfono del invitado si no hay usuario registrado' };
  }

  if (customerId) {
    const customer = await User.findById(customerId);

    if (!customer) {
      return { ok: false, status: 404, message: 'Usuario cliente no encontrado' };
    }

    if (customer.estado !== 'activo') {
      return { ok: false, status: 403, message: 'El usuario cliente está inactivo' };
    }
  }

  return { ok: true };
};

// Solapamiento por instantes: inicioA < finB && finA > inicioB.
const findOverlappingReservation = async ({ clubId, courtId, inicio, fin, excludeId }) => {
  const query = {
    club: clubId,
    court: courtId,
    estado: { $in: ACTIVE_RESERVATION_STATUSES },
    inicio: { $lt: new Date(fin) },
    fin: { $gt: new Date(inicio) }
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return Reservation.findOne(query);
};

const createReservation = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { courtId, customerId, guestName, guestPhone, guestEmail, inicio, fin, estado, precioFinal, notas } = req.body;

    if (!isValidInstantRange(inicio, fin)) {
      return res.status(400).json({ ok: false, message: 'El inicio debe ser anterior al fin' });
    }

    const customerValidation = await validateCustomerData({ customerId, guestName, guestPhone });
    if (!customerValidation.ok) {
      return res.status(customerValidation.status).json({ ok: false, message: customerValidation.message });
    }

    const court = await Court.findOne({ _id: courtId, club: clubId });
    if (!court) {
      return res.status(404).json({ ok: false, message: 'Cancha no encontrada para ese club' });
    }

    if (court.estado !== 'activa') {
      return res.status(400).json({ ok: false, message: 'No puedes reservar una cancha inactiva o en mantenimiento' });
    }

    const club = await Club.findById(clubId);

    // Nivel 1 de la degradación por impago: no se cargan turnos nuevos. Las
    // cancelaciones y ediciones siguen habilitadas — un turno que se cae tiene
    // que poder liberarse, y los ya reservados nunca se tocan.
    if (!puedeCrearReservas(club)) {
      return res.status(403).json({
        ok: false,
        code: 'SUSCRIPCION_IMPAGA',
        message:
          'Tu suscripción está impaga, así que no se pueden cargar turnos nuevos. Regularizá el pago para reactivar el complejo.'
      });
    }

    const scheduleCheck = validateReservationSlot(club, { inicio, fin, estado, isNew: true });
    if (!scheduleCheck.ok) {
      return res.status(400).json({ ok: false, message: scheduleCheck.message });
    }

    const overlapping = await findOverlappingReservation({ clubId, courtId, inicio, fin });
    if (overlapping) {
      return res.status(400).json({ ok: false, message: 'Ya existe una reserva para esa cancha en ese horario' });
    }

    let reservation;
    try {
      reservation = await Reservation.create({
        club: clubId,
        court: courtId,
        customer: customerId || null,
        guestName: customerId ? null : guestName,
        guestPhone: customerId ? null : guestPhone,
        guestEmail: customerId ? null : (guestEmail || null),
        inicio: new Date(inicio),
        fin: new Date(fin),
        estado,
        precioFinal,
        notas,
        creadaPor: req.user._id
      });
    } catch (error) {
      // El índice único atómico ganó la carrera: otra reserva tomó el slot.
      if (error.code === 11000) {
        return res.status(409).json({ ok: false, message: 'Ese horario acaba de ser reservado. Probá con otro.' });
      }
      throw error;
    }

    // Registra/actualiza el cliente del club (clave: email). Para un cliente
    // registrado, tomamos su email de la cuenta; para invitado, el guestEmail.
    // Best-effort: no bloquea la reserva.
    if (customerId) {
      const customer = await User.findById(customerId).select('email nombre');
      if (customer?.email) {
        await upsertClientFromReservation(reservation, {
          email: customer.email,
          name: customer.nombre,
          userId: customerId
        });
      }
    } else {
      await upsertClientFromReservation(reservation, { email: guestEmail, name: guestName, phone: guestPhone });
    }

    const populated = await populateReservation(Reservation.findById(reservation._id));

    // Confirmación al jugador. Una reserva cargada por teléfono puede no tener
    // email, y es un caso normal: en ese caso no se manda nada.
    const emailTo = populated.customer?.email || populated.guestEmail;
    if (emailTo) {
      const clubForEmail = await Club.findById(clubId).select(CLUB_EMAIL_FIELDS);
      await sendReservationConfirmation({
        reservation: populated,
        club: clubForEmail,
        court: populated.court,
        to: emailTo,
        nombre: populated.customer?.nombre || populated.guestName
      });
    }

    res.status(201).json({ ok: true, reservation: populated });
  } catch (error) {
    next(error);
  }
};

const getReservationsByClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { desde, hasta, courtId, estado } = req.query;

    const filter = { club: clubId };

    // Rango de instantes [desde, hasta) por solapamiento con la ventana visible.
    if (desde || hasta) {
      if (hasta) filter.inicio = { ...(filter.inicio || {}), $lt: new Date(hasta) };
      if (desde) filter.fin = { ...(filter.fin || {}), $gt: new Date(desde) };
    }

    if (courtId) filter.court = courtId;
    if (estado) filter.estado = estado;

    const reservations = await populateReservation(Reservation.find(filter))
      .select('-manageToken')
      .sort({ inicio: 1 });

    res.status(200).json({ ok: true, reservations });
  } catch (error) {
    next(error);
  }
};

// Próximos turnos del club a partir del instante actual: incluye los que están
// en curso o por comenzar (fin > ahora), ordenados por inicio y acotados a
// `limit` (por defecto 6) desde el servidor.
// Lo que queda del día de HOY (en la zona del club): los turnos de la fecha
// actual que todavía no terminaron. El techo en la medianoche local no es un
// detalle: con turnos fijos materializados a 90 días, una lista sin fecha de
// corte se llena con la misma repetición del mismo turno en días distintos y
// la tarjeta deja de responder lo único que le preguntan, que es qué falta
// atender hoy.
//
// Devuelve además `restantes` (cuántos quedan, más allá del `limit`) y `total`
// (cuántos hubo hoy en total), para que la tarjeta pueda decir "8 de 13".
const getUpcomingReservationsByClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Math.min(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 6, 50);

    const club = await Club.findById(clubId).select('timezone').lean();
    const ahora = new Date();
    const dia = localDayRange(ahora, club?.timezone);

    const delDia = {
      club: clubId,
      estado: { $in: ACTIVE_RESERVATION_STATUSES },
      inicio: { $gte: dia.inicio, $lt: dia.fin }
    };
    // En curso cuenta como pendiente de atender: el corte es por `fin`, no por
    // `inicio`.
    const restantesFilter = { ...delDia, fin: { $gt: ahora } };

    const [reservations, restantes, total] = await Promise.all([
      populateReservation(Reservation.find(restantesFilter))
        .select('-manageToken')
        .sort({ inicio: 1 })
        .limit(limit),
      Reservation.countDocuments(restantesFilter),
      Reservation.countDocuments(delDia)
    ]);

    res.status(200).json({ ok: true, reservations, restantes, total, fecha: dia.dateKey });
  } catch (error) {
    next(error);
  }
};

const getReservationById = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;

    const reservation = await populateReservation(Reservation.findOne({ _id: id, club: clubId }));

    if (!reservation) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    res.status(200).json({ ok: true, reservation });
  } catch (error) {
    next(error);
  }
};

const updateReservation = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;
    const { courtId, customerId, guestName, guestPhone, inicio, fin, estado, precioFinal, notas } = req.body;

    const existing = await Reservation.findOne({ _id: id, club: clubId });
    if (!existing) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    const nextCourtId = courtId || existing.court.toString();
    const nextInicio = inicio ? new Date(inicio) : existing.inicio;
    const nextFin = fin ? new Date(fin) : existing.fin;
    const nextCustomerId = customerId !== undefined ? customerId : existing.customer;
    const nextGuestName = guestName !== undefined ? guestName : existing.guestName;
    const nextGuestPhone = guestPhone !== undefined ? guestPhone : existing.guestPhone;

    if (!isValidInstantRange(nextInicio, nextFin)) {
      return res.status(400).json({ ok: false, message: 'El inicio debe ser anterior al fin' });
    }

    const customerValidation = await validateCustomerData({
      customerId: nextCustomerId,
      guestName: nextGuestName,
      guestPhone: nextGuestPhone
    });
    if (!customerValidation.ok) {
      return res.status(customerValidation.status).json({ ok: false, message: customerValidation.message });
    }

    const court = await Court.findOne({ _id: nextCourtId, club: clubId });
    if (!court) {
      return res.status(404).json({ ok: false, message: 'Cancha no encontrada para ese club' });
    }

    if (court.estado !== 'activa') {
      return res.status(400).json({ ok: false, message: 'No puedes reservar una cancha inactiva o en mantenimiento' });
    }

    const club = await Club.findById(clubId);

    // ¿Se cambió el turno de lugar/horario?
    const slotChanged =
      (courtId && courtId !== existing.court.toString()) ||
      (inicio && new Date(inicio).getTime() !== existing.inicio.getTime()) ||
      (fin && new Date(fin).getTime() !== existing.fin.getTime());

    // No se puede mover/reprogramar un turno que está transcurriendo ahora.
    if (slotChanged && isReservationInProgress({ inicio: existing.inicio, fin: existing.fin })) {
      return res.status(400).json({ ok: false, message: 'No se puede mover un turno que está en curso.' });
    }

    const nextEstado = estado !== undefined ? estado : existing.estado;
    const scheduleCheck = validateReservationSlot(club, {
      inicio: nextInicio,
      fin: nextFin,
      estado: nextEstado,
      isNew: false,
      validateSchedule: slotChanged
    });
    if (!scheduleCheck.ok) {
      return res.status(400).json({ ok: false, message: scheduleCheck.message });
    }

    const overlapping = await findOverlappingReservation({
      clubId,
      courtId: nextCourtId,
      inicio: nextInicio,
      fin: nextFin,
      excludeId: id
    });
    if (overlapping) {
      return res.status(400).json({ ok: false, message: 'Ya existe una reserva para esa cancha en ese horario' });
    }

    const updateData = {
      court: nextCourtId,
      customer: nextCustomerId || null,
      guestName: nextCustomerId ? null : nextGuestName,
      guestPhone: nextCustomerId ? null : nextGuestPhone,
      inicio: nextInicio,
      fin: nextFin
    };

    if (estado !== undefined) updateData.estado = estado;
    if (precioFinal !== undefined) updateData.precioFinal = precioFinal;
    if (notas !== undefined) updateData.notas = notas;

    let reservation;
    try {
      reservation = await populateReservation(
        Reservation.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      );
    } catch (error) {
      // Mover el turno chocó con el slot exacto de otra reserva activa.
      if (error.code === 11000) {
        return res.status(409).json({ ok: false, message: 'Ese horario acaba de ser reservado. Probá con otro.' });
      }
      throw error;
    }

    res.status(200).json({ ok: true, reservation });
  } catch (error) {
    next(error);
  }
};

// A quién le escribimos cuando pasa algo con el turno.
//
// Tolera que `customer` venga poblado o como id suelto: por acá pasan reservas
// traídas con populates distintos (panel, cuenta del jugador, token público) y
// resolverlo en cada llamador es la forma de olvidarse en una.
const destinatarioDelTurno = async (reservation) => {
  const customer = reservation.customer;

  if (customer?.email) {
    return { email: customer.email, nombre: customer.nombre };
  }

  if (customer) {
    const user = await User.findById(customer._id || customer).select('email nombre');
    if (user?.email) {
      return { email: user.email, nombre: user.nombre };
    }
  }

  // Invitado sin cuenta. Puede no tener email (turno cargado por teléfono en el
  // backoffice) y es un caso normal: ahí no se manda nada.
  return { email: reservation.guestEmail, nombre: reservation.guestName };
};

const cancelReservation = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;

    const reservation = await populateReservation(
      Reservation.findOneAndUpdate(
        { _id: id, club: clubId },
        { estado: 'cancelada' },
        { new: true, runValidators: true }
      )
    );

    if (!reservation) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    // Al jugador lo canceló el complejo: no se enteró por sí mismo, así que
    // esta notificación es la única que le avisa dentro de la plataforma.
    await notifyUser(reservation.customer?._id, {
      tipo: 'cancelacion',
      titulo: 'El complejo canceló tu turno',
      mensaje: `${reservation.club?.nombre} canceló ${reservation.court?.nombre} · ${formatInstant(reservation.inicio, reservation.club?.timezone)}`,
      club: reservation.club?._id,
      reservation: reservation._id
    });

    // Y el email, que es lo único que llega a un invitado sin cuenta. Sin esto
    // el jugador se presenta a jugar a un turno que ya no existe.
    const { email, nombre } = await destinatarioDelTurno(reservation);
    if (email) {
      const clubForEmail = await Club.findById(clubId).select(CLUB_EMAIL_FIELDS);
      await sendReservationCancellation({
        reservation,
        club: clubForEmail,
        court: reservation.court,
        to: email,
        nombre,
        porElComplejo: true
      });
    }

    res.status(200).json({ ok: true, reservation });
  } catch (error) {
    next(error);
  }
};

// --- Gestión pública por token (invitado sin cuenta) ---
// El token es la prueba de propiedad: sin él no se puede ver ni cancelar la
// reserva. No requiere autenticación. La respuesta es un DTO acotado para no
// filtrar datos internos (creadaPor, manageToken, etc.).

const TOKEN_POPULATE = [
  ['club', 'nombre direccion ciudad timezone moneda horarios'],
  ['court', 'nombre tipo']
];

const findReservationByToken = (token) => {
  let query = Reservation.findOne({ manageToken: token });
  TOKEN_POPULATE.forEach(([path, fields]) => {
    query = query.populate(path, fields);
  });
  return query;
};

const toPublicReservation = (r) => ({
  _id: r._id,
  inicio: r.inicio,
  fin: r.fin,
  estado: r.estado,
  precioFinal: r.precioFinal,
  guestName: r.guestName,
  guestPhone: r.guestPhone,
  notas: r.notas,
  pago: {
    estado: r.pago?.estado || 'no_requerido',
    tipo: r.pago?.tipo || null,
    montoPagado: r.pago?.montoPagado || 0,
    saldoPendiente: r.pago?.saldoPendiente || 0
  },
  // Cuánto le queda para pagar antes de que se libere el horario.
  expiraEn: r.expiraEn || null,
  club: r.club
    ? {
        nombre: r.club.nombre,
        direccion: r.club.direccion,
        ciudad: r.club.ciudad,
        timezone: r.club.timezone,
        moneda: r.club.moneda
      }
    : null,
  court: r.court ? { nombre: r.court.nombre, tipo: r.court.tipo } : null
});

const getReservationByToken = async (req, res, next) => {
  try {
    const reservation = await findReservationByToken(req.params.token);

    if (!reservation) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    res.status(200).json({ ok: true, reservation: toPublicReservation(reservation) });
  } catch (error) {
    next(error);
  }
};

// Cancelación pedida por el jugador (por token o desde su cuenta).
//
// Vive acá y no en cada controlador porque son el mismo hecho visto desde dos
// puertas de entrada: cambian la prueba de propiedad (token vs. sesión), no lo
// que pasa cuando la cancelación se concreta.
//
// Espera la reserva con `club` (incluido `horarios`) y `court` ya poblados, y
// deja el doc en memoria con el estado nuevo para que quien llame pueda
// serializarlo sin volver a la base.
const applyCustomerCancellation = async (reservation) => {
  if (reservation.estado === 'cancelada') {
    return { ok: true }; // Idempotente: ya estaba cancelada.
  }

  if (reservation.estado === 'completada') {
    return { ok: false, status: 400, message: 'No se puede cancelar un turno ya completado.' };
  }

  const tolerancia = reservation.club?.horarios?.reservas?.toleranciaCancelacionHoras ?? 0;
  const check = canCancelReservation({ inicio: reservation.inicio }, tolerancia);
  if (!check.ok) {
    return { ok: false, status: 400, message: check.message };
  }

  await Reservation.findByIdAndUpdate(reservation._id, { estado: 'cancelada' });
  reservation.estado = 'cancelada';

  const clubId = reservation.club?._id || reservation.club;
  const quien = reservation.guestName || reservation.customer?.nombre || 'Un cliente';

  await notify(clubId, {
    tipo: 'cancelacion',
    titulo: 'Reserva cancelada',
    mensaje: `${quien} canceló ${reservation.court?.nombre || 'su turno'}`,
    reservation: reservation._id
  });

  // Aviso por email al complejo: canceló el jugador, no ellos.
  //
  // El club se busca aparte en vez de ampliar el populate: ese populate alimenta
  // una respuesta pública y no corresponde traer ahí el email del complejo ni
  // sus preferencias de notificación.
  const clubParaEmail = await Club.findById(clubId).select(CLUB_EMAIL_FIELDS);
  await sendClubReservationNotice({
    tipo: 'cancelacion',
    reservation,
    club: clubParaEmail,
    court: reservation.court
  });

  // Comprobante al jugador de lo que acaba de hacer. Además da de baja el turno
  // en su calendario, que quedó agregado desde el email de confirmación.
  const { email, nombre } = await destinatarioDelTurno(reservation);
  if (email) {
    await sendReservationCancellation({
      reservation,
      club: clubParaEmail,
      court: reservation.court,
      to: email,
      nombre,
      porElComplejo: false
    });
  }

  return { ok: true };
};

const cancelReservationByToken = async (req, res, next) => {
  try {
    const reservation = await findReservationByToken(req.params.token);

    if (!reservation) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    const result = await applyCustomerCancellation(reservation);
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, message: result.message });
    }

    res.status(200).json({ ok: true, reservation: toPublicReservation(reservation) });
  } catch (error) {
    next(error);
  }
};

// --- Reservas del jugador logueado ---

// Más ancho que `POPULATE`: la cuenta del jugador muestra dónde queda el
// complejo y cómo contactarlo, y necesita `horarios` para saber hasta cuándo
// puede cancelar. El panel del complejo no precisa nada de eso.
const MY_POPULATE = [
  ['club', 'nombre slug direccion ciudad telefono whatsapp timezone moneda horarios'],
  ['court', 'nombre tipo'],
  ['customer', 'nombre email telefono']
];

const populateMyReservation = (query) => {
  MY_POPULATE.forEach(([path, fields]) => query.populate(path, fields));
  return query;
};

const getMyReservations = async (req, res, next) => {
  try {
    const reservations = await populateMyReservation(
      Reservation.find({ customer: req.user._id })
    ).sort({ inicio: -1 });

    res.status(200).json({ ok: true, reservations });
  } catch (error) {
    next(error);
  }
};

// PATCH /reservations/my/:id/cancel
//
// El filtro por `customer` es la autorización: si la reserva no es de quien
// pide, no aparece y responde 404 en vez de 403. No hay por qué confirmarle a
// nadie que el id de la reserva de otro existe.
const cancelMyReservation = async (req, res, next) => {
  try {
    const reservation = await populateMyReservation(
      Reservation.findOne({ _id: req.params.id, customer: req.user._id })
    );

    if (!reservation) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    const result = await applyCustomerCancellation(reservation);
    if (!result.ok) {
      return res.status(result.status).json({ ok: false, message: result.message });
    }

    res.status(200).json({ ok: true, reservation });
  } catch (error) {
    next(error);
  }
};

// POST /reservations/club/:clubId/:id/refund
//
// Devolución del pago de una reserva. Es manual y a criterio del complejo: no
// se dispara sola al cancelar porque la política de devolución de señas varía
// entre complejos, y devolver de más no se puede deshacer.
const refundReservationPayment = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;

    const reservation = await Reservation.findOne({ _id: id, club: clubId });
    if (!reservation) {
      return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });
    }

    if (reservation.pago?.estado !== 'pagado') {
      return res.status(400).json({ ok: false, message: 'Esta reserva no tiene un pago para devolver.' });
    }

    const payment = await Payment.findOne({
      reservation: reservation._id,
      estado: 'aprobado'
    }).sort({ createdAt: -1 });

    if (!payment?.paymentId) {
      return res.status(400).json({
        ok: false,
        message: 'No encontramos el pago en MercadoPago. Revisá la devolución desde tu cuenta.'
      });
    }

    const token = await getClubAccessToken(clubId);
    if (!token) {
      return res.status(400).json({
        ok: false,
        message: 'La cuenta de MercadoPago no está conectada. Volvé a vincularla para devolver pagos.'
      });
    }

    try {
      await refundPayment(token, payment.paymentId, undefined, String(payment._id));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('MercadoPago rechazó la devolución:', err.message);
      return res.status(502).json({
        ok: false,
        message: 'MercadoPago rechazó la devolución. Puede que el pago sea muy antiguo o ya esté devuelto.'
      });
    }

    // El estado local se actualiza recién cuando MercadoPago aceptó: marcarlo
    // antes dejaría al complejo creyendo que devolvió plata que nunca salió.
    await registrarReembolso({ payment, reservation });

    const [club, court] = await Promise.all([
      Club.findById(clubId).select(CLUB_EMAIL_FIELDS),
      Court.findById(reservation.court).select('nombre tipo')
    ]);

    await notify(clubId, {
      tipo: 'pago',
      titulo: 'Pago devuelto',
      mensaje: `Se devolvieron $${payment.monto.toLocaleString('es-AR')} a ${reservation.guestName || 'un cliente'}`,
      reservation: reservation._id
    });

    await notifyUser(reservation.customer, {
      tipo: 'pago',
      titulo: 'Te devolvieron el pago',
      mensaje: `${club?.nombre} devolvió $${payment.monto.toLocaleString('es-AR')}. Puede tardar unos días en verse en tu resumen.`,
      club: clubId,
      reservation: reservation._id
    });

    await sendRefundNotice({ reservation, club, court, payment });

    const updated = await populateReservation(Reservation.findById(reservation._id));

    res.status(200).json({ ok: true, message: 'Devolución realizada', reservation: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReservation,
  getReservationsByClub,
  getUpcomingReservationsByClub,
  getReservationById,
  updateReservation,
  cancelReservation,
  getReservationByToken,
  cancelReservationByToken,
  getMyReservations,
  cancelMyReservation,
  refundReservationPayment
};
