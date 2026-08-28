'use strict';

// Backfill de `Club.deportes` para los complejos que ya existen.
//
//   npm run migrate:deportes -- --dry     → sólo muestra qué haría
//   npm run migrate:deportes              → aplica los cambios
//
// Los deportes habilitados son un campo nuevo del club: antes el panel asumía
// que todos los complejos hacían pádel, tenis y fútbol. El default del schema
// sólo alcanza a los clubes que se creen de ahora en más, así que a los que ya
// están hay que escribírselo.
//
// Criterio: los deportes que el club REALMENTE usa, deducidos de sus canchas
// cargadas. Si no tiene ninguna cancha, quedan los tres por defecto. Deducirlo
// de las canchas y no poner el default a todos evita que un complejo de pádel
// aparezca ofreciendo fútbol el día uno.
//
// Es idempotente: correrlo dos veces no cambia nada la segunda.

require('dotenv').config();

// Aborta si la URI y la intención no coinciden (ver utils/scriptTarget.js).
const { confirmarDestino } = require('../utils/scriptTarget');

confirmarDestino('npm run migrate:deportes');

const connectDB = require('../config/db');
const Club = require('../models/Club');
const Court = require('../models/Court');
const { SPORT_KEYS, DEFAULT_CLUB_SPORTS, sportLabel } = require('../config/sports');

const dryRun = process.argv.includes('--dry');

const mismos = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const run = async () => {
  await connectDB();

  // Incluye los borrados lógicamente: si mañana se reestablece uno, tiene que
  // venir con sus deportes puestos.
  //
  // `lean()` no es por performance: sin él Mongoose le aplica el default del
  // schema a los documentos que no tienen el campo guardado y la migración cree
  // que ya están todos migrados.
  const clubs = await Club.find()
    .setOptions({ withDeleted: true })
    .select('nombre deportes')
    .lean();

  if (clubs.length === 0) {
    console.log('No hay complejos. Nada que migrar.');
    process.exit(0);
  }

  const cambios = [];

  for (const club of clubs) {
    // Las canchas borradas también cuentan: si el club tenía una cancha de
    // tenis y la borró, sigue siendo un complejo con tenis habilitado.
    const tipos = await Court.find({ club: club._id })
      .setOptions({ withDeleted: true })
      .distinct('tipo');

    const delCatalogo = SPORT_KEYS.filter((key) => tipos.includes(key));
    const deportes = delCatalogo.length ? delCatalogo : [...DEFAULT_CLUB_SPORTS];

    const actuales = club.deportes || [];
    if (!mismos(actuales, deportes)) {
      cambios.push({ club, deportes, origen: delCatalogo.length ? 'canchas' : 'default' });
    }
  }

  console.log(`Complejos revisados: ${clubs.length}`);
  console.log(`A migrar: ${cambios.length}\n`);

  if (cambios.length === 0) {
    console.log('Todos los complejos ya tienen sus deportes habilitados.');
    process.exit(0);
  }

  for (const { club, deportes, origen } of cambios) {
    const antes = (club.deportes || []).map(sportLabel).join(', ') || '(vacío)';
    const despues = deportes.map(sportLabel).join(', ');
    console.log(`  ${club.nombre}: ${antes} → ${despues}  (por ${origen})`);
  }

  if (dryRun) {
    console.log('\n--dry: no se aplicó ningún cambio.');
    process.exit(0);
  }

  for (const { club, deportes } of cambios) {
    await Club.updateOne({ _id: club._id }, { deportes });
  }

  console.log(`\n✅ Migrados: ${cambios.length}`);
  process.exit(0);
};

run();
