'use strict';

// Marca como verificadas las cuentas anteriores a esta funcionalidad.
//
//   npm run users:grandfather
//
// Sin esto, todas las cuentas que ya existían quedan en "email sin confirmar" y
// arrastran el aviso para siempre, aunque nunca hayan tenido la chance de
// confirmarlo. Se corre UNA vez al desplegar la verificación.
//
// Sólo alcanza a los usuarios creados antes de ejecutarlo: los que se registren
// después pasan por el circuito normal.

require('dotenv').config();

const connectDB = require('../config/db');
const User = require('../models/User');

const run = async () => {
  await connectDB();

  const corte = new Date();

  const pendientes = await User.countDocuments({
    emailVerifiedAt: null,
    createdAt: { $lt: corte }
  });

  if (pendientes === 0) {
    console.log('No hay cuentas previas sin verificar. Nada que hacer.');
    process.exit(0);
  }

  const result = await User.updateMany(
    { emailVerifiedAt: null, createdAt: { $lt: corte } },
    { emailVerifiedAt: corte }
  );

  console.log(`Cuentas marcadas como verificadas: ${result.modifiedCount}`);
  process.exit(0);
};

run();
