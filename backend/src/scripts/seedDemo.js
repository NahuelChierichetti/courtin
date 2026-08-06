'use strict';

// Seed de datos DEMO para desarrollo local.
// Crea (o recrea) un club multideporte publicado con canchas de pádel, tenis y
// fútbol, más algunas reservas de ejemplo para ver turnos "No disponible".
//
// Uso:  npm run seed
//
// SEGURIDAD: por defecto se niega a correr contra una base que no sea local
// (localhost/127.0.0.1), para no ensuciar Atlas/producción. Para forzar (no
// recomendado) usar:  node src/scripts/seedDemo.js --force

require('dotenv').config();

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
const Notification = require('../models/Notification');
const User = require('../models/User');
const Membership = require('../models/Membership');
const ROLES = require('../config/roles');
const { upsertClientFromReservation } = require('../utils/clients');

const SLUG = 'demo-multideporte';
const TZ = 'America/Argentina/Buenos_Aires';

// Credenciales del dueño demo para acceder al backoffice (/panel).
const OWNER_EMAIL = 'demo@courtin.test';
const OWNER_PASSWORD = 'demo1234';

const uri = process.env.MONGODB_URI || '';
const isLocal = /(^|@|\/\/)(localhost|127\.0\.0\.1)(:|\/)/.test(uri);
const force = process.argv.includes('--force');

if (!isLocal && !force) {
  console.error('\n⛔  ABORTADO: MONGODB_URI no apunta a una base local.');
  console.error('    Este seed solo debe correr en local (localhost/127.0.0.1).');
  console.error(`    URI actual apunta a: ${uri.replace(/\/\/[^@]*@/, '//<credenciales>@') || '(vacía)'}`);
  console.error('    Si REALMENTE querés forzarlo: node src/scripts/seedDemo.js --force\n');
  process.exit(1);
}

// Horario semanal: abierto todos los días 08:00–23:30 (para ver un timeline largo).
const semanalAbierto = () => {
  const dia = { abierto: true, horaInicio: '08:00', horaFin: '23:30' };
  return { lunes: { ...dia }, martes: { ...dia }, miercoles: { ...dia }, jueves: { ...dia }, viernes: { ...dia }, sabado: { ...dia }, domingo: { ...dia } };
};

// Instante UTC a partir de una fecha (YYYY-MM-DD) y hora local (HH:mm).
const localToUtc = (dateKey, hhmm) => dayjs.tz(`${dateKey} ${hhmm}`, 'YYYY-MM-DD HH:mm', TZ).utc().toDate();

const run = async () => {
  await mongoose.connect(uri);
  console.log(`MongoDB conectada: ${mongoose.connection.host} / db "${mongoose.connection.name}"`);

  // Limpieza acotada: solo el club demo y sus dependencias (nunca toca otros datos).
  const existing = await Club.findOne({ slug: SLUG });
  if (existing) {
    await Reservation.deleteMany({ club: existing._id });
    await CashMovement.deleteMany({ club: existing._id });
    await Client.deleteMany({ club: existing._id });
    await Notification.deleteMany({ club: existing._id });
    await Court.deleteMany({ club: existing._id });
    await Membership.deleteMany({ club: existing._id });
    await Club.deleteOne({ _id: existing._id });
    console.log('· Club demo previo eliminado (reseed limpio).');
  }
  // El usuario dueño se recrea siempre (idempotente por email).
  await User.deleteOne({ email: OWNER_EMAIL });

  const club = await Club.create({
    nombre: 'Demo Multideporte',
    slug: SLUG,
    descripcion: 'Club de prueba con pádel, tenis y fútbol para testear la reserva pública.',
    direccion: 'Av. Siempreviva 742',
    ciudad: 'La Plata',
    provincia: 'Buenos Aires',
    telefono: '2216000000',
    whatsapp: '2216000000',
    email: 'demo@courtin.test',
    timezone: TZ,
    moneda: 'ARS',
    estado: 'activo',
    deportes: ['futbol', 'padel', 'tenis'],
    servicios: ['Estacionamiento', 'Buffet', 'Vestuarios', 'Alquiler de paletas'],
    horarios: { semanal: semanalAbierto() },
    publicado: true
  });

  // Dueño del complejo (acceso al backoffice) + su membership tenant_admin.
  const owner = await User.create({
    nombre: 'Dueño Demo',
    email: OWNER_EMAIL,
    password: await bcrypt.hash(OWNER_PASSWORD, 10),
    estado: 'activo'
  });
  await Membership.create({
    user: owner._id,
    club: club._id,
    role: ROLES.TENANT_ADMIN
  });

  const tarifa = (precio) => [{ nombre: 'General', dias: 'lun a dom', horaInicio: '08:00', horaFin: '23:59', precio }];

  const courtsData = [
    { nombre: 'Pádel 1', tipo: 'padel', superficie: 'Blindex', cubierta: true, duracionTurno: 90, precio: 16000 },
    { nombre: 'Pádel 2', tipo: 'padel', superficie: 'Blindex', cubierta: true, duracionTurno: 90, precio: 16000 },
    { nombre: 'Tenis Central', tipo: 'tenis', superficie: 'Polvo de ladrillo', cubierta: false, duracionTurno: 90, precio: 12000 },
    { nombre: 'Fútbol 5', tipo: 'futbol', superficie: 'Sintético', cubierta: false, jugadores: 10, duracionTurno: 60, precio: 20000 }
  ];

  const courts = await Court.insertMany(
    courtsData.map((c) => ({ ...c, club: club._id, estado: 'activa', visible: true, tarifas: tarifa(c.precio) }))
  );
  const byName = Object.fromEntries(courts.map((c) => [c.nombre, c]));

  // Reservas de ejemplo (alineadas a la grilla de cada cancha) para hoy y mañana.
  const hoy = dayjs().tz(TZ).format('YYYY-MM-DD');
  const manana = dayjs().tz(TZ).add(1, 'day').format('YYYY-MM-DD');
  const hace = (d) => dayjs().tz(TZ).subtract(d, 'day').format('YYYY-MM-DD');

  // Invitados demo (la identidad del cliente es el email).
  const JUAN = { name: 'Juan Pérez', email: 'juan.perez@mail.com', phone: '2216001001' };
  const ANA = { name: 'Ana Gómez', email: 'ana.gomez@mail.com', phone: '2216001002' };
  const CARLOS = { name: 'Carlos Ruiz', email: 'carlos.ruiz@mail.com', phone: '2216001003' };
  const PIBES = { name: 'Los Pibes FC', email: 'pibes.fc@mail.com', phone: '2216001004' };

  const reservasData = [
    // Próximas
    { court: byName['Pádel 1'], date: manana, ini: '20:00', fin: '21:30', g: JUAN },
    { court: byName['Pádel 2'], date: manana, ini: '18:30', fin: '20:00', g: ANA },
    { court: byName['Tenis Central'], date: hoy, ini: '17:00', fin: '18:30', g: CARLOS },
    { court: byName['Fútbol 5'], date: manana, ini: '21:00', fin: '22:00', g: PIBES },
    // Históricas (para que haya clientes recurrentes)
    { court: byName['Pádel 1'], date: hace(7), ini: '19:00', fin: '20:30', g: JUAN, estado: 'completada' },
    { court: byName['Pádel 2'], date: hace(10), ini: '18:00', fin: '19:30', g: JUAN, estado: 'completada' },
    { court: byName['Tenis Central'], date: hace(4), ini: '10:00', fin: '11:30', g: ANA, estado: 'completada' }
  ];

  for (const r of reservasData) {
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
    // Registra/actualiza el cliente del club (dedup por email).
    await upsertClientFromReservation(reservation);
  }

  // --- Movimientos de caja de ejemplo (hoy + días previos) ---
  const cashAt = (daysAgo, hhmm) =>
    dayjs().tz(TZ).subtract(daysAgo, 'day').hour(Number(hhmm.slice(0, 2))).minute(Number(hhmm.slice(3))).second(0).utc().toDate();

  const cashData = [
    // Hoy
    { d: 0, t: '09:30', tipo: 'ingreso', categoria: 'reserva', concepto: 'Reserva Martín S.', monto: 16000, metodoPago: 'mercadopago', origen: 'online' },
    { d: 0, t: '11:00', tipo: 'ingreso', categoria: 'venta', concepto: '2 Gatorade + grip', monto: 4200, metodoPago: 'efectivo' },
    { d: 0, t: '12:15', tipo: 'ingreso', categoria: 'alquiler', concepto: '2 paletas', monto: 2000, metodoPago: 'efectivo' },
    { d: 0, t: '18:40', tipo: 'ingreso', categoria: 'saldo', concepto: 'Saldo turno Tenis', monto: 6000, metodoPago: 'tarjeta' },
    { d: 0, t: '19:10', tipo: 'egreso', categoria: 'gasto', concepto: 'Insumos kiosco', monto: 12400, metodoPago: 'efectivo' },
    // Días previos
    { d: 1, t: '20:00', tipo: 'ingreso', categoria: 'reserva', concepto: 'Reserva Joaquín A.', monto: 20000, metodoPago: 'mercadopago', origen: 'online' },
    { d: 1, t: '21:30', tipo: 'ingreso', categoria: 'venta', concepto: 'Bebidas', monto: 3500, metodoPago: 'efectivo' },
    { d: 3, t: '10:00', tipo: 'ingreso', categoria: 'reserva', concepto: 'Reserva Ana G.', monto: 12000, metodoPago: 'tarjeta', origen: 'online' },
    { d: 5, t: '17:00', tipo: 'egreso', categoria: 'retiro', concepto: 'Retiro a banco', monto: 50000, metodoPago: 'efectivo' }
  ];

  for (const c of cashData) {
    await CashMovement.create({
      club: club._id,
      tipo: c.tipo,
      categoria: c.categoria,
      concepto: c.concepto,
      monto: c.monto,
      metodoPago: c.metodoPago,
      origen: c.origen || 'manual',
      fecha: cashAt(c.d, c.t),
      createdBy: owner._id
    });
  }

  // --- Notificaciones de ejemplo ---
  const notifData = [
    { tipo: 'reserva', titulo: 'Nueva reserva', mensaje: 'Juan Pérez reservó Pádel 1 · 20:00', leida: false },
    { tipo: 'cliente', titulo: 'Nuevo cliente', mensaje: 'Ana Gómez hizo su primera reserva', leida: false },
    { tipo: 'pago', titulo: 'Pago recibido', mensaje: 'Ingreso de $16.000 por MercadoPago', leida: false },
    { tipo: 'cancelacion', titulo: 'Reserva cancelada', mensaje: 'Carlos Ruiz canceló Tenis Central', leida: true }
  ];
  for (const n of notifData) {
    await Notification.create({ club: club._id, ...n });
  }

  console.log(`\n✅ Seed OK`);
  console.log(`   Club:     ${club.nombre}  (slug: ${club.slug}, publicado)`);
  console.log(`   Canchas:  ${courts.map((c) => `${c.nombre} [${c.tipo}]`).join(', ')}`);
  console.log(`   Reservas: ${reservasData.length} de ejemplo (hoy/mañana)`);
  console.log(`   Caja:     ${cashData.length} movimientos de ejemplo`);
  console.log(`   Clientes: ${await Client.countDocuments({ club: club._id })} (dedup por email)`);
  console.log(`   Acceso backoffice (/panel/login):  ${OWNER_EMAIL}  /  ${OWNER_PASSWORD}`);
  console.log(`\n   Abrí en el front:  /clubs/${SLUG}`);
  console.log(`   Compass:           mongodb://127.0.0.1:27017  →  db "courtin_dev"\n`);

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Error en el seed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
