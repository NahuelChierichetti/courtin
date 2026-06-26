const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const Club = require('../models/Club');
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');
const { validateReservationSlot } = require('../utils/reservationRules');
const { computeSlots } = require('../utils/availability');
const { priceForDuration } = require('../utils/pricing');
const { horariosToLocal, DEFAULT_TZ } = require('../utils/timezone');

const ACTIVE_RESERVATION_STATUSES = ['pendiente', 'confirmada'];

// Campos del club seguros de exponer públicamente (sin plan/estado/horarios crudos).
const PUBLIC_CLUB_FIELDS =
  'nombre slug descripcion direccion ciudad provincia telefono whatsapp email logo fotos ubicacion servicios timezone moneda';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toPublicCourt = (c) => ({
  _id: c._id,
  nombre: c.nombre,
  tipo: c.tipo,
  superficie: c.superficie,
  cubierta: c.cubierta,
  jugadores: c.jugadores,
  duracionTurno: c.duracionTurno,
  descripcion: c.descripcion,
  precio: c.precio,
  tarifas: c.tarifas
});

// GET /public/clubs?ciudad=&tipo=&q=
// Lista clubes publicados; opcionalmente filtra por ciudad, deporte (tipo de
// cancha) y texto libre.
const getPublicClubs = async (req, res, next) => {
  try {
    const { ciudad, tipo, q } = req.query;
    const filter = { publicado: true };

    if (ciudad) filter.ciudad = new RegExp(escapeRegex(ciudad), 'i');

    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ nombre: rx }, { ciudad: rx }, { direccion: rx }];
    }

    // Filtro por deporte: sólo clubes con alguna cancha pública de ese tipo.
    if (tipo) {
      const clubIds = await Court.find({ tipo, visible: { $ne: false }, estado: 'activa' }).distinct('club');
      filter._id = { $in: clubIds };
    }

    const clubs = await Club.find(filter).select(PUBLIC_CLUB_FIELDS).sort({ nombre: 1 });

    // Deportes y precio "desde" por club (para los chips y el precio de la card).
    const ids = clubs.map((c) => c._id);
    const courts = await Court.find({ club: { $in: ids }, visible: { $ne: false }, estado: 'activa' }).select('club tipo precio tarifas');
    const deportesByClub = {};
    const precioByClub = {};
    for (const c of courts) {
      const k = c.club.toString();
      deportesByClub[k] = deportesByClub[k] || new Set();
      deportesByClub[k].add(c.tipo);

      // Precio mínimo de la cancha: la menor tarifa, o el precio base.
      const tarifaMin = (c.tarifas || []).reduce(
        (min, t) => (typeof t.precio === 'number' ? Math.min(min, t.precio) : min),
        Infinity
      );
      const courtMin = Number.isFinite(tarifaMin) ? tarifaMin : (c.precio || Infinity);
      if (Number.isFinite(courtMin)) {
        precioByClub[k] = Math.min(precioByClub[k] ?? Infinity, courtMin);
      }
    }

    const result = clubs.map((c) => {
      const k = c._id.toString();
      return {
        ...c.toObject(),
        deportes: Array.from(deportesByClub[k] || []),
        precioDesde: Number.isFinite(precioByClub[k]) ? precioByClub[k] : null
      };
    });

    res.status(200).json({ ok: true, clubs: result });
  } catch (error) {
    next(error);
  }
};

// GET /public/clubs/:slug
// Detalle del club + sus canchas públicas + horarios (en hora local del club).
const getPublicClubBySlug = async (req, res, next) => {
  try {
    const club = await Club.findOne({ slug: req.params.slug, publicado: true });
    if (!club) {
      return res.status(404).json({ ok: false, message: 'Club no encontrado' });
    }

    const courts = await Court.find({ club: club._id, visible: { $ne: false }, estado: 'activa' }).sort({ nombre: 1 });

    const tz = club.timezone || DEFAULT_TZ;
    const horarios = club.horarios ? horariosToLocal(club.horarios.toObject(), tz) : null;

    const publicClub = {};
    PUBLIC_CLUB_FIELDS.split(' ').forEach((f) => {
      publicClub[f] = club[f];
    });
    publicClub._id = club._id;

    res.status(200).json({
      ok: true,
      club: { ...publicClub, horarios },
      courts: courts.map(toPublicCourt)
    });
  } catch (error) {
    next(error);
  }
};

// Busca y valida que la cancha sea pública y pertenezca al club publicado.
const findPublicClubAndCourt = async (slug, courtId) => {
  const club = await Club.findOne({ slug, publicado: true });
  if (!club) return { error: { status: 404, message: 'Club no encontrado' } };

  const court = await Court.findOne({ _id: courtId, club: club._id });
  if (!court) return { error: { status: 404, message: 'Cancha no encontrada' } };

  if (court.visible === false || court.estado !== 'activa') {
    return { error: { status: 400, message: 'La cancha no está disponible para reservas online' } };
  }

  return { club, court };
};

// GET /public/clubs/:slug/courts/:courtId/availability?fecha=YYYY-MM-DD&duracion=90
const getCourtAvailability = async (req, res, next) => {
  try {
    const { slug, courtId } = req.params;
    const { fecha } = req.query;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ ok: false, message: 'Indicá una fecha válida (YYYY-MM-DD)' });
    }

    const { club, court, error } = await findPublicClubAndCourt(slug, courtId);
    if (error) return res.status(error.status).json({ ok: false, message: error.message });

    // Duración elegida (minutos); por defecto la de la cancha. Acotada a un rango sano.
    const parsedDur = parseInt(req.query.duracion, 10);
    const duracion = Number.isFinite(parsedDur)
      ? Math.min(Math.max(parsedDur, 30), 240)
      : court.duracionTurno;

    const tz = club.timezone || DEFAULT_TZ;
    // Ventana del día en instantes UTC para traer las reservas que lo solapan.
    const desde = dayjs.tz(`${fecha} 00:00`, 'YYYY-MM-DD HH:mm', tz).utc().toDate();
    const hasta = dayjs.tz(`${fecha} 00:00`, 'YYYY-MM-DD HH:mm', tz).add(1, 'day').utc().toDate();

    const reservations = await Reservation.find({
      court: court._id,
      estado: { $in: ACTIVE_RESERVATION_STATUSES },
      inicio: { $lt: hasta },
      fin: { $gt: desde }
    }).select('inicio fin');

    const { abierto, nombre, slots } = computeSlots(club, court, fecha, reservations, duracion);

    res.status(200).json({ ok: true, fecha, abierto, nombre, duracion, duracionTurno: court.duracionTurno, slots });
  } catch (error) {
    next(error);
  }
};

// GET /public/cities
// Ciudades (distinct) con al menos un club publicado, para el filtro del buscador.
const getPublicCities = async (req, res, next) => {
  try {
    const cities = await Club.find({ publicado: true, ciudad: { $nin: [null, ''] } }).distinct('ciudad');
    cities.sort((a, b) => a.localeCompare(b, 'es'));
    res.status(200).json({ ok: true, cities });
  } catch (error) {
    next(error);
  }
};

// POST /public/clubs/:slug/reservations
// Reserva como invitado (sin cuenta). Devuelve el manageToken para que el
// frontend arme el link de gestión.
const createPublicReservation = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { courtId, inicio, fin, guestName, guestPhone, guestEmail, notas } = req.body;

    if (!guestName || !guestPhone) {
      return res.status(400).json({ ok: false, message: 'Indicá tu nombre y teléfono para reservar' });
    }

    const a = new Date(inicio).getTime();
    const b = new Date(fin).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) {
      return res.status(400).json({ ok: false, message: 'El inicio debe ser anterior al fin' });
    }

    const { club, court, error } = await findPublicClubAndCourt(slug, courtId);
    if (error) return res.status(error.status).json({ ok: false, message: error.message });

    // Reglas del club (horario, anticipación, fecha pasada).
    const scheduleCheck = validateReservationSlot(club, { inicio, fin, estado: 'pendiente', isNew: true });
    if (!scheduleCheck.ok) {
      return res.status(400).json({ ok: false, message: scheduleCheck.message });
    }

    // Solapamiento parcial (el índice único es el backstop atómico).
    const overlapping = await Reservation.findOne({
      court: court._id,
      estado: { $in: ACTIVE_RESERVATION_STATUSES },
      inicio: { $lt: new Date(fin) },
      fin: { $gt: new Date(inicio) }
    });
    if (overlapping) {
      return res.status(409).json({ ok: false, message: 'Ese horario ya está reservado. Probá con otro.' });
    }

    // Precio fijado en el servidor (no se confía en el cliente): precio por hora
    // de la franja de inicio, prorrateado por la duración del turno.
    const tz = club.timezone || DEFAULT_TZ;
    const startLocal = dayjs(inicio).tz(tz);
    const durationMin = (new Date(fin).getTime() - new Date(inicio).getTime()) / 60000;
    const precioFinal = priceForDuration(court, startLocal.day(), startLocal.format('HH:mm'), durationMin);

    let reservation;
    try {
      reservation = await Reservation.create({
        club: club._id,
        court: court._id,
        guestName,
        guestPhone,
        guestEmail: guestEmail || null,
        inicio: new Date(inicio),
        fin: new Date(fin),
        estado: 'pendiente',
        precioFinal,
        notas,
        origen: 'publica',
        creadaPor: null
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ ok: false, message: 'Ese horario acaba de ser reservado. Probá con otro.' });
      }
      throw err;
    }

    res.status(201).json({
      ok: true,
      // El token es la prueba de propiedad para gestionar la reserva sin cuenta.
      manageToken: reservation.manageToken,
      reservation: {
        _id: reservation._id,
        inicio: reservation.inicio,
        fin: reservation.fin,
        estado: reservation.estado,
        precioFinal: reservation.precioFinal,
        guestName: reservation.guestName,
        court: { nombre: court.nombre, tipo: court.tipo },
        club: { nombre: club.nombre, slug: club.slug, timezone: club.timezone, moneda: club.moneda }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicClubs,
  getPublicClubBySlug,
  getCourtAvailability,
  createPublicReservation,
  getPublicCities
};
