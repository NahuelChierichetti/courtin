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

const SLUG = 'demo-multideporte';
const TZ = 'America/Argentina/Buenos_Aires';

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
    await Court.deleteMany({ club: existing._id });
    await Club.deleteOne({ _id: existing._id });
    console.log('· Club demo previo eliminado (reseed limpio).');
  }

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
    servicios: ['Estacionamiento', 'Buffet', 'Vestuarios', 'Alquiler de paletas'],
    horarios: { semanal: semanalAbierto() },
    publicado: true
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

  const reservasData = [
    // Pádel 1 (turnos de 90m alineados a 08:00): 20:00–21:30 mañana
    { court: byName['Pádel 1'], date: manana, ini: '20:00', fin: '21:30', name: 'Juan Pérez' },
    // Pádel 2: 18:30–20:00 mañana
    { court: byName['Pádel 2'], date: manana, ini: '18:30', fin: '20:00', name: 'Ana Gómez' },
    // Tenis: 17:00–18:30 hoy
    { court: byName['Tenis Central'], date: hoy, ini: '17:00', fin: '18:30', name: 'Carlos Ruiz' },
    // Fútbol 5 (turnos de 60m): 21:00–22:00 mañana
    { court: byName['Fútbol 5'], date: manana, ini: '21:00', fin: '22:00', name: 'Los Pibes FC' }
  ];

  for (const r of reservasData) {
    await Reservation.create({
      club: club._id,
      court: r.court._id,
      guestName: r.name,
      guestPhone: '2216000001',
      guestEmail: 'reserva.demo@courtin.test',
      inicio: localToUtc(r.date, r.ini),
      fin: localToUtc(r.date, r.fin),
      estado: 'confirmada',
      precioFinal: r.court.precio,
      origen: 'publica',
      creadaPor: null
    });
  }

  console.log(`\n✅ Seed OK`);
  console.log(`   Club:     ${club.nombre}  (slug: ${club.slug}, publicado)`);
  console.log(`   Canchas:  ${courts.map((c) => `${c.nombre} [${c.tipo}]`).join(', ')}`);
  console.log(`   Reservas: ${reservasData.length} de ejemplo (hoy/mañana)`);
  console.log(`\n   Abrí en el front:  /clubs/${SLUG}`);
  console.log(`   Compass:           mongodb://127.0.0.1:27017  →  db "courtin_dev"\n`);

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('Error en el seed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
