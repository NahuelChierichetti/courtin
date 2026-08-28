'use strict';

// Repara las facturas que se emitieron ya vencidas.
//
//   npm run fix:facturas -- --dry     → sólo muestra qué haría
//   npm run fix:facturas              → aplica los cambios
//
// Antes de este arreglo, `emitirFactura` copiaba el vencimiento del fin del
// trial (o de la vigencia) sin mirar si esa fecha ya había pasado. Una factura
// emitida tarde nacía vencida: el complejo recibía "tu factura está lista" y el
// reclamo de cobranza el mismo día, sin haber tenido nunca plazo para pagar, y
// la escalera de avisos le saltaba directo al aviso de despublicación.
//
// El código nuevo ya no las emite así (`DIAS_GRACIA_EMISION`), pero las que
// están en la base siguen contando mora desde una fecha que el complejo nunca
// pudo cumplir. Este script les da el plazo que les correspondía, contado desde
// hoy, y recalcula el estado del club por si ya lo habían despublicado.
//
// Toca SÓLO las facturas abiertas cuyo vencimiento es anterior a su propia
// emisión: ésas son, por definición, las que nacieron vencidas. Una factura que
// venció porque el complejo no pagó no se toca — esa mora es real.

require('dotenv').config();

// Aborta si la URI y la intención no coinciden (ver utils/scriptTarget.js).
const { confirmarDestino } = require('../utils/scriptTarget');

confirmarDestino('npm run fix:facturas');

const connectDB = require('../config/db');
const Club = require('../models/Club');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const EmailLog = require('../models/EmailLog');
const { sincronizarEstado, DIAS_GRACIA_EMISION, formatPeriodo, formatFecha } = require('../utils/billing');

const dryRun = process.argv.includes('--dry');

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const finDelDia = (fecha) => {
  const d = new Date(fecha);
  d.setUTCHours(23, 59, 59, 999);
  return d;
};

const run = async () => {
  await connectDB();

  const abiertas = await Invoice.find({ estado: { $in: ['pendiente', 'vencida'] } }).populate('club', 'nombre estado');

  // Nacida vencida: el vencimiento es anterior al momento en que se creó.
  const rotas = abiertas.filter((inv) => inv.vencimiento < inv.createdAt);

  if (rotas.length === 0) {
    console.log('No hay facturas emitidas ya vencidas. Nada que hacer.');
    return;
  }

  const nuevoVencimiento = finDelDia(new Date(Date.now() + DIAS_GRACIA_EMISION * MS_POR_DIA));

  console.log(`${rotas.length} factura(s) nacieron vencidas.`);
  console.log(`Nuevo vencimiento: ${formatFecha(nuevoVencimiento)}\n`);

  for (const inv of rotas) {
    const nombre = inv.club?.nombre || inv.club;
    console.log(
      `  ${nombre} · ${formatPeriodo(inv.periodo)} · vencía ${formatFecha(inv.vencimiento)} ` +
        `(emitida ${formatFecha(inv.createdAt)}) · estado del club: ${inv.club?.estado}`
    );

    if (dryRun) continue;

    inv.vencimiento = nuevoVencimiento;
    inv.estado = 'pendiente';
    await inv.save();

    // Los avisos de cobranza que ya salieron sobre esta factura fueron
    // indebidos, y su `dedupeKey` bloquearía los legítimos cuando la escalera
    // vuelva a correr desde el vencimiento nuevo. Se borran para que el complejo
    // reciba los avisos que le corresponden, en orden y a tiempo.
    const borrados = await EmailLog.deleteMany({
      dedupeKey: { $regex: `^deuda:${inv._id}:` }
    });
    if (borrados.deletedCount) {
      console.log(`    → ${borrados.deletedCount} aviso(s) de cobranza previos descartados`);
    }

    // El club pudo haber quedado impago o suspendido por esta mora falsa.
    const club = await Club.findById(inv.club?._id || inv.club);
    const subscription = await Subscription.findOne({ club: club._id });
    if (club && subscription) {
      const estado = await sincronizarEstado(club, subscription);
      console.log(`    → estado recalculado: ${estado}`);
    }
  }

  console.log(dryRun ? '\n(dry run: no se cambió nada)' : '\nListo.');
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
