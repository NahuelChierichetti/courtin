const cron = require('node-cron');

const { runReservationReminders } = require('./reservationReminders');

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

const registeredJobs = [];

const logStats = (nombre, stats) => {
  // Sólo se loguea si hubo algo que hacer: con esta frecuencia, loguear cada
  // corrida vacía tapa el resto de los logs.
  if (stats.candidatos === 0) return;
  // eslint-disable-next-line no-console
  console.log(
    `[jobs] ${nombre}: ${stats.candidatos} candidatos · ${stats.enviados} enviados · ${stats.omitidos} omitidos · ${stats.fallidos} fallidos`
  );
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

  // eslint-disable-next-line no-console
  console.log(`[jobs] Recordatorios 24h programados (${RESERVATION_REMINDERS_CRON}).`);
};

const stopJobs = () => {
  registeredJobs.forEach((job) => job.stop());
  registeredJobs.length = 0;
};

module.exports = { startJobs, stopJobs };
