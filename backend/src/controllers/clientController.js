const Client = require('../models/Client');
const Reservation = require('../models/Reservation');

const clubIdFrom = (req) =>
  req.query.clubId || req.body?.clubId || req.headers['x-club-id'] || null;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /clients?clubId=&q=
// Lista clientes del club (opcionalmente filtrados por texto) + un resumen.
const getClients = async (req, res, next) => {
  try {
    const clubId = clubIdFrom(req);
    if (!clubId) {
      return res.status(400).json({ ok: false, message: 'Debes indicar un clubId' });
    }

    const all = await Client.find({ club: clubId })
      .sort({ ultimaReserva: -1, createdAt: -1 })
      .limit(2000);

    const resumen = {
      total: all.length,
      reservasTotales: all.reduce((a, c) => a + (c.reservasCount || 0), 0),
      ingresosTotales: all.reduce((a, c) => a + (c.totalGastado || 0), 0),
      recurrentes: all.filter((c) => (c.reservasCount || 0) > 1).length
    };

    let clients = all;
    if (req.query.q) {
      const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
      clients = all.filter((c) => rx.test(c.nombre) || rx.test(c.email) || rx.test(c.telefono || ''));
    }

    res.status(200).json({ ok: true, clients, resumen });
  } catch (error) {
    next(error);
  }
};

// GET /clients/:id — detalle del cliente + sus reservas.
const getClientById = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client || (clubIdFrom(req) && client.club.toString() !== clubIdFrom(req))) {
      return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
    }

    const or = [{ guestEmail: client.email }];
    if (client.user) or.push({ customer: client.user });

    const reservations = await Reservation.find({ club: client.club, $or: or })
      .populate('court', 'nombre tipo')
      .sort({ inicio: -1 })
      .limit(50);

    res.status(200).json({ ok: true, client, reservations });
  } catch (error) {
    next(error);
  }
};

// PATCH /clients/:id — edita datos manuales del cliente (nombre, teléfono, notas).
const updateClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client || (clubIdFrom(req) && client.club.toString() !== clubIdFrom(req))) {
      return res.status(404).json({ ok: false, message: 'Cliente no encontrado' });
    }

    const { nombre, telefono, notas } = req.body;
    if (nombre !== undefined) client.nombre = nombre.trim();
    if (telefono !== undefined) client.telefono = telefono.trim();
    if (notas !== undefined) client.notas = notas.trim();

    await client.save();
    res.status(200).json({ ok: true, client });
  } catch (error) {
    next(error);
  }
};

module.exports = { getClients, getClientById, updateClient };
