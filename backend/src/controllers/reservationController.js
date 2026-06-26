const Reservation = require('../models/Reservation');
const Court = require('../models/Court');
const User = require('../models/User');
const Club = require('../models/Club');
const { validateReservationSlot, isReservationInProgress } = require('../utils/reservationRules');

const ACTIVE_RESERVATION_STATUSES = ['pendiente', 'confirmada'];

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
    const { courtId, customerId, guestName, guestPhone, inicio, fin, estado, precioFinal, notas } = req.body;

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
    const scheduleCheck = validateReservationSlot(club, { inicio, fin, estado, isNew: true });
    if (!scheduleCheck.ok) {
      return res.status(400).json({ ok: false, message: scheduleCheck.message });
    }

    const overlapping = await findOverlappingReservation({ clubId, courtId, inicio, fin });
    if (overlapping) {
      return res.status(400).json({ ok: false, message: 'Ya existe una reserva para esa cancha en ese horario' });
    }

    const reservation = await Reservation.create({
      club: clubId,
      court: courtId,
      customer: customerId || null,
      guestName: customerId ? null : guestName,
      guestPhone: customerId ? null : guestPhone,
      inicio: new Date(inicio),
      fin: new Date(fin),
      estado,
      precioFinal,
      notas,
      creadaPor: req.user._id
    });

    const populated = await populateReservation(Reservation.findById(reservation._id));

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

    const reservations = await populateReservation(Reservation.find(filter)).sort({ inicio: 1 });

    res.status(200).json({ ok: true, reservations });
  } catch (error) {
    next(error);
  }
};

// Próximos turnos del club a partir del instante actual: incluye los que están
// en curso o por comenzar (fin > ahora), ordenados por inicio y acotados a
// `limit` (por defecto 6) desde el servidor.
const getUpcomingReservationsByClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Math.min(Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 6, 50);

    const filter = {
      club: clubId,
      estado: { $in: ACTIVE_RESERVATION_STATUSES },
      fin: { $gt: new Date() }
    };

    const reservations = await populateReservation(Reservation.find(filter))
      .sort({ inicio: 1 })
      .limit(limit);

    res.status(200).json({ ok: true, reservations });
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

    const reservation = await populateReservation(
      Reservation.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
    );

    res.status(200).json({ ok: true, reservation });
  } catch (error) {
    next(error);
  }
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

    res.status(200).json({ ok: true, reservation });
  } catch (error) {
    next(error);
  }
};

const getMyReservations = async (req, res, next) => {
  try {
    const reservations = await populateReservation(
      Reservation.find({ customer: req.user._id })
    ).sort({ inicio: -1 });

    res.status(200).json({ ok: true, reservations });
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
  getMyReservations
};
