'use strict';

// Complejo de demostración: el que usamos para mostrar CourtIn en vivo.
//
//   npm run seed:demo-club              (base local)
//   npm run seed:demo-club -- --prod    (base remota; hay que pedirlo explícito)
//   npm run seed:demo-club -- --refresh (regenera turnos y caja de la semana)
//
// A diferencia de `seedDemo.js`, este script es IDEMPOTENTE y no borra nada por
// su cuenta: se puede correr contra producción y volver a correr antes de cada
// demo sin miedo. Lo que ya existe se actualiza; lo que falta se crea.
//
// Qué deja armado:
//   • Un club con `demo: true` → publicado (el link funciona y se puede
//     reservar de verdad) pero fuera del buscador y del filtro de ciudades.
//   • Un usuario dueño con acceso al panel, con el email ya verificado para que
//     no aparezca el cartel de "confirmá tu cuenta" en medio de la demo.
//   • Una suscripción con vigencia larga. NO es un detalle menor: sin
//     suscripción, el cron de dunning le pone `inactivo` al club en el primer
//     barrido y el link público deja de funcionar (ver
//     utils/subscriptions.js → estadoPorSuscripcion).
//   • Cobro en el complejo (MercadoPago sin conectar): el flujo de reserva es
//     real de punta a punta y no hay plata de por medio.
//   • Cuatro canchas, la semana de turnos y movimientos de caja, para que el
//     panel no se vea vacío.

require('dotenv').config();

const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const Club = require('../models/Club');
const Court = require('../models/Court');
const Reservation = require('../models/Reservation');
const CashMovement = require('../models/CashMovement');
const Client = require('../models/Client');
const User = require('../models/User');
const Membership = require('../models/Membership');
const Subscription = require('../models/Subscription');
const ROLES = require('../config/roles');
const { upsertClientFromReservation } = require('../utils/clients');
const { precioDe } = require('../config/plans');

const SLUG = 'demo-courtin';
const TZ = 'America/Argentina/Buenos_Aires';

// Casillas con "+demo": Gmail las entrega en courtinapp@gmail.com igual, así
// que durante la demo se puede mostrar el email de la reserva llegando de
// verdad, sin que la dirección se confunda con la cuenta real.
const OWNER_EMAIL = process.env.DEMO_CLUB_OWNER_EMAIL || 'courtinapp+demo@gmail.com';
const CLUB_EMAIL = process.env.DEMO_CLUB_EMAIL || 'courtinapp+demo@gmail.com';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const valorDe = (name) => {
  const encontrado = args.find((a) => a.startsWith(`--${name}=`));
  return encontrado ? encontrado.slice(name.length + 3) : null;
};

const uri = process.env.MONGODB_URI || '';
const isLocal = /(^|@|\/\/)(localhost|127\.0\.0\.1)(:|\/)/.test(uri);

if (!isLocal && !flag('prod')) {
  console.error('\n⛔  MONGODB_URI no apunta a una base local.');
  console.error('    Este script es seguro para producción (no borra nada), pero correrlo');
  console.error('    contra la base real tiene que ser una decisión, no un descuido.');
  console.error(`    URI actual: ${uri.replace(/\/\/[^@]*@/, '//<credenciales>@') || '(vacía)'}`);
  console.error('    Si es a propósito:  npm run seed:demo-club -- --prod\n');
  process.exit(1);
}

// Contraseña: la que pasen por argumento o env, y si no una generada. Sólo se
// escribe cuando es explícita o cuando el usuario se está creando: así volver a
// correr el script antes de una demo no invalida la que ya tenías anotada.
const passwordExplicita = valorDe('password') || process.env.DEMO_CLUB_PASSWORD || null;
const generarPassword = () => crypto.randomBytes(9).toString('base64url').slice(0, 12);

const semanalAbierto = () => {
  const dia = { abierto: true, horaInicio: '08:00', horaFin: '23:30' };
  return {
    lunes: { ...dia },
    martes: { ...dia },
    miercoles: { ...dia },
    jueves: { ...dia },
    viernes: { ...dia },
    sabado: { ...dia },
    domingo: { ...dia }
  };
};

const localToUtc = (dateKey, hhmm) =>
  dayjs.tz(`${dateKey} ${hhmm}`, 'YYYY-MM-DD HH:mm', TZ).utc().toDate();

const COURTS = [
  { nombre: 'Pádel 1', tipo: 'padel', superficie: 'Blindex', cubierta: true, duracionTurno: 90, precio: 16000 },
  { nombre: 'Pádel 2', tipo: 'padel', superficie: 'Blindex', cubierta: true, duracionTurno: 90, precio: 16000 },
  { nombre: 'Tenis Central', tipo: 'tenis', superficie: 'Polvo de ladrillo', cubierta: false, duracionTurno: 90, precio: 12000 },
  { nombre: 'Fútbol 5', tipo: 'futbol', superficie: 'Sintético', cubierta: false, jugadores: 10, duracionTurno: 60, precio: 20000 }
];

// 4 canchas ⇒ plan Pro (Start topa en 3). Ver config/plans.js.
const PLAN = 'pro';

const run = async () => {
  await mongoose.connect(uri);
  console.log(`MongoDB: ${mongoose.connection.host} / db "${mongoose.connection.name}"\n`);

  // --- Club -----------------------------------------------------------------
  const datosClub = {
    nombre: 'CourtIn Demo',
    slug: SLUG,
    descripcion:
      'Complejo de demostración de CourtIn. Las canchas y los turnos son de ejemplo: sirve para ver cómo funciona la reserva online, no para jugar.',
    direccion: 'Av. Siempreviva 742',
    ciudad: 'La Plata',
    provincia: 'Buenos Aires',
    telefono: '2216000000',
    whatsapp: '2216000000',
    email: CLUB_EMAIL,
    timezone: TZ,
    moneda: 'ARS',
    plan: PLAN,
    estado: 'activo',
    deportes: ['futbol', 'padel', 'tenis'],
    servicios: ['Estacionamiento', 'Buffet', 'Vestuarios', 'Alquiler de paletas'],
    horarios: { semanal: semanalAbierto() },
    publicado: true,
    demo: true,
    // Sin MercadoPago conectado, el jugador reserva y paga al llegar. El flujo
    // es real; lo único que no se muestra es la pasarela.
    pagos: { permitePagoEnComplejo: true }
  };

  let club = await Club.findOne({ slug: SLUG });
  if (club) {
    Object.assign(club, datosClub);
    await club.save();
    console.log('· Club actualizado.');
  } else {
    club = await Club.create(datosClub);
    console.log('· Club creado.');
  }

  // --- Dueño ----------------------------------------------------------------
  let owner = await User.findOne({ email: OWNER_EMAIL });
  let password = passwordExplicita;
  let passwordCambiada = false;

  if (!owner) {
    password = password || generarPassword();
    owner = await User.create({
      nombre: 'Demo CourtIn',
      email: OWNER_EMAIL,
      password: await bcrypt.hash(password, 10),
      telefono: '2216000000',
      estado: 'activo',
      // Verificado de entrada: el cartel de "confirmá tu email" en medio de una
      // demo distrae y no aporta nada.
      emailVerifiedAt: new Date()
    });
    passwordCambiada = true;
    console.log('· Usuario dueño creado.');
  } else {
    if (passwordExplicita) {
      owner.password = await bcrypt.hash(passwordExplicita, 10);
      passwordCambiada = true;
    }
    owner.emailVerifiedAt = owner.emailVerifiedAt || new Date();
    owner.estado = 'activo';
    await owner.save();
    console.log(`· Usuario dueño actualizado${passwordExplicita ? ' (contraseña reescrita)' : ''}.`);
  }

  const membership = await Membership.findOne({ user: owner._id, club: club._id });
  if (!membership) {
    await Membership.create({ user: owner._id, club: club._id, role: ROLES.TENANT_ADMIN });
    console.log('· Membership tenant_admin creada.');
  }

  // --- Suscripción ----------------------------------------------------------
  // Vigencia a 10 años: mantiene el club en `activo` y deja al cron de dunning
  // sin nada que emitir. Sin esto el club termina despublicado solo.
  const vigenciaHasta = dayjs().add(10, 'year').toDate();
  const datosSub = {
    plan: PLAN,
    ciclo: 'mensual',
    precio: precioDe(PLAN, 'mensual'),
    moneda: 'ARS',
    trialHasta: null,
    vigenciaHasta,
    canceladaEn: null
  };

  const sub = await Subscription.findOne({ club: club._id });
  if (sub) {
    Object.assign(sub, datosSub);
    await sub.save();
    console.log('· Suscripción actualizada (vigencia a 10 años).');
  } else {
    await Subscription.create({ club: club._id, ...datosSub });
    console.log('· Suscripción creada (vigencia a 10 años).');
  }

  // --- Canchas --------------------------------------------------------------
  const tarifa = (precio) => [
    { nombre: 'General', dias: 'lun a dom', horaInicio: '08:00', horaFin: '23:59', precio }
  ];

  const courts = [];
  for (const c of COURTS) {
    const datos = {
      ...c,
      club: club._id,
      estado: 'activa',
      visible: true,
      tarifas: tarifa(c.precio)
    };
    const existente = await Court.findOne({ club: club._id, nombre: c.nombre });
    if (existente) {
      Object.assign(existente, datos);
      await existente.save();
      courts.push(existente);
    } else {
      courts.push(await Court.create(datos));
    }
  }
  console.log(`· Canchas al día (${courts.length}).`);

  const byName = Object.fromEntries(courts.map((c) => [c.nombre, c]));

  // --- Turnos y caja de ejemplo ---------------------------------------------
  // Se regeneran con --refresh o cuando el club todavía no tiene reservas. Los
  // turnos son relativos a hoy, así que una demo hecha dos meses después de
  // cargar esto mostraría una grilla vacía si no se refresca.
  const yaTieneReservas = await Reservation.exists({ club: club._id });

  if (flag('refresh') || !yaTieneReservas) {
    const borradas = await Reservation.deleteMany({ club: club._id });
    await CashMovement.deleteMany({ club: club._id });
    await Client.deleteMany({ club: club._id });
    if (borradas.deletedCount) console.log(`· Datos de ejemplo anteriores borrados (${borradas.deletedCount} turnos).`);

    const hoy = dayjs().tz(TZ).format('YYYY-MM-DD');
    const enDias = (d) => dayjs().tz(TZ).add(d, 'day').format('YYYY-MM-DD');
    const hace = (d) => dayjs().tz(TZ).subtract(d, 'day').format('YYYY-MM-DD');

    const JUAN = { name: 'Juan Pérez', email: 'juan.perez@example.com', phone: '2216001001' };
    const ANA = { name: 'Ana Gómez', email: 'ana.gomez@example.com', phone: '2216001002' };
    const CARLOS = { name: 'Carlos Ruiz', email: 'carlos.ruiz@example.com', phone: '2216001003' };
    const PIBES = { name: 'Los Pibes FC', email: 'pibes.fc@example.com', phone: '2216001004' };

    // Se deja libre la franja de la tarde de hoy y de mañana: es donde se hace
    // la reserva en vivo durante la demo.
    const reservas = [
      { court: byName['Pádel 1'], date: hoy, ini: '09:00', fin: '10:30', g: JUAN },
      { court: byName['Pádel 2'], date: hoy, ini: '10:30', fin: '12:00', g: ANA },
      { court: byName['Fútbol 5'], date: hoy, ini: '22:00', fin: '23:00', g: PIBES },
      { court: byName['Pádel 1'], date: enDias(1), ini: '21:30', fin: '23:00', g: CARLOS },
      { court: byName['Tenis Central'], date: enDias(2), ini: '09:00', fin: '10:30', g: ANA },
      { court: byName['Fútbol 5'], date: enDias(3), ini: '21:00', fin: '22:00', g: PIBES },
      // Pasadas: dan clientes recurrentes y llenan los reportes.
      { court: byName['Pádel 1'], date: hace(6), ini: '19:00', fin: '20:30', g: JUAN, estado: 'completada' },
      { court: byName['Pádel 2'], date: hace(9), ini: '18:00', fin: '19:30', g: JUAN, estado: 'completada' },
      { court: byName['Tenis Central'], date: hace(3), ini: '10:00', fin: '11:30', g: ANA, estado: 'completada' },
      { court: byName['Fútbol 5'], date: hace(2), ini: '21:00', fin: '22:00', g: PIBES, estado: 'completada' }
    ];

    for (const r of reservas) {
      const reservation = await Reservation.create({
        club: club._id,
        court: r.court._id,
        guestName: r.g.name,
        guestPhone: r.g.phone,
        guestEmail: r.g.email,
        inicio: localToUtc(r.date, r.ini),
        fin: localToUtc(r.date, r.fin),
        estado: r.estado || 'confirmada',
        precioFinal: r.court.precio,
        origen: 'publica',
        creadaPor: null
      });
      await upsertClientFromReservation(reservation);
    }

    const cashAt = (daysAgo, hhmm) =>
      dayjs()
        .tz(TZ)
        .subtract(daysAgo, 'day')
        .hour(Number(hhmm.slice(0, 2)))
        .minute(Number(hhmm.slice(3)))
        .second(0)
        .utc()
        .toDate();

    const caja = [
      { d: 0, t: '09:30', tipo: 'ingreso', categoria: 'reserva', concepto: 'Reserva Juan P.', monto: 16000, metodoPago: 'efectivo' },
      { d: 0, t: '11:00', tipo: 'ingreso', categoria: 'venta', concepto: '2 Gatorade + grip', monto: 4200, metodoPago: 'efectivo' },
      { d: 0, t: '12:15', tipo: 'ingreso', categoria: 'alquiler', concepto: '2 paletas', monto: 2000, metodoPago: 'efectivo' },
      { d: 0, t: '19:10', tipo: 'egreso', categoria: 'gasto', concepto: 'Insumos kiosco', monto: 12400, metodoPago: 'efectivo' },
      { d: 1, t: '20:00', tipo: 'ingreso', categoria: 'reserva', concepto: 'Reserva Los Pibes FC', monto: 20000, metodoPago: 'transferencia' },
      { d: 2, t: '21:30', tipo: 'ingreso', categoria: 'venta', concepto: 'Bebidas', monto: 3500, metodoPago: 'efectivo' },
      { d: 3, t: '10:00', tipo: 'ingreso', categoria: 'reserva', concepto: 'Reserva Ana G.', monto: 12000, metodoPago: 'tarjeta' },
      { d: 5, t: '17:00', tipo: 'egreso', categoria: 'retiro', concepto: 'Retiro a banco', monto: 50000, metodoPago: 'efectivo' }
    ];

    for (const c of caja) {
      await CashMovement.create({
        club: club._id,
        tipo: c.tipo,
        categoria: c.categoria,
        concepto: c.concepto,
        monto: c.monto,
        metodoPago: c.metodoPago,
        origen: 'manual',
        fecha: cashAt(c.d, c.t),
        createdBy: owner._id
      });
    }

    console.log(`· Datos de ejemplo generados (${reservas.length} turnos, ${caja.length} movimientos de caja).`);
  } else {
    console.log('· Turnos existentes intactos (usá --refresh para regenerarlos).');
  }

  const appUrl = process.env.APP_PUBLIC_URL || 'http://localhost:5173';

  console.log('\n✅ Complejo demo listo\n');
  console.log(`   Panel      : ${appUrl}/panel/login`);
  console.log(`   Usuario    : ${OWNER_EMAIL}`);
  console.log(`   Contraseña : ${passwordCambiada ? password || passwordExplicita : '(sin cambios; la que ya tenías)'}`);
  console.log(`   Link público: ${appUrl}/club/${SLUG}`);
  console.log('\n   El club NO aparece en el buscador (demo: true). Sólo llega quien tiene el link.');
  if (passwordCambiada) {
    console.log('   ⚠️  Anotá la contraseña ahora: no se vuelve a mostrar.\n');
  } else {
    console.log('');
  }

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Error en el seed del complejo demo:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
