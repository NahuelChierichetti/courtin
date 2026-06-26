'use strict';

/**
 * Migración única: convierte las reservas del formato viejo
 * (`fecha` + `horaInicio`/`horaFin` en hora LOCAL del club) al nuevo formato
 * basado en instantes UTC (`inicio`/`fin`).
 *
 *   node src/scripts/migrateReservationsToUtc.js          # dry-run
 *   node src/scripts/migrateReservationsToUtc.js --apply  # aplica los cambios
 *
 * Idempotente: las reservas que ya tienen `inicio`/`fin` se omiten.
 *
 * NOTA: las reservas creadas antes del arreglo de zona horaria podían guardar
 * `fecha` corrida ±1 día según el offset del servidor. El día se interpreta en
 * la tz del club; revisá el dry-run antes de aplicar.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const Club = require('../models/Club');
const Reservation = require('../models/Reservation');
const { DEFAULT_TZ } = require('../utils/timezone');

const apply = process.argv.includes('--apply');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const clubs = await Club.find().lean();
  const tzByClub = Object.fromEntries(clubs.map((c) => [String(c._id), c.timezone || DEFAULT_TZ]));

  // .lean() devuelve el documento crudo, incluyendo campos viejos fuera del schema.
  const reservations = await Reservation.find().lean();

  let migradas = 0;
  let omitidas = 0;

  for (const r of reservations) {
    if (r.inicio && r.fin) {
      omitidas += 1;
      continue;
    }
    if (!r.fecha || !r.horaInicio || !r.horaFin) {
      console.log(`  ! ${r._id} sin datos suficientes (fecha/horaInicio/horaFin) — omitida`);
      omitidas += 1;
      continue;
    }

    const tz = tzByClub[String(r.club)] || DEFAULT_TZ;
    const localDay = dayjs(r.fecha).tz(tz).format('YYYY-MM-DD');
    const inicio = dayjs.tz(`${localDay} ${r.horaInicio}`, 'YYYY-MM-DD HH:mm', tz);
    let fin = dayjs.tz(`${localDay} ${r.horaFin}`, 'YYYY-MM-DD HH:mm', tz);
    if (!fin.isAfter(inicio)) fin = fin.add(1, 'day'); // cruza medianoche

    console.log(
      `  ${r._id} [${tz}] ${localDay} ${r.horaInicio}-${r.horaFin} -> ` +
        `${inicio.utc().toISOString()} / ${fin.utc().toISOString()}`
    );

    if (apply) {
      await Reservation.collection.updateOne(
        { _id: r._id },
        {
          $set: { inicio: inicio.toDate(), fin: fin.toDate() },
          $unset: { fecha: '', horaInicio: '', horaFin: '' }
        }
      );
    }
    migradas += 1;
  }

  console.log(`\n${migradas} a migrar, ${omitidas} omitidas.`);
  if (!apply) console.log('(dry-run) Pasá --apply para guardar los cambios.');

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
