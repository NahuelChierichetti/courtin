'use strict';

// Seed de ALTO FLUJO para el "Complejo de Manuel": ~2 meses de reservas, caja,
// clientes y notificaciones, para ver las vistas con mucho volumen.
//
// Uso:  node src/scripts/seedManuel.js
// (idempotente: borra y recrea los datos de ESE club; guard de DB local).

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
const CashMovement = require('../models/CashMovement');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const { priceForDuration } = require('../utils/pricing');

const SLUG = 'complejo-de-manuel';
const TZ = 'America/Argentina/Buenos_Aires';
const DAYS_BACK = 60;
const DAYS_FWD = 7;

const uri = process.env.MONGODB_URI || '';
if (!/(localhost|127\.0\.0\.1)/.test(uri)) {
  console.error('⛔  ABORTADO: MONGODB_URI no es local.');
  process.exit(1);
}

const rand = () => Math.random();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const localToUtc = (dateKey, hhmm) => dayjs.tz(`${dateKey} ${hhmm}`, 'YYYY-MM-DD HH:mm', TZ).utc().toDate();
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Pool de clientes (identidad = email).
const NOMBRES = ['Juan', 'Ana', 'Carlos', 'Sofía', 'Martín', 'Lucía', 'Diego', 'Valentina', 'Nicolás', 'Camila', 'Franco', 'Julieta', 'Tomás', 'Paula', 'Agustín', 'Micaela', 'Federico', 'Rocío', 'Joaquín', 'Florencia', 'Gonzalo', 'Brenda', 'Matías', 'Carla', 'Ignacio', 'Delfina', 'Bruno', 'Abril', 'Emiliano', 'Guadalupe'];
const APELLIDOS = ['Pérez', 'Gómez', 'Ruiz', 'López', 'Fernández', 'Díaz', 'Sosa', 'Romero', 'Torres', 'Álvarez', 'Molina', 'Ríos', 'Castro', 'Herrera', 'Aguirre', 'Méndez', 'Silva', 'Rojas', 'Vega', 'Blanco'];

const buildClients = (count) => {
  const set = new Map();
  while (set.size < count) {
    const nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
    const email = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.') + '@mail.com';
    if (!set.has(email)) set.set(email, { nombre, email, telefono: `221${randInt(4000000, 6999999)}` });
  }
  return [...set.values()];
};

const run = async () => {
  await mongoose.connect(uri);
  console.log('DB:', mongoose.connection.name);

  const club = await Club.findOne({ slug: SLUG });
  if (!club) {
    console.error('No existe el club', SLUG, '— creá primero la cuenta de Manuel.');
    process.exit(1);
  }

  // Limpieza de datos del club.
  await Promise.all([
    Reservation.deleteMany({ club: club._id }),
    CashMovement.deleteMany({ club: club._id }),
    Client.deleteMany({ club: club._id }),
    Notification.deleteMany({ club: club._id }),
    Court.deleteMany({ club: club._id })
  ]);

  // Horario amplio para más volumen.
  club.horarios = { semanal: {
    lunes: { abierto: true, horaInicio: '08:00', horaFin: '23:00' },
    martes: { abierto: true, horaInicio: '08:00', horaFin: '23:00' },
    miercoles: { abierto: true, horaInicio: '08:00', horaFin: '23:00' },
    jueves: { abierto: true, horaInicio: '08:00', horaFin: '23:00' },
    viernes: { abierto: true, horaInicio: '08:00', horaFin: '23:59' },
    sabado: { abierto: true, horaInicio: '09:00', horaFin: '23:59' },
    domingo: { abierto: true, horaInicio: '09:00', horaFin: '22:00' }
  } };
  club.publicado = true;
  await club.save();

  // Tarifas por franja (día/noche/finde).
  const tarifas = (base) => [
    { nombre: 'Lun-Vie día', dias: 'lun,mar,mie,jue,vie', horaInicio: '08:00', horaFin: '17:00', precio: base },
    { nombre: 'Lun-Vie noche', dias: 'lun,mar,mie,jue,vie', horaInicio: '17:00', horaFin: '23:59', precio: Math.round(base * 1.25) },
    { nombre: 'Finde', dias: 'sab,dom', horaInicio: '08:00', horaFin: '23:59', precio: Math.round(base * 1.4) }
  ];

  const courtsDef = [
    { nombre: 'Pádel 1', tipo: 'padel', superficie: 'Cristal (Blindex)', cubierta: true, duracionTurno: 90, base: 9000 },
    { nombre: 'Pádel 2', tipo: 'padel', superficie: 'Cristal (Blindex)', cubierta: true, duracionTurno: 90, base: 9000 },
    { nombre: 'Pádel 3', tipo: 'padel', superficie: 'Muro de cemento', cubierta: false, duracionTurno: 90, base: 8000 },
    { nombre: 'Tenis 1', tipo: 'tenis', superficie: 'Polvo de ladrillo', cubierta: false, duracionTurno: 90, base: 7000 },
    { nombre: 'Tenis 2', tipo: 'tenis', superficie: 'Cemento / Hard', cubierta: false, duracionTurno: 90, base: 7500 },
    { nombre: 'Fútbol 5 A', tipo: 'futbol', superficie: 'Césped sintético', cubierta: false, jugadores: 10, duracionTurno: 60, base: 14000 },
    { nombre: 'Fútbol 5 B', tipo: 'futbol', superficie: 'Césped sintético', cubierta: true, jugadores: 10, duracionTurno: 60, base: 15000 }
  ];
  const courts = await Court.insertMany(
    courtsDef.map((c) => ({
      club: club._id, nombre: c.nombre, tipo: c.tipo, superficie: c.superficie, cubierta: c.cubierta,
      jugadores: c.jugadores, duracionTurno: c.duracionTurno, estado: 'activa', visible: true, tarifas: tarifas(c.base)
    }))
  );

  const clientPool = buildClients(45);
  const clientStats = new Map(); // email -> stats

  const OPEN = 8 * 60;
  const CLOSE = 23 * 60;
  const fillProb = (dow, hour) => {
    let p = 0.26;
    if (hour >= 18) p += 0.36;
    else if (hour >= 15) p += 0.12;
    if (dow === 0 || dow === 6) p += 0.16;
    return Math.min(0.85, p);
  };

  const reservations = [];
  const cash = [];
  const today = dayjs().tz(TZ);

  for (let off = -DAYS_BACK; off <= DAYS_FWD; off++) {
    const d = today.add(off, 'day');
    const dateKey = d.format('YYYY-MM-DD');
    const dow = d.day();
    const isPast = off < 0;

    for (const court of courts) {
      const dur = court.duracionTurno;
      for (let start = OPEN; start + dur <= CLOSE; start += dur) {
        const hour = Math.floor(start / 60);
        if (rand() > fillProb(dow, hour)) continue;
        const cli = pick(clientPool);
        const precio = priceForDuration(court, dow, hhmm(start), dur);
        const inicio = localToUtc(dateKey, hhmm(start));
        const fin = localToUtc(dateKey, hhmm(start + dur));
        const online = rand() < 0.55;
        const metodo = rand() < 0.6 ? 'mercadopago' : 'tarjeta';

        reservations.push({
          club: club._id, court: court._id, guestName: cli.nombre, guestPhone: cli.telefono, guestEmail: cli.email,
          inicio, fin, estado: isPast ? 'completada' : 'confirmada', precioFinal: precio,
          origen: online ? 'publica' : 'backoffice', creadaPor: null
        });

        // Stats de cliente.
        const s = clientStats.get(cli.email) || { ...cli, reservasCount: 0, totalGastado: 0, primeraReserva: inicio, ultimaReserva: inicio };
        s.reservasCount += 1;
        s.totalGastado += precio;
        if (inicio < s.primeraReserva) s.primeraReserva = inicio;
        if (inicio > s.ultimaReserva) s.ultimaReserva = inicio;
        clientStats.set(cli.email, s);

        // Caja: pago online de la reserva (o saldo en persona a veces).
        if (online) {
          cash.push({ club: club._id, tipo: 'ingreso', categoria: 'reserva', concepto: `Reserva ${cli.nombre}`, monto: precio, metodoPago: metodo, origen: 'online', court: court._id, fecha: inicio });
        } else if (isPast && rand() < 0.5) {
          cash.push({ club: club._id, tipo: 'ingreso', categoria: 'saldo', concepto: `Saldo turno ${court.nombre}`, monto: precio, metodoPago: 'efectivo', origen: 'manual', court: court._id, fecha: inicio });
        }
      }
    }

    // Movimientos manuales del día (ventas / alquileres / gastos).
    if (off <= 0) {
      const nVentas = randInt(2, 6);
      for (let i = 0; i < nVentas; i++) {
        cash.push({ club: club._id, tipo: 'ingreso', categoria: 'venta', concepto: pick(['Bebidas', 'Gatorade + grip', 'Pelotas', 'Overgrips', 'Cerveza', 'Agua x2']), monto: randInt(1500, 6000), metodoPago: rand() < 0.7 ? 'efectivo' : 'tarjeta', origen: 'manual', fecha: localToUtc(dateKey, hhmm(randInt(10, 22) * 60)) });
      }
      const nAlq = randInt(1, 4);
      for (let i = 0; i < nAlq; i++) {
        cash.push({ club: club._id, tipo: 'ingreso', categoria: 'alquiler', concepto: pick(['2 paletas', '3 paletas', 'Tubo de pelotas', 'Paleta + pelotas']), monto: randInt(1500, 4000), metodoPago: 'efectivo', origen: 'manual', fecha: localToUtc(dateKey, hhmm(randInt(10, 22) * 60)) });
      }
      if (rand() < 0.35) cash.push({ club: club._id, tipo: 'egreso', categoria: 'gasto', concepto: pick(['Insumos kiosco', 'Mantenimiento', 'Iluminación', 'Limpieza']), monto: randInt(8000, 45000), metodoPago: 'efectivo', origen: 'manual', fecha: localToUtc(dateKey, hhmm(randInt(10, 20) * 60)) });
      if (rand() < 0.1) cash.push({ club: club._id, tipo: 'egreso', categoria: 'retiro', concepto: 'Retiro a banco', monto: randInt(50000, 150000), metodoPago: 'efectivo', origen: 'manual', fecha: localToUtc(dateKey, hhmm(19 * 60)) });
    }
  }

  // Inserciones masivas.
  await Reservation.insertMany(reservations, { ordered: false }).catch((e) => console.warn('algunas reservas colisionaron:', e.writeErrors?.length || e.message));
  await CashMovement.insertMany(cash, { ordered: false });
  const clients = [...clientStats.values()].map((s) => ({
    club: club._id, email: s.email, nombre: s.nombre, telefono: s.telefono,
    reservasCount: s.reservasCount, totalGastado: s.totalGastado, primeraReserva: s.primeraReserva, ultimaReserva: s.ultimaReserva
  }));
  await Client.insertMany(clients, { ordered: false });

  // Notificaciones recientes.
  const notifs = [
    { tipo: 'reserva', titulo: 'Nueva reserva', mensaje: `${pick(clientPool).nombre} reservó Pádel 1`, leida: false },
    { tipo: 'pago', titulo: 'Pago recibido', mensaje: 'Ingreso de $11.250 por MercadoPago', leida: false },
    { tipo: 'cliente', titulo: 'Nuevo cliente', mensaje: `${pick(clientPool).nombre} hizo su primera reserva`, leida: false },
    { tipo: 'reserva', titulo: 'Nueva reserva', mensaje: `${pick(clientPool).nombre} reservó Fútbol 5 A`, leida: false },
    { tipo: 'cancelacion', titulo: 'Reserva cancelada', mensaje: `${pick(clientPool).nombre} canceló Tenis 2`, leida: true }
  ];
  await Notification.insertMany(notifs.map((n) => ({ club: club._id, ...n })));

  console.log('\n✅ Seed Manuel OK');
  console.log(`   Canchas:  ${courts.length}`);
  console.log(`   Reservas: ${reservations.length} (${DAYS_BACK} días atrás + ${DAYS_FWD} adelante)`);
  console.log(`   Caja:     ${cash.length} movimientos`);
  console.log(`   Clientes: ${clients.length}`);
  console.log(`   Acceso:   manuelb@gmail.com / manuel1234  (club: Complejo de Manuel)\n`);

  await mongoose.disconnect();
};

run().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
