'use strict';

// Reemplaza el índice viejo `googleId_1` (unique + sparse) por el parcial que
// declara el schema.
//
//   npm run fix:googleid -- --dry   → sólo muestra qué haría
//   npm run fix:googleid            → aplica el cambio
//
// Por qué: `sparse` saltea los documentos donde el campo está AUSENTE, pero un
// `null` cuenta como presente. Como `User.googleId` tenía `default: null`, toda
// cuenta nueva nacía con un null, la primera se quedaba con el único lugar del
// índice y **la siguiente registración fallaba** con "Ya existe un registro con
// ese googleId" — o sea, el alta de jugadores dejaba de funcionar en cuanto
// existía una cuenta sin Google.
//
// El índice nuevo (`partialFilterExpression: { googleId: { $type: 'string' } }`)
// indexa sólo las cuentas que tienen un googleId real, así que los nulls no
// chocan nunca y dos cuentas de Google con el mismo id siguen sin poder
// coexistir, que es lo único que este índice tiene que impedir.
//
// Es idempotente: si el índice viejo no está (en una base donde nunca se pudo
// construir por tener nulls duplicados) no hace nada y sólo crea el nuevo.

require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const dryRun = process.argv.includes('--dry');

const VIEJO = 'googleId_1';

const run = async () => {
  await connectDB();

  const coleccion = mongoose.connection.db.collection('users');
  const indices = await coleccion.indexes();
  const viejo = indices.find((i) => i.name === VIEJO && !i.partialFilterExpression);

  const conNull = await coleccion.countDocuments({ googleId: { $type: 'null' } });
  const conGoogle = await coleccion.countDocuments({ googleId: { $type: 'string' } });
  console.log(`Usuarios con googleId real: ${conGoogle} · con null: ${conNull}`);

  if (!viejo) {
    console.log(`El índice viejo "${VIEJO}" no existe (nada que borrar).`);
  } else if (dryRun) {
    console.log(`[dry] Se borraría el índice "${VIEJO}".`);
  } else {
    await coleccion.dropIndex(VIEJO);
    console.log(`Índice "${VIEJO}" borrado.`);
  }

  if (dryRun) {
    console.log('[dry] Se crearía el índice parcial sobre googleId.');
  } else {
    // `syncIndexes` no se usa a propósito: borraría cualquier otro índice que
    // esté en la base y no en el schema, que no es lo que esta migración vino a
    // hacer.
    await User.createIndexes();
    console.log('Índice parcial creado.');
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Falló la migración del índice de googleId:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
