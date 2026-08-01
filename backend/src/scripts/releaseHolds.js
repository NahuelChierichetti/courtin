'use strict';

// Libera a mano los horarios cuyo hold de pago venció.
//
//   npm run jobs:holds
//
// En local `JOBS_ENABLED=false` apaga los crons, así que este es el modo de
// probar la expiración sin esperar: forzá `expiraEn` al pasado en una reserva
// pendiente y corré esto.

require('dotenv').config();

const connectDB = require('../config/db');
const { runReservationHolds } = require('../jobs/reservationHolds');

const run = async () => {
  await connectDB();

  const stats = await runReservationHolds();

  console.log(`  revisadas: ${stats.revisadas}`);
  console.log(`  liberadas: ${stats.liberadas}`);

  process.exit(0);
};

run();
