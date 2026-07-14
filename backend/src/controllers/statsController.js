const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const mongoose = require('mongoose');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

const mongooseId = (id) => new mongoose.Types.ObjectId(id);

const Reservation = require('../models/Reservation');
const CashMovement = require('../models/CashMovement');
const Client = require('../models/Client');
const Court = require('../models/Court');
const Club = require('../models/Club');
const { dayConfigForDate, toMinutes, normalizeCloseMinutes } = require('../utils/reservationRules');
const { horariosToLocal, DEFAULT_TZ } = require('../utils/timezone');

const ACTIVE = ['pendiente', 'confirmada', 'completada'];
const DOW_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const clubIdFrom = (req) => req.query.clubId || req.headers['x-club-id'] || null;

const durMin = (r) => Math.max(0, (new Date(r.fin).getTime() - new Date(r.inicio).getTime()) / 60000);

// Minutos abiertos del club para una fecha local (YYYY-MM-DD).
const openMinutesForDate = (horariosLocal, dateKey) => {
  if (!horariosLocal) return 0;
  const cfg = dayConfigForDate(horariosLocal, dateKey);
  if (!cfg || !cfg.abierto) return 0;
  return Math.max(0, normalizeCloseMinutes(cfg.horaFin) - toMinutes(cfg.horaInicio));
};

// Ocupación % en un rango: minutos reservados / (minutos abiertos × canchas).
const occupancyPct = (horariosLocal, courtsCount, reservations, desde, hasta) => {
  if (!courtsCount) return 0;
  let available = 0;
  for (let d = desde.startOf('day'); d.isBefore(hasta); d = d.add(1, 'day')) {
    available += openMinutesForDate(horariosLocal, d.format('YYYY-MM-DD')) * courtsCount;
  }
  if (!available) return 0;
  const booked = reservations.reduce((a, r) => a + durMin(r), 0);
  return Math.min(100, Math.round((booked / available) * 100));
};

const trendPct = (value, prev) => {
  if (!prev) return null;
  return Math.round(((value - prev) / prev) * 100);
};

const sumIngresos = async (clubId, desde, hasta) => {
  const rows = await CashMovement.aggregate([
    { $match: { club: mongooseId(clubId), tipo: 'ingreso', fecha: { $gte: desde.toDate(), $lte: hasta.toDate() } } },
    { $group: { _id: null, total: { $sum: '$monto' } } }
  ]);
  return rows[0]?.total || 0;
};

// GET /stats/dashboard?clubId=&period=hoy|7dias|mes
const getDashboard = async (req, res, next) => {
  try {
    const clubId = clubIdFrom(req);
    if (!clubId) return res.status(400).json({ ok: false, message: 'Debes indicar un clubId' });

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ ok: false, message: 'Club no encontrado' });

    const tz = club.timezone || DEFAULT_TZ;
    const horariosLocal = club.horarios ? horariosToLocal(club.horarios.toObject(), tz) : null;
    const courts = await Court.find({ club: clubId, estado: 'activa', visible: { $ne: false } });
    const courtsCount = courts.length;

    const now = dayjs().tz(tz);
    const period = req.query.period || 'hoy';
    let desde, hasta, prevDesde, prevHasta;
    if (period === '7dias') {
      desde = now.subtract(6, 'day').startOf('day');
      hasta = now.endOf('day');
      prevDesde = desde.subtract(7, 'day');
      prevHasta = desde.subtract(1, 'millisecond');
    } else if (period === 'mes') {
      desde = now.startOf('month');
      hasta = now.endOf('day');
      prevDesde = desde.subtract(1, 'month');
      prevHasta = desde.subtract(1, 'millisecond');
    } else {
      desde = now.startOf('day');
      hasta = now.endOf('day');
      prevDesde = desde.subtract(1, 'day');
      prevHasta = desde.subtract(1, 'millisecond');
    }

    const [reservasRango, reservasPrev, ingresos, ingresosPrev, clientesNuevos] = await Promise.all([
      Reservation.find({ club: clubId, estado: { $in: ACTIVE }, inicio: { $gte: desde.toDate(), $lte: hasta.toDate() } }),
      Reservation.countDocuments({ club: clubId, estado: { $in: ACTIVE }, inicio: { $gte: prevDesde.toDate(), $lte: prevHasta.toDate() } }),
      sumIngresos(clubId, desde, hasta),
      sumIngresos(clubId, prevDesde, prevHasta),
      Client.countDocuments({ club: clubId, primeraReserva: { $gte: desde.toDate(), $lte: hasta.toDate() } })
    ]);

    const stats = {
      reservas: { value: reservasRango.length, trendPct: trendPct(reservasRango.length, reservasPrev) },
      ingresos: { value: ingresos, trendPct: trendPct(ingresos, ingresosPrev) },
      ocupacion: { value: occupancyPct(horariosLocal, courtsCount, reservasRango, desde, hasta) },
      clientesNuevos: { value: clientesNuevos }
    };

    // --- Ocupación por cancha (hoy) ---
    const todayKey = now.format('YYYY-MM-DD');
    const openToday = openMinutesForDate(horariosLocal, todayKey);
    const todayRes = await Reservation.find({
      club: clubId,
      estado: { $in: ACTIVE },
      inicio: { $gte: now.startOf('day').toDate(), $lte: now.endOf('day').toDate() }
    });
    const bookedByCourt = {};
    for (const r of todayRes) {
      const k = r.court.toString();
      bookedByCourt[k] = (bookedByCourt[k] || 0) + durMin(r);
    }
    const ocupacionPorCancha = courts.map((c) => ({
      nombre: c.nombre,
      tipo: c.tipo,
      pct: openToday ? Math.min(100, Math.round(((bookedByCourt[c._id.toString()] || 0) / openToday) * 100)) : 0
    }));

    // --- Heatmap de la semana (Lun..Dom × franjas de 2h) ---
    const monday = now.subtract((now.day() + 6) % 7, 'day').startOf('day');
    const weekEnd = monday.add(7, 'day');
    const weekRes = await Reservation.find({
      club: clubId,
      estado: { $in: ACTIVE },
      inicio: { $gte: monday.toDate(), $lt: weekEnd.toDate() }
    });
    const buckets = [8, 10, 12, 14, 16, 18, 20, 22];
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = monday.add(i, 'day');
      return { key: d.format('YYYY-MM-DD'), label: `${DOW_ES[d.day()]} ${d.format('DD')}` };
    });
    const busy = buckets.map(() => dias.map(() => new Set()));
    for (const r of weekRes) {
      const s = dayjs(r.inicio).tz(tz);
      const e = dayjs(r.fin).tz(tz);
      const dayIdx = dias.findIndex((d) => d.key === s.format('YYYY-MM-DD'));
      if (dayIdx < 0) continue;
      const sh = s.hour() + s.minute() / 60;
      const eh = e.hour() + e.minute() / 60;
      buckets.forEach((b, bi) => {
        if (sh < b + 2 && eh > b) busy[bi][dayIdx].add(r.court.toString());
      });
    }
    const heatmap = {
      horas: buckets.map((b) => String(b).padStart(2, '0') + 'h'),
      dias: dias.map((d) => d.label),
      data: busy.map((row) => row.map((set) => (courtsCount ? Math.round((set.size / courtsCount) * 100) : 0)))
    };

    // --- Actividad reciente ---
    const [recentRes, recentCash] = await Promise.all([
      Reservation.find({ club: clubId }).populate('court', 'nombre').sort({ createdAt: -1 }).limit(6),
      CashMovement.find({ club: clubId }).sort({ createdAt: -1 }).limit(6)
    ]);
    const acts = [
      ...recentRes.map((r) => ({
        tipo: r.estado === 'cancelada' ? 'cancelacion' : 'reserva',
        texto:
          r.estado === 'cancelada'
            ? `${r.guestName || 'Cliente'} canceló ${r.court?.nombre || 'una cancha'}`
            : `${r.guestName || 'Cliente'} reservó ${r.court?.nombre || 'una cancha'}`,
        fecha: r.createdAt
      })),
      ...recentCash.map((m) => ({
        tipo: m.tipo === 'ingreso' ? 'pago' : 'egreso',
        texto: m.concepto || (m.tipo === 'ingreso' ? 'Ingreso registrado' : 'Egreso registrado'),
        monto: (m.tipo === 'ingreso' ? 1 : -1) * m.monto,
        fecha: m.createdAt
      }))
    ];
    acts.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const actividad = acts.slice(0, 7);

    res.status(200).json({ ok: true, period, stats, ocupacionPorCancha, heatmap, actividad });
  } catch (error) {
    next(error);
  }
};

// GET /stats/reports?clubId=&desde=&hasta=
const getReports = async (req, res, next) => {
  try {
    const clubId = clubIdFrom(req);
    if (!clubId) return res.status(400).json({ ok: false, message: 'Debes indicar un clubId' });

    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ ok: false, message: 'Club no encontrado' });

    const tz = club.timezone || DEFAULT_TZ;
    const horariosLocal = club.horarios ? horariosToLocal(club.horarios.toObject(), tz) : null;
    const courts = await Court.find({ club: clubId, estado: 'activa', visible: { $ne: false } });

    const now = dayjs().tz(tz);
    const desde = req.query.desde ? dayjs(req.query.desde).tz(tz) : now.startOf('month');
    const hasta = req.query.hasta ? dayjs(req.query.hasta).tz(tz) : now.endOf('day');

    // Filtro opcional por deporte: acota reservas y (por cancha) los ingresos.
    const deporteFiltro = req.query.deporte || null;
    const filteredCourts = deporteFiltro ? courts.filter((c) => c.tipo === deporteFiltro) : courts;
    const courtFilterIds = deporteFiltro ? filteredCourts.map((c) => c._id) : null;

    const resQuery = { club: clubId, estado: { $in: ACTIVE }, inicio: { $gte: desde.toDate(), $lte: hasta.toDate() } };
    const cashQuery = { club: clubId, tipo: 'ingreso', fecha: { $gte: desde.toDate(), $lte: hasta.toDate() } };
    if (courtFilterIds) {
      resQuery.court = { $in: courtFilterIds };
      // Al filtrar por deporte, los ingresos se acotan a los movimientos ligados
      // a esas canchas (pagos/saldos de reservas de ese deporte).
      cashQuery.court = { $in: courtFilterIds };
    }

    const [reservations, cashIngresos, clientesNuevos] = await Promise.all([
      Reservation.find(resQuery).populate('court', 'nombre tipo'),
      CashMovement.find(cashQuery),
      Client.countDocuments({ club: clubId, primeraReserva: { $gte: desde.toDate(), $lte: hasta.toDate() } })
    ]);

    const ingresosTotal = cashIngresos.reduce((a, m) => a + m.monto, 0);
    const kpis = {
      ingresos: ingresosTotal,
      reservas: reservations.length,
      ocupacion: occupancyPct(horariosLocal, filteredCourts.length, reservations, desde, hasta),
      ticketPromedio: reservations.length ? Math.round(reservations.reduce((a, r) => a + (r.precioFinal || 0), 0) / reservations.length) : 0,
      clientesNuevos
    };

    // Ingresos por día.
    const porDia = {};
    for (let d = desde.startOf('day'); d.isBefore(hasta); d = d.add(1, 'day')) porDia[d.format('YYYY-MM-DD')] = 0;
    for (const m of cashIngresos) {
      const k = dayjs(m.fecha).tz(tz).format('YYYY-MM-DD');
      if (k in porDia) porDia[k] += m.monto;
    }
    const ingresosPorDia = Object.entries(porDia).map(([dia, monto]) => ({ dia, monto }));

    // Reservas por deporte.
    const deporte = {};
    for (const r of reservations) {
      const t = r.court?.tipo || 'otro';
      deporte[t] = (deporte[t] || 0) + 1;
    }
    const reservasPorDeporte = Object.entries(deporte).map(([tipo, count]) => ({ tipo, count })).sort((a, b) => b.count - a.count);

    // Ingresos por método / categoría.
    const metodo = {};
    const categoria = {};
    for (const m of cashIngresos) {
      metodo[m.metodoPago] = (metodo[m.metodoPago] || 0) + m.monto;
      categoria[m.categoria] = (categoria[m.categoria] || 0) + m.monto;
    }
    const ingresosPorMetodo = Object.entries(metodo).map(([k, v]) => ({ metodo: k, monto: v })).sort((a, b) => b.monto - a.monto);
    const ingresosPorCategoria = Object.entries(categoria).map(([k, v]) => ({ categoria: k, monto: v })).sort((a, b) => b.monto - a.monto);

    // Top canchas (por reservas + ingreso estimado).
    const canchaMap = {};
    for (const r of reservations) {
      const id = r.court?._id?.toString() || 'na';
      if (!canchaMap[id]) canchaMap[id] = { nombre: r.court?.nombre || 'Cancha', tipo: r.court?.tipo, reservas: 0, ingresos: 0 };
      canchaMap[id].reservas += 1;
      canchaMap[id].ingresos += r.precioFinal || 0;
    }
    const topCanchas = Object.values(canchaMap).sort((a, b) => b.reservas - a.reservas).slice(0, 5);

    // Top clientes (por gasto en el período, agrupado por email).
    const cliMap = {};
    for (const r of reservations) {
      const email = (r.guestEmail || '').toLowerCase();
      if (!email) continue;
      if (!cliMap[email]) cliMap[email] = { email, nombre: r.guestName || email, reservas: 0, gastado: 0 };
      cliMap[email].reservas += 1;
      cliMap[email].gastado += r.precioFinal || 0;
    }
    const topClientes = Object.values(cliMap).sort((a, b) => b.gastado - a.gastado).slice(0, 5);

    res.status(200).json({
      ok: true,
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      kpis,
      ingresosPorDia,
      reservasPorDeporte,
      ingresosPorMetodo,
      ingresosPorCategoria,
      topCanchas,
      topClientes
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getReports };
