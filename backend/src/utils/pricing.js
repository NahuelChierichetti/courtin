// Cálculo de precio sugerido de una cancha según día/horario (espejo de la
// lógica del frontend en utils/turnos.js). Se usa en el flujo público para
// fijar el precio en el servidor y no confiar en el valor que manda el cliente.

const { toMinutes, normalizeCloseMinutes } = require('./reservationRules');

const isWeekday = (dow) => dow >= 1 && dow <= 5; // lun-vie
const isWeekend = (dow) => dow === 0 || dow === 6;

// Códigos de día canónicos. Índice = dow (0=Dom..6=Sáb).
const DAY_CODES = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
const CODE_SET = new Set(DAY_CODES);

// ¿Aplica una tarifa a un día de la semana (0=Dom..6=Sáb)?
// Soporta el formato canónico ("lun,mar,mie,...") y, por compatibilidad, los
// combos legacy ("Lun a Vie", "Finde", "Lun a Dom", etc.).
const tarifaMatchesDay = (diasRaw, dow) => {
  const dias = (diasRaw || '').toLowerCase().trim();
  if (!dias) return true;

  // Formato canónico: lista de códigos separados por coma.
  const tokens = dias.split(',').map((s) => s.trim()).filter(Boolean);
  if (tokens.length && tokens.every((t) => CODE_SET.has(t))) {
    return tokens.includes(DAY_CODES[dow]);
  }

  // Legacy (datos previos / seed).
  if (dias.includes('lun a dom')) return true;
  if (dias.includes('lun a sab') && dow >= 1) return true;
  if ((dias.includes('lun a vie') || dias.includes('lun-vie')) && isWeekday(dow)) return true;
  if (dias.includes('finde') && isWeekend(dow)) return true;
  if (dias.includes('feriado')) return false;
  if (dias.includes('dom') && dow === 0) return true;
  if (dias.includes('sab') && dow === 6) return true;
  return false;
};

// Precio POR HORA de una cancha para un día (dow) y hora de inicio ("HH:MM").
// La tarifa configurada se interpreta como valor por hora.
const suggestedPrice = (court, dow, horaInicio) => {
  if (!court) return 0;
  const startMin = toMinutes(horaInicio);
  const tarifas = court.tarifas || [];
  const match = tarifas.find((t) => {
    const ini = toMinutes(t.horaInicio);
    const fin = normalizeCloseMinutes(t.horaFin);
    return tarifaMatchesDay(t.dias, dow) && startMin >= ini && startMin < fin;
  });
  if (match) return match.precio;
  if (tarifas.length) return Math.min(...tarifas.map((t) => t.precio));
  return court.precio || 0;
};

// Precio total del turno = precio por hora (según la franja del inicio) prorrateado
// por la duración elegida. Ej: $8.000/h en un turno de 90 min => $12.000.
const priceForDuration = (court, dow, horaInicio, durationMin) => {
  const perHour = suggestedPrice(court, dow, horaInicio);
  const mins = Number(durationMin) || (court && court.duracionTurno) || 60;
  return Math.round(perHour * (mins / 60));
};

module.exports = { suggestedPrice, priceForDuration, tarifaMatchesDay };
