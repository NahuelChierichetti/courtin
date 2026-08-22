'use strict';

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const Reservation = require('../models/Reservation');
const { horariosToLocal, DEFAULT_TZ } = require('./timezone');
const { dayConfigForDate, toMinutes, normalizeCloseMinutes } = require('./reservationRules');

// Motor de los turnos fijos. Toda la aritmética de fechas del feature vive acá
// y en ningún otro lado: es la parte donde los bugs son sutiles y no se ven a
// ojo. Ver docs/turnos-fijos.md.
//
// Regla de oro: en la base no hay horarios locales. La regla se guarda en UTC
// (`diaSemanaUtc` + `horaInicioUtc`) igual que `Club.horarios.semanal`, y las
// ocurrencias son instantes UTC como cualquier `Reservation`.

// Cuántos días hacia adelante se mantienen materializados. Tiene que ser SIEMPRE
// mayor que `horarios.reservas.anticipacionMaximaDias` del club (default 15):
// si el público pudiera reservar más lejos que el horizonte, alguien podría
// tomarle el horario al cliente fijo antes de que el job llegue a generarlo.
const HORIZON_DAYS = Number(process.env.RECURRING_HORIZON_DAYS || 90);

const ACTIVE_STATUSES = ['pendiente', 'confirmada'];

// --- Conversión de la regla entre local y UTC ---
//
// El par (día de la semana, hora) se convierte JUNTO y nunca campo por campo:
// pasar a UTC puede correr el día. Un turno de los martes a las 21:30 en UTC−3
// es miércoles 00:30 UTC. Convertir sólo la hora dejaría la regla un día
// entero fuera de lugar.

// Fecha de una semana de referencia que cae en `diaSemana`. Se usa la semana
// actual para que el offset (y el DST, donde exista) sea el vigente.
const refDateForWeekday = (base, diaSemana) => base.startOf('week').add(diaSemana, 'day').format('YYYY-MM-DD');

/** (diaSemana, horaInicio) en hora del club -> (diaSemanaUtc, horaInicioUtc). */
const ruleToUtc = ({ diaSemana, horaInicio }, tz = DEFAULT_TZ) => {
  const fecha = refDateForWeekday(dayjs().tz(tz), diaSemana);
  const enUtc = dayjs.tz(`${fecha} ${horaInicio}`, 'YYYY-MM-DD HH:mm', tz).utc();
  return { diaSemanaUtc: enUtc.day(), horaInicioUtc: enUtc.format('HH:mm') };
};

/** (diaSemanaUtc, horaInicioUtc) -> (diaSemana, horaInicio) en hora del club. */
const ruleToLocal = ({ diaSemanaUtc, horaInicioUtc }, tz = DEFAULT_TZ) => {
  const fecha = refDateForWeekday(dayjs.utc(), diaSemanaUtc);
  const local = dayjs.utc(`${fecha} ${horaInicioUtc}`, 'YYYY-MM-DD HH:mm').tz(tz);
  return { diaSemana: local.day(), horaInicio: local.format('HH:mm') };
};

// --- Ocurrencias ---

const dentroDeAlgunaPausa = (inicio, pausas = []) =>
  pausas.some((p) => !dayjs(inicio).isBefore(dayjs(p.desde)) && dayjs(inicio).isBefore(dayjs(p.hasta)));

/**
 * Instantes UTC de la regla dentro de [desde, hasta).
 *
 * Respeta vigencia y pausas. Devuelve `{ inicio, fin }` como Date, listos para
 * guardarse en una `Reservation` sin más conversión.
 */
const occurrencesBetween = (rule, desde, hasta) => {
  const [h, m] = rule.horaInicioUtc.split(':').map(Number);

  const desdeD = dayjs.utc(desde);
  const hastaD = dayjs.utc(hasta);

  // Primer día >= `desde` que cae en el día de la semana buscado.
  const salto = (rule.diaSemanaUtc - desdeD.day() + 7) % 7;
  let cursor = desdeD.startOf('day').add(salto, 'day').hour(h).minute(m).second(0).millisecond(0);

  // El salto puede dar "hoy" a una hora que ya pasó: en ese caso, la semana que viene.
  if (cursor.isBefore(desdeD)) cursor = cursor.add(7, 'day');

  const vigenteDesde = dayjs.utc(rule.vigenteDesde);
  const vigenteHasta = rule.vigenteHasta ? dayjs.utc(rule.vigenteHasta) : null;

  const out = [];
  while (cursor.isBefore(hastaD)) {
    const inicio = cursor;
    const dentroDeVigencia =
      !inicio.isBefore(vigenteDesde) && (!vigenteHasta || inicio.isBefore(vigenteHasta));

    if (dentroDeVigencia && !dentroDeAlgunaPausa(inicio.toDate(), rule.pausas)) {
      out.push({
        inicio: inicio.toDate(),
        fin: inicio.add(rule.duracionMin, 'minute').toDate()
      });
    }
    cursor = cursor.add(7, 'day');
  }

  return out;
};

// --- Chequeos previos a crear la ocurrencia ---

/**
 * ¿El complejo está abierto y el turno entra en el horario de atención?
 *
 * Es el mismo chequeo que `validateReservationSlot`, MENOS la anticipación
 * máxima y el "no crear en el pasado". Esos dos no aplican acá a propósito: el
 * job genera justamente más allá de la ventana pública, y esa es la razón por
 * la que el turno fijo le gana de mano al público.
 */
const checkHorario = (club, inicio, fin) => {
  const horarios = club?.horarios ? club.horarios.toObject?.() ?? club.horarios : null;
  if (!horarios) return { ok: true };

  const tz = club.timezone || DEFAULT_TZ;
  const horariosLocal = horariosToLocal(horarios, tz);

  const start = dayjs(inicio).tz(tz);
  const end = dayjs(fin).tz(tz);
  const cfg = dayConfigForDate(horariosLocal, start.format('YYYY-MM-DD'));

  if (!cfg.abierto) return { ok: false, motivo: 'cerrado' };

  const startMin = start.hour() * 60 + start.minute();
  const endMin = startMin + end.diff(start, 'minute');
  if (startMin < toMinutes(cfg.horaInicio) || endMin > normalizeCloseMinutes(cfg.horaFin)) {
    return { ok: false, motivo: 'fuera_de_horario' };
  }

  return { ok: true };
};

// Solapamiento por instantes, igual criterio que el resto del sistema:
// inicioA < finB && finA > inicioB.
const findOverlapping = (rule, { inicio, fin }) =>
  Reservation.findOne({
    court: rule.court,
    estado: { $in: ACTIVE_STATUSES },
    inicio: { $lt: fin },
    fin: { $gt: inicio }
  }).select('_id');

// --- Materialización ---

const datosDelCliente = (rule) => ({
  customer: rule.customer || null,
  guestName: rule.customer ? null : rule.guestName,
  guestPhone: rule.customer ? null : rule.guestPhone,
  guestEmail: rule.customer ? null : rule.guestEmail
});

/**
 * Genera las ocurrencias que falten de una regla hasta el horizonte.
 *
 * Idempotente: se puede correr N veces por día sin duplicar nada. La existencia
 * se pregunta por `(recurring, inicio)` SIN filtrar por estado — una ocurrencia
 * cancelada cuenta como generada, porque si no el job pisaría al día siguiente
 * la excepción que puso el complejo ("este martes no vengo").
 *
 * Auto-sanador: escanea siempre desde hoy, no desde `materializadoHasta`. Son
 * ~13 fechas, y así un conflicto que se destrabó se genera en la corrida
 * siguiente sin que nadie tenga que pedirlo.
 *
 * Nunca pisa una reserva existente: si el horario está ocupado lo registra como
 * conflicto para que una persona lo resuelva.
 *
 * @returns {Promise<{creadas:number, conflictos:Array, nuevosConflictos:Array}>}
 */
const materializeRule = async (rule, club, { hasta = null, ahora = new Date() } = {}) => {
  const limite = hasta || dayjs.utc(ahora).add(HORIZON_DAYS, 'day').toDate();

  const fechas = occurrencesBetween(rule, ahora, limite);
  const resultado = { creadas: 0, conflictos: [], nuevosConflictos: [] };

  if (fechas.length === 0) return resultado;

  // Una sola query para saber qué ocurrencias ya existen, en vez de una por fecha.
  const yaGeneradas = await Reservation.find({
    recurring: rule._id,
    inicio: { $in: fechas.map((f) => f.inicio) }
  }).select('inicio');

  const existentes = new Set(yaGeneradas.map((r) => r.inicio.getTime()));

  // `detectadoEn` de la corrida anterior, para no volver a notificar lo mismo.
  const conflictosPrevios = new Map(
    (rule.conflictos || []).map((c) => [new Date(c.fecha).getTime(), c])
  );

  for (const slot of fechas) {
    if (existentes.has(slot.inicio.getTime())) continue;

    const anotarConflicto = (motivo) => {
      const previo = conflictosPrevios.get(slot.inicio.getTime());
      const conflicto = {
        fecha: slot.inicio,
        motivo,
        detectadoEn: previo?.detectadoEn || new Date()
      };
      resultado.conflictos.push(conflicto);
      if (!previo) resultado.nuevosConflictos.push(conflicto);
    };

    const horario = checkHorario(club, slot.inicio, slot.fin);
    if (!horario.ok) {
      anotarConflicto(horario.motivo);
      continue;
    }

    if (await findOverlapping(rule, slot)) {
      anotarConflicto('ocupado');
      continue;
    }

    try {
      await Reservation.create({
        club: rule.club,
        court: rule.court,
        ...datosDelCliente(rule),
        inicio: slot.inicio,
        fin: slot.fin,
        estado: 'confirmada',
        precioFinal: rule.precioPorTurno,
        notas: rule.notas,
        creadaPor: rule.creadoPor,
        origen: 'backoffice',
        recurring: rule._id,
        esFijo: true
      });
      resultado.creadas += 1;
    } catch (error) {
      // El índice único `{court, inicio}` ganó la carrera: alguien tomó el slot
      // entre el chequeo y el create. Es un conflicto como cualquier otro.
      if (error.code === 11000) {
        anotarConflicto('ocupado');
        continue;
      }
      throw error;
    }
  }

  rule.conflictos = resultado.conflictos;
  rule.materializadoHasta = limite;
  await rule.save();

  return resultado;
};

module.exports = {
  HORIZON_DAYS,
  ruleToUtc,
  ruleToLocal,
  occurrencesBetween,
  checkHorario,
  materializeRule
};
