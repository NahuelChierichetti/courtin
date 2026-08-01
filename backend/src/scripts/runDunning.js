'use strict';

// Corre el ciclo de suscripciones una vez, a mano.
//
//   npm run jobs:dunning
//
// Sirve para probarlo sin esperar al cron de las 9, y como salida de emergencia
// si el proceso web estuvo caído.

require('dotenv').config();

const connectDB = require('../config/db');
const { runSubscriptionCycle } = require('../jobs/subscriptionDunning');

const run = async () => {
  await connectDB();

  console.log('Recorriendo suscripciones...\n');

  const stats = await runSubscriptionCycle();

  console.log(`  complejos revisados     : ${stats.revisadas}`);
  console.log(`  suscripciones creadas   : ${stats.suscripcionesCreadas}`);
  console.log(`  facturas emitidas       : ${stats.facturasEmitidas}`);
  console.log(`  facturas marcadas vencidas: ${stats.facturasVencidas}`);
  console.log(`  cambios de estado       : ${stats.cambiosDeEstado}`);
  console.log(`  avisos de trial         : ${stats.avisosTrial}`);
  console.log(`  avisos de deuda         : ${stats.avisosDeuda}`);

  if (stats.sinDestinatario > 0) {
    console.log(`\n  ⚠️  ${stats.sinDestinatario} complejo(s) sin email configurado: no recibieron el aviso.`);
  }

  process.exit(0);
};

run();
