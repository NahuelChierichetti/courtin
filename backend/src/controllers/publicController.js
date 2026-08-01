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
const { validateReservationSlot, dayConfigForDate } = require('../utils/reservationRules');
const { computeSlots } = require('../utils/availability');
const { priceForDuration } = require('../utils/pricing');
const { horariosToLocal, DEFAULT_TZ } = require('../utils/timezone');
const Payment = require('../models/Payment');
const { upsertClientFromReservation } = require('../utils/clients');
const { notify } = require('../utils/notifications');
const { sendReservationConfirmation, sendClubReservationNotice } = require('../utils/reservationEmails');
const { filtroClubVisible, puedeCrearReservas } = require('../utils/subscriptions');
const { montoACobrar, holdExpiresAt, cobraOnline, confirmarPagoDeReserva } = require('../utils/payments');
const { getClubAccessToken, createPreference, searchPayments } = require('../utils/mercadopago');

const ACTIVE_RESERVATION_STATUSES = ['pendiente', 'confirmada'];

// Campos del club seguros de exponer públicamente (sin plan/estado/horarios crudos).
const PUBLIC_CLUB_FIELDS =
  'nombre slug descripcion direccion ciudad provincia telefono whatsapp email logo fotos ubicacion servicios timezone moneda';

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Config de cobro que el jugador necesita saber antes de reservar: si puede
// pagar online, cuánto se le va a cobrar ahora y si le permiten pagar al llegar.
// Nada de credenciales: los tokens de MercadoPago son `select: false` y ni
// siquiera llegan hasta acá.
const toPublicPagos = (club) => {
  const pagos = club.pagos || {};
  const online = pagos.mp?.conectado === true;

  return {
    online,
    modalidad: pagos.modalidad || 'total',
    senaTipo: pagos.senaTipo || 'porcentaje',
    senaValor: pagos.senaValor ?? 0,
    // Sin cuenta conectada no hay forma de cobrar online: el pago en el
    // complejo es la única opción, sin importar cómo esté el switch.
    permitePagoEnComplejo: !online || pagos.permitePagoEnComplejo !== false
  };
};

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
    const { ciudad, tipo, q, fecha, hora } = req.query;
    // Incluye el estado de la suscripción: un club en mora nivel 1 sale del buscador.
    const filter = filtroClubVisible();

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

    // Se traen los docs completos (incluyen horarios/timezone) para poder calcular
    // disponibilidad; los campos públicos se seleccionan al armar la respuesta.
    let clubs = await Club.find(filter).sort({ nombre: 1 });

    const ids = clubs.map((c) => c._id);
    const courts = await Court.find({ club: { $in: ids }, visible: { $ne: false }, estado: 'activa' });

    const fechaValida = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha);
    const horaValida = hora && /^\d{2}:\d{2}$/.test(hora);

    // Con fecha pero sin hora puntual: ocultar los clubes que ese día están
    // cerrados (día especial "cerrado" o día semanal no abierto). No se filtra
    // por ocupación: un club abierto sigue apareciendo aunque esté lleno.
    if (fechaValida && !horaValida) {
      clubs = clubs.filter((club) => {
        const horarios = club.horarios
          ? (club.horarios.toObject ? club.horarios.toObject() : club.horarios)
          : null;
        const horariosLocal = horarios
          ? horariosToLocal(horarios, club.timezone || DEFAULT_TZ)
          : null;
        return dayConfigForDate(horariosLocal, fecha).abierto !== false;
      });
    }

    // Filtro por hora de inicio: sólo clubes con alguna cancha que tenga un turno
    // libre que empiece a `hora` en `fecha` (con la duración por defecto de la cancha).
    if (fechaValida && horaValida) {
      // Ventana UTC holgada (±14h) para cubrir el día en cualquier timezone; el
      // solapamiento fino lo resuelve computeSlots por cada turno.
      const desde = dayjs.utc(fecha, 'YYYY-MM-DD').subtract(14, 'hour').toDate();
      const hasta = dayjs.utc(fecha, 'YYYY-MM-DD').add(1, 'day').add(14, 'hour').toDate();
      const reservations = await Reservation.find({
        court: { $in: courts.map((c) => c._id) },
        estado: { $in: ACTIVE_RESERVATION_STATUSES },
        inicio: { $lt: hasta },
        fin: { $gt: desde }
      }).select('court inicio fin');

      const resByCourt = {};
      for (const r of reservations) {
        const k = r.court.toString();
        (resByCourt[k] = resByCourt[k] || []).push(r);
      }

      const clubById = {};
      clubs.forEach((c) => { clubById[c._id.toString()] = c; });

      const disponibles = new Set();
      for (const court of courts) {
        if (tipo && court.tipo !== tipo) continue;
        const club = clubById[court.club.toString()];
        if (!club) continue;
        const rs = resByCourt[court._id.toString()] || [];
        const { abierto, slots } = computeSlots(club, court, fecha, rs, court.duracionTurno);
        if (abierto && slots.some((s) => s.horaInicio === hora && s.disponible)) {
          disponibles.add(court.club.toString());
        }
      }

      clubs = clubs.filter((c) => disponibles.has(c._id.toString()));
    }

    // Deportes y precio "desde" por club (para los chips y el precio de la card).
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
      const pub = {};
      PUBLIC_CLUB_FIELDS.split(' ').forEach((f) => { pub[f] = c[f]; });
      pub._id = c._id;
      return {
        ...pub,
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
    const club = await Club.findOne(filtroClubVisible({ slug: req.params.slug }));
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
      club: { ...publicClub, horarios, pagos: toPublicPagos(club) },
      courts: courts.map(toPublicCourt)
    });
  } catch (error) {
    next(error);
  }
};

// Busca y valida que la cancha sea pública y pertenezca al club publicado.
const findPublicClubAndCourt = async (slug, courtId) => {
  const club = await Club.findOne(filtroClubVisible({ slug }));
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

// GET /public/clubs/:slug/availability?fecha=YYYY-MM-DD
// Disponibilidad de TODAS las canchas públicas del club para una fecha, en un
// solo request (alimenta la vista de timeline). Cada cancha usa su propia
// duración de turno.
const getClubAvailability = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { fecha } = req.query;

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return res.status(400).json({ ok: false, message: 'Indicá una fecha válida (YYYY-MM-DD)' });
    }

    const club = await Club.findOne(filtroClubVisible({ slug }));
    if (!club) return res.status(404).json({ ok: false, message: 'Club no encontrado' });

    const courts = await Court.find({ club: club._id, visible: { $ne: false }, estado: 'activa' }).sort({ nombre: 1 });

    const tz = club.timezone || DEFAULT_TZ;
    // Ventana del día en instantes UTC para traer las reservas que lo solapan.
    const desde = dayjs.tz(`${fecha} 00:00`, 'YYYY-MM-DD HH:mm', tz).utc().toDate();
    const hasta = dayjs.tz(`${fecha} 00:00`, 'YYYY-MM-DD HH:mm', tz).add(1, 'day').utc().toDate();

    const reservations = await Reservation.find({
      court: { $in: courts.map((c) => c._id) },
      estado: { $in: ACTIVE_RESERVATION_STATUSES },
      inicio: { $lt: hasta },
      fin: { $gt: desde }
    }).select('court inicio fin');

    const resByCourt = {};
    for (const r of reservations) {
      const k = r.court.toString();
      (resByCourt[k] = resByCourt[k] || []).push(r);
    }

    const result = courts.map((court) => {
      const rs = resByCourt[court._id.toString()] || [];
      const { abierto, nombre, slots } = computeSlots(club, court, fecha, rs, court.duracionTurno);
      return { court: toPublicCourt(court), abierto, nombre, slots };
    });

    res.status(200).json({ ok: true, fecha, courts: result });
  } catch (error) {
    next(error);
  }
};

// GET /public/cities
// Ciudades (distinct) con al menos un club publicado, para el filtro del buscador.
const getPublicCities = async (req, res, next) => {
  try {
    const cities = await Club.find(filtroClubVisible({ ciudad: { $nin: [null, ''] } })).distinct('ciudad');
    cities.sort((a, b) => a.localeCompare(b, 'es'));
    res.status(200).json({ ok: true, cities });
  } catch (error) {
    next(error);
  }
};

// GET /public/slug-available?slug=&excludeId=
// Chequea si un slug está libre (para el link público del complejo). excludeId
// permite que el club, al editar, no choque con su propio slug.
const checkSlugAvailable = async (req, res, next) => {
  try {
    const slug = (req.query.slug || '').toString().toLowerCase().trim();
    const excludeId = req.query.excludeId;

    if (!slug || slug.length < 3 || !/^[a-z0-9-]+$/.test(slug)) {
      return res.status(200).json({ ok: true, available: false, reason: 'formato' });
    }

    const found = await Club.findOne({ slug });
    const available = !found || (!!excludeId && found._id.toString() === excludeId);
    res.status(200).json({ ok: true, available, reason: available ? null : 'en_uso' });
  } catch (error) {
    next(error);
  }
};

// Reserva tal como la ve el jugador que la acaba de crear.
const reservationDTO = (reservation, club, court) => ({
  _id: reservation._id,
  inicio: reservation.inicio,
  fin: reservation.fin,
  estado: reservation.estado,
  precioFinal: reservation.precioFinal,
  guestName: reservation.guestName,
  pago: reservation.pago,
  expiraEn: reservation.expiraEn,
  court: { nombre: court.nombre, tipo: court.tipo },
  club: { nombre: club.nombre, slug: club.slug, timezone: club.timezone, moneda: club.moneda }
});

/**
 * Crea el intento de cobro y la preferencia de MercadoPago del club.
 *
 * Compartido entre la reserva nueva y el reintento tras un rechazo; cada
 * llamada genera un `Payment` propio, así queda el rastro de los intentos
 * fallidos en vez de pisarlos.
 */
const crearPreferencia = async ({ reservation, club, court, cobro }) => {
  const token = await getClubAccessToken(club._id);
  if (!token) {
    throw new Error('El complejo no tiene MercadoPago conectado');
  }

  const moneda = club.moneda || 'ARS';
  const comisionPct = Number(club.pagos?.comisionPorcentaje) || 0;
  const comision = comisionPct > 0 ? Math.round((cobro.monto * comisionPct) / 100) : 0;

  const payment = await Payment.create({
    club: club._id,
    reservation: reservation._id,
    externalReference: String(reservation._id),
    estado: 'pendiente',
    tipo: cobro.tipo,
    monto: cobro.monto,
    montoTotalTurno: reservation.precioFinal,
    moneda,
    comision,
    payerEmail: reservation.guestEmail || undefined
  });

  const appUrl = (process.env.APP_PUBLIC_URL || '').replace(/\/$/, '');
  const apiUrl = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
  const volverA = `${appUrl}/reserva/${reservation.manageToken}`;

  const preference = await createPreference(
    token,
    {
      items: [
        {
          id: String(court._id),
          title: `${court.nombre} · ${club.nombre}`,
          description:
            cobro.tipo === 'sena'
              ? `Seña del turno (resta ${cobro.saldo} en el complejo)`
              : 'Turno completo',
          quantity: 1,
          currency_id: moneda,
          unit_price: cobro.monto
        }
      ],
      payer: {
        name: reservation.guestName || undefined,
        email: reservation.guestEmail || undefined
      },
      // Con esto reconocemos el pago cuando vuelve por el webhook.
      external_reference: String(reservation._id),
      metadata: { club_id: String(club._id), reservation_id: String(reservation._id) },
      back_urls: {
        success: `${volverA}?pago=success`,
        pending: `${volverA}?pago=pending`,
        failure: `${volverA}?pago=failure`
      },
      auto_return: 'approved',
      // La confirmación real entra por acá, no por el back_url: el jugador
      // puede cerrar la pestaña apenas paga y la reserva tiene que confirmarse
      // igual.
      notification_url: `${apiUrl}/api/public/mp/webhook`,
      // Que MercadoPago cierre la preferencia junto con el hold, para que nadie
      // pague un horario que ya se liberó.
      expires: true,
      // MercadoPago espera el formato `yyyy-MM-ddTHH:mm:ss.SSSXXX`, con el
      // offset explícito. Un `toISOString()` (que termina en "Z") lo rechaza en
      // algunos entornos, y ese rechazo tira abajo toda la creación de la
      // preferencia.
      expiration_date_to: reservation.expiraEn
        ? dayjs(reservation.expiraEn).tz(club.timezone || DEFAULT_TZ).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
        : undefined,
      ...(comision > 0 ? { marketplace_fee: comision } : {})
    },
    String(payment._id)
  );

  payment.preferenceId = preference.id;
  await payment.save();

  return {
    payment,
    preferenceId: preference.id,
    initPoint: preference.init_point || preference.sandbox_init_point
  };
};

// POST /public/clubs/:slug/reservations
// Reserva como invitado (sin cuenta). Devuelve el manageToken para que el
// frontend arme el link de gestión.
const createPublicReservation = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { courtId, inicio, fin, guestPhone, guestEmail, notas, metodoPago } = req.body;

    // Si el que reserva está logueado (attachUserOptional), la reserva queda
    // asociada a su cuenta y su nombre/email de la cuenta sirven de fallback.
    const authedUser = req.user || null;
    const guestName = req.body.guestName || authedUser?.nombre || null;

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

    // ¿Esta reserva se cobra online? Sólo si el complejo tiene MercadoPago
    // vinculado; si no lo tiene, cualquier método elegido cae en "pagar en el
    // complejo" y la reserva entra como pendiente igual que siempre.
    const onlineDisponible = cobraOnline(club);
    const pagoOnline = onlineDisponible && metodoPago !== 'complejo';

    if (!pagoOnline && onlineDisponible && club.pagos?.permitePagoEnComplejo === false) {
      return res.status(400).json({
        ok: false,
        message: 'Este complejo requiere el pago online para confirmar la reserva.'
      });
    }

    const cobro = pagoOnline ? montoACobrar(club, precioFinal) : null;

    let reservation;
    try {
      reservation = await Reservation.create({
        club: club._id,
        court: court._id,
        customer: authedUser?._id || null,
        guestName,
        guestPhone,
        guestEmail: guestEmail || authedUser?.email || null,
        inicio: new Date(inicio),
        fin: new Date(fin),
        estado: 'pendiente',
        precioFinal,
        notas,
        origen: 'publica',
        creadaPor: null,
        pago: pagoOnline
          ? { estado: 'pendiente', tipo: cobro.tipo, montoPagado: 0, saldoPendiente: cobro.saldo }
          : { estado: 'no_requerido' },
        // El hold bloquea el horario mientras dura el checkout. Sin pago online
        // no hay nada que esperar y la reserva no vence.
        expiraEn: pagoOnline ? holdExpiresAt() : null
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ ok: false, message: 'Ese horario acaba de ser reservado. Probá con otro.' });
      }
      throw err;
    }

    // --- Camino con pago online ---
    //
    // Acá NO se manda ningún email, ni se registra la caja, ni se avisa al
    // complejo: la reserva todavía no está pagada. Todo eso lo dispara el
    // webhook cuando MercadoPago confirma la acreditación. Decirle "reserva
    // confirmada" a alguien que todavía no pagó es justo el problema que esta
    // funcionalidad viene a resolver.
    if (pagoOnline) {
      try {
        const checkout = await crearPreferencia({ reservation, club, court, cobro });

        return res.status(201).json({
          ok: true,
          manageToken: reservation.manageToken,
          reservation: reservationDTO(reservation, club, court),
          pago: {
            initPoint: checkout.initPoint,
            preferenceId: checkout.preferenceId,
            monto: cobro.monto,
            tipo: cobro.tipo,
            saldo: cobro.saldo,
            expiraEn: reservation.expiraEn
          }
        });
      } catch (err) {
        // Sin link de pago el jugador no puede hacer nada con esta reserva, y
        // dejarla viva bloquearía el horario 15 minutos por un error nuestro.
        await Reservation.deleteOne({ _id: reservation._id });
        await Payment.deleteMany({ reservation: reservation._id });

        // eslint-disable-next-line no-console
        console.error('No se pudo crear la preferencia de pago:', err.message);
        return res.status(502).json({
          ok: false,
          message: 'No pudimos iniciar el pago. Probá de nuevo en unos minutos.'
        });
      }
    }

    // --- Camino sin pago online (se paga en el complejo) ---

    // Registra/actualiza el cliente del club (clave: email). Best-effort.
    const clientResult = await upsertClientFromReservation(reservation);

    // Notificaciones para el complejo (best-effort).
    const cuando = dayjs(reservation.inicio).tz(tz).format('DD MMM HH:mm');
    await notify(club._id, {
      tipo: 'reserva',
      titulo: 'Nueva reserva',
      mensaje: `${guestName} reservó ${court.nombre} · ${cuando}`,
      reservation: reservation._id
    });
    if (clientResult?.isNew) {
      await notify(club._id, {
        tipo: 'cliente',
        titulo: 'Nuevo cliente',
        mensaje: `${guestName} hizo su primera reserva`
      });
    }

    // Confirmación por email al jugador, con el turno adjunto como .ics.
    // Best-effort: la reserva ya está creada y la respuesta no depende de esto.
    await sendReservationConfirmation({ reservation, club, court });

    // Y el aviso al complejo: esta reserva entró por la web, no la cargaron ellos.
    await sendClubReservationNotice({ tipo: 'nueva', reservation, club, court });

    res.status(201).json({
      ok: true,
      // El token es la prueba de propiedad para gestionar la reserva sin cuenta.
      manageToken: reservation.manageToken,
      reservation: reservationDTO(reservation, club, court)
    });
  } catch (error) {
    next(error);
  }
};

// Reserva + club + cancha a partir del token de gestión. Devuelve null si el
// token no existe.
const cargarPorToken = async (token) => {
  const reservation = await Reservation.findOne({ manageToken: token });
  if (!reservation) return null;

  const [club, court] = await Promise.all([
    Club.findById(reservation.club),
    Court.findById(reservation.court)
  ]);

  return club ? { reservation, club, court } : null;
};

const pagoDTO = (reservation) => ({
  estado: reservation.pago?.estado || 'no_requerido',
  tipo: reservation.pago?.tipo || null,
  montoPagado: reservation.pago?.montoPagado || 0,
  saldoPendiente: reservation.pago?.saldoPendiente || 0,
  expiraEn: reservation.expiraEn || null,
  reservaEstado: reservation.estado
});

// GET /public/reservations/:token/pago
//
// Estado del cobro, para la pantalla a la que vuelve el jugador desde
// MercadoPago. Además de leer nuestra base, reconcilia contra MercadoPago si el
// pago sigue pendiente: el webhook es la vía normal, pero puede demorar unos
// segundos o perderse, y el jugador no puede quedar mirando un "confirmando"
// eterno cuando ya pagó.
const getReservationPaymentStatus = async (req, res, next) => {
  try {
    const data = await cargarPorToken(req.params.token);
    if (!data) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });

    const { reservation, club, court } = data;

    if (reservation.pago?.estado !== 'pendiente') {
      return res.status(200).json({ ok: true, pago: pagoDTO(reservation) });
    }

    // Reconciliación best-effort: si falla, se devuelve lo que tenemos y el
    // webhook sigue siendo el que va a confirmar.
    try {
      const token = await getClubAccessToken(club._id);
      if (token) {
        const busqueda = await searchPayments(token, String(reservation._id));
        const aprobado = (busqueda?.results || []).find((p) => p.status === 'approved');

        if (aprobado) {
          const payment = await Payment.findOne({
            reservation: reservation._id,
            estado: 'pendiente'
          }).sort({ createdAt: -1 });

          if (payment) {
            payment.paymentId = String(aprobado.id);
            payment.estado = 'aprobado';
            payment.aprobadoEn = new Date();
            payment.metodoPago = aprobado.payment_method_id;
            payment.rawStatus = aprobado.status;
            payment.rawStatusDetail = aprobado.status_detail;
            await payment.save();

            await confirmarPagoDeReserva({ payment, reservation, club, court });
          }
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('No se pudo reconciliar el pago con MercadoPago:', err.message);
    }

    res.status(200).json({ ok: true, pago: pagoDTO(reservation) });
  } catch (error) {
    next(error);
  }
};

// POST /public/reservations/:token/retry-payment
//
// Nuevo link de pago para una reserva a la que le rechazaron la tarjeta. El
// horario sigue bloqueado hasta que vence el hold, así que el jugador no lo
// pierde por probar con otro medio de pago.
const retryReservationPayment = async (req, res, next) => {
  try {
    const data = await cargarPorToken(req.params.token);
    if (!data) return res.status(404).json({ ok: false, message: 'Reserva no encontrada' });

    const { reservation, club, court } = data;

    if (reservation.pago?.estado === 'pagado') {
      return res.status(400).json({ ok: false, message: 'Esta reserva ya está paga.' });
    }

    if (reservation.estado !== 'pendiente' || reservation.pago?.estado !== 'pendiente') {
      return res.status(400).json({ ok: false, message: 'Esta reserva ya no se puede pagar.' });
    }

    if (reservation.expiraEn && reservation.expiraEn < new Date()) {
      return res.status(410).json({
        ok: false,
        message: 'Se venció el tiempo para pagar y el horario se liberó. Buscá otro turno.'
      });
    }

    if (!cobraOnline(club)) {
      return res.status(400).json({ ok: false, message: 'Este complejo ya no cobra online.' });
    }

    const cobro = montoACobrar(club, reservation.precioFinal);
    const checkout = await crearPreferencia({ reservation, club, court, cobro });

    res.status(200).json({
      ok: true,
      pago: {
        initPoint: checkout.initPoint,
        preferenceId: checkout.preferenceId,
        monto: cobro.monto,
        tipo: cobro.tipo,
        saldo: cobro.saldo,
        expiraEn: reservation.expiraEn
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
  getClubAvailability,
  createPublicReservation,
  getPublicCities,
  checkSlugAvailable,
  getReservationPaymentStatus,
  retryReservationPayment
};
