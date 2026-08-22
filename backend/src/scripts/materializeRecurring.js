'use strict';

// Materializa a mano el horizonte de los turnos fijos.
//
//   npm run jobs:recurring
//
// En local `JOBS_ENABLED=false` apaga los crons, así que este es el modo de
// probar el motor sin esperar a la madrugada. Es idempotente: correrlo dos
// veces seguidas no genera nada la segunda vez, y eso mismo es lo que conviene
// verificar al probarlo.

require('dotenv').config();

const connectDB = require('../config/db');
const { runRecurringBookings, HORIZON_DAYS } = require('../jobs/recurringBookings');

const run = async () => {
  await connectDB();

  console.log(`Horizonte: ${HORIZON_DAYS} días.`);
  const stats = await runRecurringBookings();

  console.log(`  reglas revisadas: ${stats.revisadas}`);
  console.log(`  reservas creadas: ${stats.creadas}`);
  console.log(`  conflictos:       ${stats.conflictos}`);
  console.log(`  saltadas:         ${stats.saltadas}`);
  console.log(`  fallidas:         ${stats.fallidas}`);

  process.exit(0);
};

run();
