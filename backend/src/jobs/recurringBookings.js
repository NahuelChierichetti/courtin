const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

const RecurringBooking = require('../models/RecurringBooking');
const Club = require('../models/Club');
const Court = require('../models/Court');
const { materializeRule, HORIZON_DAYS } = require('../utils/recurring');
const { notify } = require('../utils/notifications');
const { formatInstant } = require('../utils/timezone');

// Mantiene el horizonte de los turnos fijos siempre lleno.
//
// La idea entera del feature está acá: la regla (`RecurringBooking`) no vence
// nunca, y este job garantiza que SIEMPRE haya 90 días de reservas generadas
// por delante. No es "genero 90 días y en 3 meses se acaba": la ventana se
// corre sola todos los días, así que un turno fijo sobrevive sin que nadie lo
// renueve. Ver docs/turnos-fijos.md.
//
// Un turno fijo se libera de UNA sola forma: alguien lo da de baja a mano. El
// silencio nunca libera nada.

// Estados en los que NO se materializa. Un complejo cancelado o rechazado no
// tiene por qué seguir generando turnos.
//
// `impago` no está en la lista a propósito: la degradación por falta de pago
// frena la carga de turnos NUEVOS, pero un turno fijo ya comprometido no es
// nuevo. Cortarlo castigaría al cliente fiel del complejo por una deuda que no
// es suya, que es exactamente lo que este feature existe para evitar.
const CLUB_ESTADOS_SIN_MATERIALIZAR = ['cancelado', 'rechazado', 'pendiente'];

const MOTIVOS = {
  ocupado: 'el horario ya está ocupado por otra reserva',
  cerrado: 'el complejo está cerrado ese día',
  fuera_de_horario: 'queda fuera del horario de atención'
};

// Aviso al complejo por los conflictos NUEVOS. Los que ya venían de corridas
// anteriores no se repiten: una notificación diaria por el mismo problema se
// vuelve ruido y se deja de leer, que es justo lo que no queremos acá.
const avisarConflictos = async (rule, nuevos, tz) => {
  if (nuevos.length === 0) return;

  const quien = rule.guestName || 'el turno fijo';
  const fechas = nuevos.slice(0, 3).map((c) => formatInstant(c.fecha, tz)).join(', ');
  const resto = nuevos.length > 3 ? ` y ${nuevos.length - 3} más` : '';

  await notify(rule.club, {
    tipo: 'sistema',
    titulo: 'Un turno fijo no se pudo generar',
    mensaje: `${quien}: ${fechas}${resto} — ${MOTIVOS[nuevos[0].motivo]}. Revisalo para que no pierda el horario.`
  });
};

/**
 * Materializa todas las reglas activas hasta el horizonte.
 *
 * Aislado por regla: un error en una no puede frenar las demás. Idempotente:
 * correrlo dos veces el mismo día no genera nada nuevo.
 *
 * @returns {Promise<{revisadas:number, creadas:number, conflictos:number, saltadas:number, fallidas:number}>}
 */
const runRecurringBookings = async (ahora = new Date()) => {
  const stats = { revisadas: 0, creadas: 0, conflictos: 0, saltadas: 0, fallidas: 0 };

  const reglas = await RecurringBooking.find({ estado: 'activo' });
  stats.revisadas = reglas.length;
  if (reglas.length === 0) return stats;

  // Un club se comparte entre todas sus reglas: se trae una sola vez.
  const clubes = new Map();
  const getClub = async (id) => {
    const key = id.toString();
    if (!clubes.has(key)) clubes.set(key, await Club.findById(id).select('nombre estado timezone horarios'));
    return clubes.get(key);
  };

  for (const rule of reglas) {
    try {
      const club = await getClub(rule.club);

      // El club se borró (soft delete) o no está en condiciones de operar.
      if (!club || CLUB_ESTADOS_SIN_MATERIALIZAR.includes(club.estado)) {
        stats.saltadas += 1;
        continue;
      }

      // La cancha se borró. No se finaliza la regla automáticamente: dar de
      // baja un turno fijo es una decisión de una persona, nunca un efecto
      // secundario de otra cosa. Queda visible en el panel para que la resuelvan.
      const court = await Court.findById(rule.court).select('_id');
      if (!court) {
        stats.saltadas += 1;
        continue;
      }

      const res = await materializeRule(rule, club, { ahora });
      stats.creadas += res.creadas;
      stats.conflictos += res.conflictos.length;

      await avisarConflictos(rule, res.nuevosConflictos, club.timezone);
    } catch (err) {
      stats.fallidas += 1;
      // eslint-disable-next-line no-console
      console.error(`[jobs] turno fijo ${rule._id} falló:`, err.message);
    }
  }

  return stats;
};

module.exports = { runRecurringBookings, HORIZON_DAYS };
