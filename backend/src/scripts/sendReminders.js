'use strict';

// Corre el recordatorio de 24 h una sola vez, a mano.
//
//   npm run jobs:reminders
//
// Sirve para probarlo sin esperar al cron, y como salida de emergencia si el
// proceso web estuvo caído durante la ventana.

require('dotenv').config();

const connectDB = require('../config/db');
const {
  runReservationReminders,
  VENTANA_DESDE_HORAS,
  VENTANA_HASTA_HORAS
} = require('../jobs/reservationReminders');

const run = async () => {
  await connectDB();

  console.log(`Buscando turnos que empiezan en ${VENTANA_DESDE_HORAS}-${VENTANA_HASTA_HORAS} h...`);

  const stats = await runReservationReminders();

  console.log(`  candidatos: ${stats.candidatos}`);
  console.log(`  enviados:   ${stats.enviados}`);
  console.log(`  omitidos:   ${stats.omitidos}  (sin email, o ya enviado)`);
  console.log(`  fallidos:   ${stats.fallidos}`);

  process.exit(0);
};

run();
