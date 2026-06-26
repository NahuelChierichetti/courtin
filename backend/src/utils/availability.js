// Cálculo de disponibilidad pública: dado un club, una cancha, una fecha y una
// duración, genera la grilla de horarios de inicio posibles (cada GRID_STEP
// minutos) y marca cada uno como disponible o no, SIN exponer los datos de las
// reservas existentes.

// Granularidad de los horarios de inicio ofrecidos (permite turnos "y media").
const GRID_STEP = 30;

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const { horariosToLocal, DEFAULT_TZ } = require('./timezone');
const { dayConfigForDate, toMinutes, normalizeCloseMinutes } = require('./reservationRules');
const { priceForDuration } = require('./pricing');

const minutesToTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// `reservations`: reservas ACTIVAS de la cancha que solapan el día (instantes UTC).
// `duracion`: duración elegida del turno en minutos (default: la de la cancha).
const computeSlots = (club, court, fecha, reservations = [], duracion) => {
  const tz = (club && club.timezone) || DEFAULT_TZ;
  const horarios = club && club.horarios
    ? (club.horarios.toObject ? club.horarios.toObject() : club.horarios)
    : null;
  const horariosLocal = horarios ? horariosToLocal(horarios, tz) : null;

  const cfg = dayConfigForDate(horariosLocal, fecha);
  if (!cfg.abierto) {
    return { abierto: false, nombre: cfg.nombre || null, slots: [] };
  }

  const openStart = toMinutes(cfg.horaInicio);
  const openEnd = normalizeCloseMinutes(cfg.horaFin);
  const dur = duracion || court.duracionTurno || 60;
  const dow = dayjs(fecha).day();
  const now = dayjs();

  const maxDays = horarios?.reservas?.anticipacionMaximaDias ?? 15;
  const todayKey = now.tz(tz).format('YYYY-MM-DD');
  const pastDate = fecha < todayKey;
  const tooFar = dayjs(fecha).diff(dayjs(todayKey), 'day') > maxDays;

  const slots = [];
  // Los inicios se ofrecen cada GRID_STEP min; el turno dura `dur` min y debe
  // entrar completo dentro del horario de atención.
  for (let m = openStart; m + dur <= openEnd; m += GRID_STEP) {
    const hhmm = minutesToTime(m);
    const startLocal = dayjs.tz(`${fecha} ${hhmm}`, 'YYYY-MM-DD HH:mm', tz);
    const inicio = startLocal.utc();
    const fin = startLocal.add(dur, 'minute').utc();

    const reservado = reservations.some(
      (r) => inicio.isBefore(dayjs(r.fin)) && fin.isAfter(dayjs(r.inicio))
    );
    const pasado = pastDate || !inicio.isAfter(now);

    let motivo = null;
    if (reservado) motivo = 'reservado';
    else if (pasado) motivo = 'pasado';
    else if (tooFar) motivo = 'fuera_de_anticipacion';

    slots.push({
      horaInicio: hhmm,
      horaFin: minutesToTime(m + dur),
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      precio: priceForDuration(court, dow, hhmm, dur),
      disponible: !motivo,
      motivo
    });
  }

  return { abierto: true, nombre: cfg.nombre || null, slots };
};

module.exports = { computeSlots, minutesToTime };
