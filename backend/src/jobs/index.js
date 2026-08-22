const cron = require('node-cron');

const { runReservationReminders } = require('./reservationReminders');
const { runSubscriptionCycle } = require('./subscriptionDunning');
const { runReservationHolds } = require('./reservationHolds');
const { runRecurringBookings } = require('./recurringBookings');

// Tareas programadas del backend.
//
// Corren dentro del proceso web (node-cron) y no como servicio aparte. Dos
// consecuencias a tener presentes:
//
//  • Si el proceso está dormido o caído, la corrida no ocurre. Por eso las
//    tareas usan ventanas anchas en vez de momentos exactos.
//  • Si algún día hay más de una instancia del backend, todas ejecutan lo
//    mismo. No rompe nada porque los emails van con `dedupeKey`, pero es la
//    razón por la que esa protección no es opcional.

// Cada 30 minutos. Combinado con la ventana de 2 h del recordatorio, cada
// reserva se evalúa 4 veces.
const RESERVATION_REMINDERS_CRON = '*/30 * * * *';

// Una vez por día, a las 9 de la mañana hora argentina. Nada del ciclo de
// suscripciones depende de la hora exacta; se elige un horario razonable para
// que los avisos de cobranza no lleguen de madrugada.
const SUBSCRIPTION_CYCLE_CRON = '0 9 * * *';

// Cada 2 minutos. Acá sí importa la frecuencia y no una ventana ancha: lo que
// se libera es un horario que alguien más puede querer reservar YA, y el hold
// dura 15 minutos. Correr cada 2 min hace que el turno vuelva a estar
// disponible a lo sumo dos minutos tarde.
const RESERVATION_HOLDS_CRON = '*/2 * * * *';

// Una vez por día, de madrugada. Acá no importa la latencia sino lo contrario
// que en los holds: lo que se genera está a 90 días de distancia, así que
// llegar un día tarde no le cambia nada a nadie. Lo que sí importa es que la
// corrida no se saltee en silencio, por eso los conflictos avisan al complejo.
const RECURRING_BOOKINGS_CRON = '15 4 * * *';

const registeredJobs = [];

const logStats = (nombre, stats) => {
  // Sólo se loguea si hubo algo que hacer: con esta frecuencia, loguear cada
  // corrida vacía tapa el resto de los logs.
  const hizoAlgo = Object.entries(stats).some(([k, v]) => k !== 'revisadas' && v > 0);
  if (!hizoAlgo) return;

  const detalle = Object.entries(stats)
    .map(([k, v]) => `${v} ${k}`)
    .join(' · ');
  // eslint-disable-next-line no-console
  console.log(`[jobs] ${nombre}: ${detalle}`);
};

// Envuelve la tarea para que un error nunca tumbe el proceso web.
const safeRun = (nombre, fn) => async () => {
  try {
    const stats = await fn();
    logStats(nombre, stats);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[jobs] ${nombre} falló:`, err.message);
  }
};

const startJobs = () => {
  if (process.env.JOBS_ENABLED === 'false') {
    // eslint-disable-next-line no-console
    console.log('[jobs] Deshabilitados (JOBS_ENABLED=false).');
    return;
  }

  const reminders = cron.schedule(
    RESERVATION_REMINDERS_CRON,
    safeRun('recordatorios 24h', runReservationReminders),
    // Zona fija para que la expresión signifique lo mismo en local y en el
    // servidor. Igual la ventana se calcula en instantes absolutos, así que el
    // horario del servidor no altera a quién le llega el recordatorio.
    { timezone: 'America/Argentina/Buenos_Aires' }
  );

  registeredJobs.push(reminders);

  const suscripciones = cron.schedule(
    SUBSCRIPTION_CYCLE_CRON,
    safeRun('ciclo de suscripciones', runSubscriptionCycle),
    { timezone: 'America/Argentina/Buenos_Aires' }
  );

  registeredJobs.push(suscripciones);

  const holds = cron.schedule(
    RESERVATION_HOLDS_CRON,
    safeRun('holds vencidos', runReservationHolds),
    { timezone: 'America/Argentina/Buenos_Aires' }
  );

  registeredJobs.push(holds);

  const fijos = cron.schedule(
    RECURRING_BOOKINGS_CRON,
    safeRun('turnos fijos', runRecurringBookings),
    { timezone: 'America/Argentina/Buenos_Aires' }
  );

  registeredJobs.push(fijos);

  // eslint-disable-next-line no-console
  console.log(
    `[jobs] Recordatorios 24h (${RESERVATION_REMINDERS_CRON}) · Ciclo de suscripciones (${SUBSCRIPTION_CYCLE_CRON}) · Holds de pago (${RESERVATION_HOLDS_CRON}) · Turnos fijos (${RECURRING_BOOKINGS_CRON}).`
  );
};

const stopJobs = () => {
  registeredJobs.forEach((job) => job.stop());
  registeredJobs.length = 0;
};

module.exports = { startJobs, stopJobs };
