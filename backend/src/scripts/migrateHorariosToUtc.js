'use strict';

/**
 * Migración única: convierte las horas de `horarios` que fueron guardadas en
 * hora LOCAL del club al nuevo formato UTC que espera la app.
 *
 * Ejecutar UNA sola vez tras introducir el manejo de timezone:
 *   node src/scripts/migrateHorariosToUtc.js
 *
 * Es idempotente sólo si se corre una vez; volver a correrlo desplazaría las
 * horas otra vez. Hace un dry-run salvo que se pase --apply.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Club = require('../models/Club');
const { localTimeToUtc, DEFAULT_TZ } = require('../utils/timezone');

const apply = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const clubs = await Club.find();

  for (const club of clubs) {
    if (!club.horarios) continue;
    const tz = club.timezone || DEFAULT_TZ;
    const h = club.horarios;
    const changes = [];

    for (const day of Object.keys(h.semanal || {})) {
      const d = h.semanal[day];
      const ni = localTimeToUtc(d.horaInicio, tz);
      const nf = localTimeToUtc(d.horaFin, tz);
      changes.push(`${day}: ${d.horaInicio}->${ni} / ${d.horaFin}->${nf}`);
      d.horaInicio = ni;
      d.horaFin = nf;
    }

    (h.diasEspeciales || []).forEach((dia) => {
      if (dia.horaInicio) dia.horaInicio = localTimeToUtc(dia.horaInicio, tz, dia.fecha);
      if (dia.horaFin) dia.horaFin = localTimeToUtc(dia.horaFin, tz, dia.fecha);
    });

    console.log(`\n[${club.nombre}] tz=${tz}`);
    changes.forEach((c) => console.log('  ' + c));

    if (apply) {
      club.markModified('horarios');
      await club.save();
      console.log('  -> guardado');
    }
  }

  if (!apply) console.log('\n(dry-run) Pasá --apply para guardar los cambios.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
