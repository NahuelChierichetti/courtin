const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const { horariosToLocal, DEFAULT_TZ } = require('./timezone');

// Indexado por dayjs().day(): 0=domingo .. 6=sabado
const WEEKDAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

const toMinutes = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// "00:00" como cierre representa fin del día.
const normalizeCloseMinutes = (hhmm) => {
  const v = toMinutes(hhmm);
  return v === 0 ? 24 * 60 : v;
};

// Configuración efectiva del día (horario semanal + día especial), en horario
// local del club. `horariosLocal` ya debe venir convertido a la tz del club.
const dayConfigForDate = (horariosLocal, dateKey) => {
  if (!horariosLocal) return { abierto: true, horaInicio: '00:00', horaFin: '24:00' };

  const especial = (horariosLocal.diasEspeciales || []).find(
    (d) => dayjs.utc(d.fecha).format('YYYY-MM-DD') === dateKey
  );
  if (especial) {
    if (especial.tipo === 'cerrado') return { abierto: false, nombre: especial.nombre };
    if (especial.horaInicio && especial.horaFin) {
      return {
        abierto: true,
        horaInicio: especial.horaInicio,
        horaFin: especial.horaFin,
        nombre: especial.nombre
      };
    }
    // Día especial abierto sin horario propio: usa el horario semanal.
  }

  const key = WEEKDAY_KEYS[dayjs(dateKey).day()];
  const d = horariosLocal.semanal && horariosLocal.semanal[key];
  if (!d) return { abierto: true, horaInicio: '00:00', horaFin: '24:00' };
  if (d.abierto === false) return { abierto: false };
  return { abierto: true, horaInicio: d.horaInicio, horaFin: d.horaFin };
};

// Valida un turno (instantes UTC `inicio`/`fin`) contra las reglas del club.
// Devuelve { ok, message }. `validateSchedule` activa los chequeos de
// día/horario/anticipación/pasado; se desactiva al editar sin mover el turno.
const validateReservationSlot = (club, { inicio, fin, estado, isNew, validateSchedule = true }) => {
  const tz = (club && club.timezone) || DEFAULT_TZ;
  const start = dayjs(inicio).tz(tz);
  const end = dayjs(fin).tz(tz);
  const todayKey = dayjs().tz(tz).format('YYYY-MM-DD');
  const dateKey = start.format('YYYY-MM-DD');

  if (validateSchedule) {
    const horarios = club && club.horarios ? club.horarios.toObject?.() ?? club.horarios : null;
    const horariosLocal = horarios ? horariosToLocal(horarios, tz) : null;

    if (horariosLocal) {
      const cfg = dayConfigForDate(horariosLocal, dateKey);
      if (!cfg.abierto) {
        return {
          ok: false,
          message: cfg.nombre
            ? `El complejo está cerrado ese día (${cfg.nombre}).`
            : 'El complejo está cerrado ese día.'
        };
      }

      const openStart = toMinutes(cfg.horaInicio);
      const openEnd = normalizeCloseMinutes(cfg.horaFin);
      const startMin = start.hour() * 60 + start.minute();
      // Minutos relativos al inicio del día (soporta turnos que cruzan medianoche).
      const endMin = startMin + end.diff(start, 'minute');
      if (startMin < openStart || endMin > openEnd) {
        return {
          ok: false,
          message: `El horario debe estar dentro del horario de atención (${cfg.horaInicio} a ${cfg.horaFin}).`
        };
      }

      const maxDays = horarios?.reservas?.anticipacionMaximaDias ?? 15;
      const diff = dayjs(dateKey).diff(dayjs(todayKey), 'day');
      if (diff > maxDays) {
        return { ok: false, message: `Solo se puede reservar con hasta ${maxDays} días de anticipación.` };
      }

      if (isNew && dateKey < todayKey) {
        return { ok: false, message: 'No se puede crear un turno en una fecha pasada.' };
      }
    }
  }

  // No se puede marcar como "completada" un turno que aún no ocurrió.
  if (estado === 'completada' && dayjs(inicio).isAfter(dayjs())) {
    return { ok: false, message: 'No se puede marcar como completada un turno que aún no ocurrió.' };
  }

  return { ok: true };
};

// ¿La reserva está transcurriendo ahora? (comparación de instantes UTC)
const isReservationInProgress = ({ inicio, fin }) => {
  const now = dayjs();
  return !now.isBefore(dayjs(inicio)) && now.isBefore(dayjs(fin));
};

// ¿Puede cancelarse esta reserva respetando la tolerancia del club?
// Se usa en la cancelación pública (invitado vía token). El admin no tiene
// esta restricción. `toleranciaHoras` viene de horarios.reservas.
const canCancelReservation = ({ inicio }, toleranciaHoras = 0) => {
  const now = dayjs();
  const start = dayjs(inicio);

  if (!now.isBefore(start)) {
    return { ok: false, message: 'El turno ya comenzó o finalizó y no puede cancelarse.' };
  }

  const limite = start.subtract(toleranciaHoras, 'hour');
  if (toleranciaHoras > 0 && now.isAfter(limite)) {
    return {
      ok: false,
      message: `Las reservas solo pueden cancelarse con al menos ${toleranciaHoras} horas de anticipación.`
    };
  }

  return { ok: true };
};

module.exports = {
  validateReservationSlot,
  isReservationInProgress,
  canCancelReservation,
  dayConfigForDate,
  toMinutes,
  normalizeCloseMinutes
};
