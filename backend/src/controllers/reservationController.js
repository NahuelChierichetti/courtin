const Reservation = require('../models/Reservation');
const Court = require('../models/Court');
const User = require('../models/User');

const ACTIVE_RESERVATION_STATUSES = ['pendiente', 'confirmada'];

const normalizeDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isValidTimeRange = (horaInicio, horaFin) => {
  return horaInicio < horaFin;
};

const validateCustomerData = async ({ customerId, guestName, guestPhone }) => {
  if (!customerId && !guestName) {
    return {
      ok: false,
      status: 400,
      message: 'Debes indicar un cliente registrado o el nombre del invitado'
    };
  }

  if (!customerId && !guestPhone) {
    return {
      ok: false,
      status: 400,
      message: 'Debes indicar el teléfono del invitado si no hay usuario registrado'
    };
  }

  if (customerId) {
    const customer = await User.findById(customerId);

    if (!customer) {
      return {
        ok: false,
        status: 404,
        message: 'Usuario cliente no encontrado'
      };
    }

    if (customer.estado !== 'activo') {
      return {
        ok: false,
        status: 403,
        message: 'El usuario cliente está inactivo'
      };
    }
  }

  return { ok: true };
};

const findOverlappingReservation = async ({
  clubId,
  courtId,
  fecha,
  horaInicio,
  horaFin,
  excludeId
}) => {
  const query = {
    club: clubId,
    court: courtId,
    fecha,
    estado: { $in: ACTIVE_RESERVATION_STATUSES },
    horaInicio: { $lt: horaFin },
    horaFin: { $gt: horaInicio }
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return Reservation.findOne(query);
};

const createReservation = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const {
      courtId,
      customerId,
      guestName,
      guestPhone,
      fecha,
      horaInicio,
      horaFin,
      estado,
      precioFinal,
      notas
    } = req.body;

    const normalizedDate = normalizeDate(fecha);

    if (!isValidTimeRange(horaInicio, horaFin)) {
      return res.status(400).json({
        ok: false,
        message: 'La hora de inicio debe ser menor a la hora de fin'
      });
    }

    const customerValidation = await validateCustomerData({
      customerId,
      guestName,
      guestPhone
    });

    if (!customerValidation.ok) {
      return res.status(customerValidation.status).json({
        ok: false,
        message: customerValidation.message
      });
    }

    const court = await Court.findOne({ _id: courtId, club: clubId });

    if (!court) {
      return res.status(404).json({
        ok: false,
        message: 'Cancha no encontrada para ese club'
      });
    }

    if (court.estado !== 'activa') {
      return res.status(400).json({
        ok: false,
        message: 'No puedes reservar una cancha inactiva o en mantenimiento'
      });
    }

    const overlappingReservation = await findOverlappingReservation({
      clubId,
      courtId,
      fecha: normalizedDate,
      horaInicio,
      horaFin
    });

    if (overlappingReservation) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe una reserva para esa cancha en ese horario'
      });
    }

    const reservation = await Reservation.create({
      club: clubId,
      court: courtId,
      customer: customerId || null,
      guestName: customerId ? null : guestName,
      guestPhone: customerId ? null : guestPhone,
      fecha: normalizedDate,
      horaInicio,
      horaFin,
      estado,
      precioFinal,
      notas,
      creadaPor: req.user._id
    });

    const populatedReservation = await Reservation.findById(reservation._id)
      .populate('club', 'nombre slug estado')
      .populate('court', 'nombre tipo estado precio duracionTurno')
      .populate('customer', 'nombre email estado')
      .populate('creadaPor', 'nombre email');

    res.status(201).json({
      ok: true,
      reservation: populatedReservation
    });
  } catch (error) {
    next(error);
  }
};

const getReservationsByClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { fecha, courtId, estado } = req.query;

    const filter = { club: clubId };

    if (fecha) {
      filter.fecha = normalizeDate(fecha);
    }

    if (courtId) {
      filter.court = courtId;
    }

    if (estado) {
      filter.estado = estado;
    }

    const reservations = await Reservation.find(filter)
      .populate('club', 'nombre slug estado')
      .populate('court', 'nombre tipo estado precio duracionTurno')
      .populate('customer', 'nombre email estado')
      .populate('creadaPor', 'nombre email')
      .sort({ fecha: 1, horaInicio: 1 });

    res.status(200).json({
      ok: true,
      reservations
    });
  } catch (error) {
    next(error);
  }
};

const getReservationById = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;

    const reservation = await Reservation.findOne({
      _id: id,
      club: clubId
    })
      .populate('club', 'nombre slug estado')
      .populate('court', 'nombre tipo estado precio duracionTurno')
      .populate('customer', 'nombre email estado')
      .populate('creadaPor', 'nombre email');

    if (!reservation) {
      return res.status(404).json({
        ok: false,
        message: 'Reserva no encontrada'
      });
    }

    res.status(200).json({
      ok: true,
      reservation
    });
  } catch (error) {
    next(error);
  }
};

const updateReservation = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;
    const {
      courtId,
      customerId,
      guestName,
      guestPhone,
      fecha,
      horaInicio,
      horaFin,
      estado,
      precioFinal,
      notas
    } = req.body;

    const existingReservation = await Reservation.findOne({
      _id: id,
      club: clubId
    });

    if (!existingReservation) {
      return res.status(404).json({
        ok: false,
        message: 'Reserva no encontrada'
      });
    }

    const nextCourtId = courtId || existingReservation.court.toString();
    const nextFecha = fecha ? normalizeDate(fecha) : existingReservation.fecha;
    const nextHoraInicio = horaInicio || existingReservation.horaInicio;
    const nextHoraFin = horaFin || existingReservation.horaFin;
    const nextCustomerId =
      customerId !== undefined ? customerId : existingReservation.customer;
    const nextGuestName =
      guestName !== undefined ? guestName : existingReservation.guestName;
    const nextGuestPhone =
      guestPhone !== undefined ? guestPhone : existingReservation.guestPhone;

    if (!isValidTimeRange(nextHoraInicio, nextHoraFin)) {
      return res.status(400).json({
        ok: false,
        message: 'La hora de inicio debe ser menor a la hora de fin'
      });
    }

    const customerValidation = await validateCustomerData({
      customerId: nextCustomerId,
      guestName: nextGuestName,
      guestPhone: nextGuestPhone
    });

    if (!customerValidation.ok) {
      return res.status(customerValidation.status).json({
        ok: false,
        message: customerValidation.message
      });
    }

    const court = await Court.findOne({ _id: nextCourtId, club: clubId });

    if (!court) {
      return res.status(404).json({
        ok: false,
        message: 'Cancha no encontrada para ese club'
      });
    }

    if (court.estado !== 'activa') {
      return res.status(400).json({
        ok: false,
        message: 'No puedes reservar una cancha inactiva o en mantenimiento'
      });
    }

    const overlappingReservation = await findOverlappingReservation({
      clubId,
      courtId: nextCourtId,
      fecha: nextFecha,
      horaInicio: nextHoraInicio,
      horaFin: nextHoraFin,
      excludeId: id
    });

    if (overlappingReservation) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe una reserva para esa cancha en ese horario'
      });
    }

    const updateData = {
      court: nextCourtId,
      customer: nextCustomerId || null,
      guestName: nextCustomerId ? null : nextGuestName,
      guestPhone: nextCustomerId ? null : nextGuestPhone,
      fecha: nextFecha,
      horaInicio: nextHoraInicio,
      horaFin: nextHoraFin
    };

    if (estado !== undefined) {
      updateData.estado = estado;
    }

    if (precioFinal !== undefined) {
      updateData.precioFinal = precioFinal;
    }

    if (notas !== undefined) {
      updateData.notas = notas;
    }

    const reservation = await Reservation.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    })
      .populate('club', 'nombre slug estado')
      .populate('court', 'nombre tipo estado precio duracionTurno')
      .populate('customer', 'nombre email estado')
      .populate('creadaPor', 'nombre email');

    res.status(200).json({
      ok: true,
      reservation
    });
  } catch (error) {
    next(error);
  }
};

const cancelReservation = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;

    const reservation = await Reservation.findOneAndUpdate(
      {
        _id: id,
        club: clubId
      },
      {
        estado: 'cancelada'
      },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('club', 'nombre slug estado')
      .populate('court', 'nombre tipo estado precio duracionTurno')
      .populate('customer', 'nombre email estado')
      .populate('creadaPor', 'nombre email');

    if (!reservation) {
      return res.status(404).json({
        ok: false,
        message: 'Reserva no encontrada'
      });
    }

    res.status(200).json({
      ok: true,
      reservation
    });
  } catch (error) {
    next(error);
  }
};

const getMyReservations = async (req, res, next) => {
  try {
    const reservations = await Reservation.find({
      customer: req.user._id
    })
      .populate('club', 'nombre slug estado')
      .populate('court', 'nombre tipo estado precio duracionTurno')
      .populate('creadaPor', 'nombre email')
      .sort({ fecha: -1, horaInicio: -1 });

    res.status(200).json({
      ok: true,
      reservations
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReservation,
  getReservationsByClub,
  getReservationById,
  updateReservation,
  cancelReservation,
  getMyReservations
};