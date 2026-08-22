const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

const RecurringBooking = require('../models/RecurringBooking');
const Reservation = require('../models/Reservation');
const Court = require('../models/Court');
const Club = require('../models/Club');
const Client = require('../models/Client');
const { occurrencesBetween, checkHorario, materializeRule, ruleToLocal, HORIZON_DAYS } = require('../utils/recurring');
const { puedeCrearReservas } = require('../utils/subscriptions');
const { notify } = require('../utils/notifications');
const { DEFAULT_TZ } = require('../utils/timezone');

// Turnos fijos: el CRUD de la regla. Las ocurrencias son `Reservation` normales
// y se gestionan con los endpoints de siempre — en particular, cancelar UN día
// es la cancelación de reserva de toda la vida y no pasa por acá.
// Ver docs/turnos-fijos.md.

const POPULATE = [
  ['court', 'nombre tipo'],
  ['client', 'nombre email telefono'],
  ['customer', 'nombre email']
];

const populateRule = (query) => {
  POPULATE.forEach(([path, fields]) => query.populate(path, fields));
  return query;
};

// El DTO agrega el día y la hora en la zona del club. En la base sólo hay UTC;
// esta es la traducción del borde, igual que `horariosToLocal` para el horario
// del complejo.
const toDTO = (rule, tz) => {
  const obj = rule.toObject ? rule.toObject() : rule;
  return {
    ...obj,
    local: ruleToLocal({ diaSemanaUtc: obj.diaSemanaUtc, horaInicioUtc: obj.horaInicioUtc }, tz)
  };
};

// La regla se define por un instante UTC concreto (el turno que el complejo
// está mirando en el timeline) y no por un día + hora sueltos. Así el alta es
// "hacé fijo este turno" y no hay ninguna conversión de zona en el medio: el
// día de la semana y la hora salen del propio instante.
const reglaDesdeInstante = (inicio, duracionMin) => {
  const d = dayjs.utc(inicio);
  return {
    diaSemanaUtc: d.day(),
    horaInicioUtc: d.format('HH:mm'),
    duracionMin
  };
};

const validarEntrada = ({ inicio, duracionMin }) => {
  if (!inicio || !dayjs(inicio).isValid()) {
    return { ok: false, message: 'El inicio del turno es obligatorio' };
  }
  if (!duracionMin || Number(duracionMin) <= 0) {
    return { ok: false, message: 'La duración debe ser mayor a cero' };
  }
  return { ok: true };
};

// Estado de cada fecha de la serie, sin escribir nada. Es lo que se le muestra
// al complejo ANTES de crear el turno fijo: si hay fechas ocupadas tiene que
// enterarse ahí y decidir, nunca descubrirlo después por una notificación.
const evaluarSerie = async ({ club, court, borrador, ahora = new Date() }) => {
  const hasta = dayjs.utc(ahora).add(HORIZON_DAYS, 'day').toDate();
  const fechas = occurrencesBetween(borrador, ahora, hasta);

  return Promise.all(
    fechas.map(async (slot) => {
      const horario = checkHorario(club, slot.inicio, slot.fin);
      if (!horario.ok) {
        return { inicio: slot.inicio, fin: slot.fin, estado: horario.motivo };
      }

      const ocupada = await Reservation.findOne({
        court: court._id,
        estado: { $in: ['pendiente', 'confirmada'] },
        inicio: { $lt: slot.fin },
        fin: { $gt: slot.inicio }
      }).select('_id');

      return { inicio: slot.inicio, fin: slot.fin, estado: ocupada ? 'ocupado' : 'libre' };
    })
  );
};

// Contexto común de las rutas que reciben cancha por body: club vivo, cancha
// del club y en condiciones de recibir turnos.
const cargarContexto = async ({ clubId, courtId }) => {
  const court = await Court.findOne({ _id: courtId, club: clubId });
  if (!court) return { error: { status: 404, message: 'Cancha no encontrada para ese club' } };
  if (court.estado !== 'activa') {
    return { error: { status: 400, message: 'No se puede fijar un turno en una cancha inactiva o en mantenimiento' } };
  }

  const club = await Club.findById(clubId).select('nombre estado timezone horarios');
  if (!club) return { error: { status: 404, message: 'Complejo no encontrado' } };

  return { club, court };
};

// GET /recurring/club/:clubId
const getRecurringByClub = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const filtro = { club: clubId };
    if (req.query.estado) filtro.estado = req.query.estado;

    const [reglas, club] = await Promise.all([
      populateRule(RecurringBooking.find(filtro)).sort({ diaSemanaUtc: 1, horaInicioUtc: 1 }),
      Club.findById(clubId).select('timezone')
    ]);

    const tz = club?.timezone || DEFAULT_TZ;
    res.status(200).json({ ok: true, recurring: reglas.map((r) => toDTO(r, tz)) });
  } catch (error) {
    next(error);
  }
};

// POST /recurring/club/:clubId/preview
//
// Previsualiza la serie sin crear nada. Separado del alta a propósito: el
// complejo tiene que poder mirar las fechas y arrepentirse.
const previewRecurring = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const { courtId, inicio, duracionMin } = req.body;

    const entrada = validarEntrada({ inicio, duracionMin });
    if (!entrada.ok) return res.status(400).json({ ok: false, message: entrada.message });

    const { club, court, error } = await cargarContexto({ clubId, courtId });
    if (error) return res.status(error.status).json({ ok: false, message: error.message });

    const borrador = {
      ...reglaDesdeInstante(inicio, Number(duracionMin)),
      vigenteDesde: new Date(inicio),
      vigenteHasta: null,
      pausas: []
    };

    const fechas = await evaluarSerie({ club, court, borrador });

    res.status(200).json({
      ok: true,
      horizonteDias: HORIZON_DAYS,
      local: ruleToLocal(borrador, club.timezone || DEFAULT_TZ),
      fechas,
      conflictos: fechas.filter((f) => f.estado !== 'libre').length
    });
  } catch (error) {
    next(error);
  }
};

// POST /recurring/club/:clubId
//
// Crea la regla y materializa el horizonte en el acto. No se espera al cron:
// el complejo tiene que ver los turnos en el timeline apenas aprieta "Guardar",
// o va a pensar que no funcionó.
const createRecurring = async (req, res, next) => {
  try {
    const { clubId } = req.params;
    const {
      courtId, inicio, duracionMin, precioPorTurno,
      customerId, guestName, guestPhone, guestEmail, notas
    } = req.body;

    const entrada = validarEntrada({ inicio, duracionMin });
    if (!entrada.ok) return res.status(400).json({ ok: false, message: entrada.message });

    if (!customerId && !guestName) {
      return res.status(400).json({ ok: false, message: 'Debes indicar un cliente registrado o el nombre del jugador' });
    }

    const { club, court, error } = await cargarContexto({ clubId, courtId });
    if (error) return res.status(error.status).json({ ok: false, message: error.message });

    // Un complejo impago no puede crear turnos fijos NUEVOS. Los que ya existen
    // se siguen materializando: ver el comentario del job.
    if (!puedeCrearReservas(club)) {
      return res.status(403).json({
        ok: false,
        code: 'SUSCRIPCION_IMPAGA',
        message: 'Tu suscripción está impaga, así que no se pueden crear turnos fijos nuevos. Regularizá el pago para reactivar el complejo.'
      });
    }

    // El cliente del CRM se vincula por email, igual que en una reserva suelta.
    //
    // A diferencia de una reserva, acá NO se tocan `reservasCount` ni
    // `totalGastado`: son 13 turnos que todavía no se jugaron y contarlos como
    // historial mentiría en la ficha del cliente.
    let client = null;
    const email = (guestEmail || '').toLowerCase().trim();
    if (email) {
      client = await Client.findOneAndUpdate(
        { club: clubId, email },
        {
          $setOnInsert: { primeraReserva: new Date() },
          $set: {
            ...(guestName ? { nombre: guestName } : {}),
            ...(guestPhone ? { telefono: guestPhone } : {}),
            ...(customerId ? { user: customerId } : {})
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    const rule = await RecurringBooking.create({
      club: clubId,
      court: courtId,
      client: client?._id || null,
      customer: customerId || null,
      guestName: customerId ? null : guestName,
      guestPhone: customerId ? null : guestPhone,
      guestEmail: customerId ? null : (guestEmail || null),
      ...reglaDesdeInstante(inicio, Number(duracionMin)),
      precioPorTurno: Number(precioPorTurno) || court.precio || 0,
      vigenteDesde: new Date(inicio),
      vigenteHasta: null,
      estado: 'activo',
      notas: notas || '',
      creadoPor: req.user._id
    });

    const resultado = await materializeRule(rule, club);

    const tz = club.timezone || DEFAULT_TZ;
    res.status(201).json({
      ok: true,
      recurring: toDTO(await populateRule(RecurringBooking.findById(rule._id)), tz),
      generadas: resultado.creadas,
      conflictos: resultado.conflictos
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /recurring/club/:clubId/:id
//
// Sólo cambia lo que no altera la recurrencia: precio, notas, contacto y
// estado (pausar/reanudar). Mover el día o la hora de un turno fijo es dar de
// baja uno y crear otro — hacerlo en un PATCH dejaría la serie ya generada
// apuntando a un horario que la regla ya no describe.
const updateRecurring = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;
    const { precioPorTurno, notas, guestName, guestPhone, estado, pausas, actualizarFuturas } = req.body;

    const rule = await RecurringBooking.findOne({ _id: id, club: clubId });
    if (!rule) return res.status(404).json({ ok: false, message: 'Turno fijo no encontrado' });

    if (estado && !['activo', 'pausado'].includes(estado)) {
      return res.status(400).json({ ok: false, message: 'Para dar de baja un turno fijo usá la baja, no el estado' });
    }

    const precioCambio = precioPorTurno !== undefined && Number(precioPorTurno) !== rule.precioPorTurno;

    if (precioPorTurno !== undefined) rule.precioPorTurno = Number(precioPorTurno);
    if (notas !== undefined) rule.notas = notas;
    if (guestName !== undefined) rule.guestName = guestName;
    if (guestPhone !== undefined) rule.guestPhone = guestPhone;
    if (estado) rule.estado = estado;
    if (pausas !== undefined) rule.pausas = pausas;

    await rule.save();

    // El precio nuevo no se propaga solo: las ocurrencias ya generadas nacieron
    // con el precio viejo y hay hasta 90 días de ellas. Lo decide el complejo.
    // Las que ya se cobraron no se tocan nunca.
    let actualizadas = 0;
    if (precioCambio && actualizarFuturas) {
      const result = await Reservation.updateMany(
        {
          recurring: rule._id,
          inicio: { $gt: new Date() },
          estado: { $in: ['pendiente', 'confirmada'] },
          'pago.estado': { $in: ['no_requerido', 'pendiente'] }
        },
        { $set: { precioFinal: rule.precioPorTurno } }
      );
      actualizadas = result.modifiedCount;
    }

    // Pausar libera los turnos del rango; reanudar los vuelve a generar en la
    // próxima corrida (o antes, si el complejo aprieta "regenerar").
    let liberadas = 0;
    if (pausas !== undefined && rule.pausas.length > 0) {
      for (const p of rule.pausas) {
        const result = await Reservation.updateMany(
          {
            recurring: rule._id,
            inicio: { $gte: new Date(p.desde), $lt: new Date(p.hasta) },
            estado: { $in: ['pendiente', 'confirmada'] }
          },
          { $set: { estado: 'cancelada' } }
        );
        liberadas += result.modifiedCount;
      }
    }

    const club = await Club.findById(clubId).select('timezone');
    res.status(200).json({
      ok: true,
      recurring: toDTO(await populateRule(RecurringBooking.findById(rule._id)), club?.timezone || DEFAULT_TZ),
      actualizadas,
      liberadas
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /recurring/club/:clubId/:id
//
// Da de baja el turno fijo. Es la ÚNICA forma de que un turno fijo deje de
// existir: no hay vencimiento, no hay expiración por falta de renovación. Un
// humano tiene que pedirlo.
//
// La regla no se borra: queda `finalizado` con su `vigenteHasta`, para que el
// historial del cliente siga cerrando.
const cancelRecurring = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;
    const desde = req.body?.desde ? new Date(req.body.desde) : new Date();

    const rule = await RecurringBooking.findOne({ _id: id, club: clubId });
    if (!rule) return res.status(404).json({ ok: false, message: 'Turno fijo no encontrado' });

    rule.estado = 'finalizado';
    rule.vigenteHasta = desde;
    rule.conflictos = [];
    await rule.save();

    // Se liberan las ocurrencias futuras. Las pasadas quedan intactas: son
    // historial y alimentan las stats del complejo.
    const result = await Reservation.updateMany(
      {
        recurring: rule._id,
        inicio: { $gte: desde },
        estado: { $in: ['pendiente', 'confirmada'] }
      },
      { $set: { estado: 'cancelada' } }
    );

    await notify(clubId, {
      tipo: 'cancelacion',
      titulo: 'Turno fijo dado de baja',
      mensaje: `${rule.guestName || 'Un turno fijo'} — se liberaron ${result.modifiedCount} turnos futuros.`
    });

    const club = await Club.findById(clubId).select('timezone');
    res.status(200).json({
      ok: true,
      recurring: toDTO(rule, club?.timezone || DEFAULT_TZ),
      liberadas: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecurringByClub,
  previewRecurring,
  createRecurring,
  updateRecurring,
  cancelRecurring
};
