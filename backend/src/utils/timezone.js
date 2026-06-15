const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const DEFAULT_TZ = 'America/Argentina/Buenos_Aires';
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Fecha de referencia (YYYY-MM-DD) para calcular el offset correcto (DST).
// Para horarios semanales no hay una fecha puntual, usamos "hoy".
const refDateStr = (refDate) => {
  if (refDate) return dayjs.utc(refDate).format('YYYY-MM-DD');
  return dayjs.utc().format('YYYY-MM-DD');
};

// Hora local del club (HH:MM) -> hora UTC (HH:MM) para guardar en DB.
const localTimeToUtc = (hhmm, tz = DEFAULT_TZ, refDate = null) => {
  if (!hhmm || !HHMM.test(hhmm)) return hhmm;
  const local = dayjs.tz(`${refDateStr(refDate)} ${hhmm}`, 'YYYY-MM-DD HH:mm', tz);
  return local.utc().format('HH:mm');
};

// Hora UTC almacenada (HH:MM) -> hora local del club (HH:MM) para la API.
const utcTimeToLocal = (hhmm, tz = DEFAULT_TZ, refDate = null) => {
  if (!hhmm || !HHMM.test(hhmm)) return hhmm;
  const inUtc = dayjs.utc(`${refDateStr(refDate)} ${hhmm}`, 'YYYY-MM-DD HH:mm');
  return inUtc.tz(tz).format('HH:mm');
};

// Convierte las horas de un objeto horarios entre UTC y la zona del club.
// convert: (hhmm, refDate) => hhmm
const mapHorariosTimes = (horarios, convert) => {
  const out = {
    semanal: {},
    diasEspeciales: [],
    reservas: horarios.reservas
  };

  const semanal = horarios.semanal || {};
  for (const day of Object.keys(semanal)) {
    const d = semanal[day];
    out.semanal[day] = {
      ...d,
      horaInicio: convert(d.horaInicio, null),
      horaFin: convert(d.horaFin, null)
    };
  }

  out.diasEspeciales = (horarios.diasEspeciales || []).map((dia) => ({
    ...dia,
    horaInicio: dia.horaInicio ? convert(dia.horaInicio, dia.fecha) : dia.horaInicio,
    horaFin: dia.horaFin ? convert(dia.horaFin, dia.fecha) : dia.horaFin
  }));

  return out;
};

// UTC almacenado -> local del club (para respuestas de la API).
const horariosToLocal = (horarios, tz = DEFAULT_TZ) =>
  mapHorariosTimes(horarios, (hhmm, refDate) => utcTimeToLocal(hhmm, tz, refDate));

// Local del club -> UTC (para guardar en DB).
const horariosToUtc = (horarios, tz = DEFAULT_TZ) =>
  mapHorariosTimes(horarios, (hhmm, refDate) => localTimeToUtc(hhmm, tz, refDate));

module.exports = {
  DEFAULT_TZ,
  localTimeToUtc,
  utcTimeToLocal,
  horariosToLocal,
  horariosToUtc
};
