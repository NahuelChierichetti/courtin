'use strict';

// Migra los planes viejos al esquema nuevo.
//
//   npm run migrate:planes -- --dry     → sólo muestra qué haría
//   npm run migrate:planes              → aplica los cambios
//
// El enum de `Club.plan` pasó de `starter/pro/business/enterprise` a
// `start/pro/elite`. Los documentos con los valores viejos dejan de validar y
// fallan al guardar, aunque nadie les haya tocado el plan. Hay que correr esto
// ANTES de desplegar el código nuevo.
//
// Mapeo:
//   starter    → start
//   pro        → pro
//   business   → según cuántas canchas tenga, pero nunca menos que pro
//                (era un plan superior a pro: bajarlo a start sería degradarlo)
//   enterprise → elite
//   otro/vacío → según cuántas canchas tenga
//
// Es idempotente: correrlo dos veces no cambia nada la segunda.

require('dotenv').config();

// Aborta si la URI y la intención no coinciden (ver utils/scriptTarget.js).
const { confirmarDestino } = require('../utils/scriptTarget');

confirmarDestino('npm run migrate:planes');

const connectDB = require('../config/db');
const Club = require('../models/Club');
const Court = require('../models/Court');
const { PLAN_KEYS, planParaCanchas, excedeLimite, limiteCanchas } = require('../config/plans');

const dryRun = process.argv.includes('--dry');

// Orden de menor a mayor, para poder comparar planes.
const rango = (plan) => PLAN_KEYS.indexOf(plan);
const elMayor = (a, b) => (rango(a) >= rango(b) ? a : b);

const resolverPlan = (planViejo, cantidadCanchas) => {
  const porCanchas = planParaCanchas(cantidadCanchas);

  switch (planViejo) {
    case 'starter':
      return 'start';
    case 'pro':
      return 'pro';
    case 'business':
      // Nunca por debajo de pro: era un escalón por encima.
      return elMayor(porCanchas, 'pro');
    case 'enterprise':
      return 'elite';
    default:
      // Ya migrado, vacío o desconocido: se resuelve por el tamaño real.
      return PLAN_KEYS.includes(planViejo) ? planViejo : porCanchas;
  }
};

// Los planes viejos no tenían límite de canchas, así que un club puede quedar
// por encima del tope de su plan nuevo. NO se lo sube de plan automáticamente:
// sería cobrarle más sin que lo haya aceptado. Queda como está, sin poder crear
// canchas nuevas, y esta lista es a quiénes hay que llamar para ofrecerles el
// upgrade.
const reportarExcedidos = (excedidos) => {
  if (excedidos.length === 0) return;

  console.log(`\n⚠️  ${excedidos.length} complejo(s) superan el límite de su plan:`);
  for (const { club, canchas, planNuevo } of excedidos) {
    console.log(
      `     ${club.nombre}: ${canchas} canchas en plan ${planNuevo} (tope ${limiteCanchas(planNuevo)}) → le corresponde ${planParaCanchas(canchas)}`
    );
  }
  console.log('     No se les borra ninguna cancha; sólo no pueden crear nuevas.');
};

const run = async () => {
  await connectDB();

  // Incluye los borrados lógicamente: si quedan con un plan inválido, cualquier
  // operación futura sobre ellos falla.
  const clubs = await Club.find().setOptions({ withDeleted: true }).select('nombre plan');

  if (clubs.length === 0) {
    console.log('No hay complejos. Nada que migrar.');
    process.exit(0);
  }

  const cambios = [];
  // Clubes que, con su plan nuevo, quedan por encima del límite de canchas.
  const excedidos = [];

  for (const club of clubs) {
    const canchas = await Court.countDocuments({ club: club._id });
    const planNuevo = resolverPlan(club.plan, canchas);

    if (planNuevo !== club.plan) {
      cambios.push({ club, canchas, planNuevo });
    }

    if (excedeLimite(planNuevo, canchas)) {
      excedidos.push({ club, canchas, planNuevo });
    }
  }

  console.log(`Complejos revisados: ${clubs.length}`);
  console.log(`A migrar: ${cambios.length}\n`);

  if (cambios.length === 0) {
    console.log('Todos los planes ya están en el esquema nuevo.');
    reportarExcedidos(excedidos);
    process.exit(0);
  }

  for (const { club, canchas, planNuevo } of cambios) {
    console.log(`  ${club.nombre}: ${club.plan || '(vacío)'} → ${planNuevo}  (${canchas} canchas)`);
  }

  if (dryRun) {
    reportarExcedidos(excedidos);
    console.log('\n--dry: no se aplicó ningún cambio.');
    process.exit(0);
  }

  // updateOne y no save(): el documento en memoria todavía tiene el plan viejo,
  // que ya no pasa la validación del enum nuevo.
  for (const { club, planNuevo } of cambios) {
    await Club.updateOne({ _id: club._id }, { plan: planNuevo });
  }

  console.log(`\n✅ Migrados: ${cambios.length}`);
  reportarExcedidos(excedidos);
  process.exit(0);
};

run();
