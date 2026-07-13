const CashMovement = require('../models/CashMovement');
const { CATEGORIAS_INGRESO, CATEGORIAS_EGRESO, METODOS } = require('../models/CashMovement');

const clubIdFrom = (req) =>
  req.query.clubId || req.body?.clubId || req.headers['x-club-id'] || null;

// Valida que la categoría corresponda al tipo (ingreso/egreso).
const categoriaValida = (tipo, categoria) => {
  if (tipo === 'ingreso') return CATEGORIAS_INGRESO.includes(categoria);
  if (tipo === 'egreso') return CATEGORIAS_EGRESO.includes(categoria);
  return false;
};

// GET /cash?clubId=&desde=&hasta=&tipo=&categoria=&metodo=
// Devuelve los movimientos del período + un resumen agregado (ingresos, egresos,
// neto, por categoría y por método).
const getMovements = async (req, res, next) => {
  try {
    const clubId = clubIdFrom(req);
    if (!clubId) {
      return res.status(400).json({ ok: false, message: 'Debes indicar un clubId' });
    }

    const filter = { club: clubId };

    if (req.query.desde || req.query.hasta) {
      filter.fecha = {};
      if (req.query.desde) filter.fecha.$gte = new Date(req.query.desde);
      if (req.query.hasta) filter.fecha.$lte = new Date(req.query.hasta);
    }
    if (req.query.tipo) filter.tipo = req.query.tipo;
    if (req.query.categoria) filter.categoria = req.query.categoria;
    if (req.query.metodo) filter.metodoPago = req.query.metodo;

    const movimientos = await CashMovement.find(filter)
      .populate('court', 'nombre tipo')
      .populate('createdBy', 'nombre')
      .sort({ fecha: -1, createdAt: -1 })
      .limit(500);

    // Resumen agregado sobre el mismo filtro.
    const resumen = {
      ingresos: 0,
      egresos: 0,
      neto: 0,
      count: movimientos.length,
      porCategoria: {},
      porMetodo: {}
    };

    for (const m of movimientos) {
      if (m.tipo === 'ingreso') {
        resumen.ingresos += m.monto;
        resumen.porCategoria[m.categoria] = (resumen.porCategoria[m.categoria] || 0) + m.monto;
        resumen.porMetodo[m.metodoPago] = (resumen.porMetodo[m.metodoPago] || 0) + m.monto;
      } else {
        resumen.egresos += m.monto;
      }
    }
    resumen.neto = resumen.ingresos - resumen.egresos;

    res.status(200).json({ ok: true, movimientos, resumen });
  } catch (error) {
    next(error);
  }
};

// POST /cash — registra un movimiento manual (mostrador).
const createMovement = async (req, res, next) => {
  try {
    const clubId = clubIdFrom(req);
    const { tipo, categoria, concepto, monto, metodoPago, fecha, notas, reservationId, courtId } = req.body;

    if (!clubId) {
      return res.status(400).json({ ok: false, message: 'Debes indicar un clubId' });
    }
    if (!tipo || !['ingreso', 'egreso'].includes(tipo)) {
      return res.status(400).json({ ok: false, message: 'Tipo inválido (ingreso o egreso)' });
    }
    if (!categoriaValida(tipo, categoria)) {
      return res.status(400).json({ ok: false, message: 'La categoría no corresponde al tipo' });
    }
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      return res.status(400).json({ ok: false, message: 'El monto debe ser mayor a 0' });
    }
    if (metodoPago && !METODOS.includes(metodoPago)) {
      return res.status(400).json({ ok: false, message: 'Método de pago inválido' });
    }

    const movement = await CashMovement.create({
      club: clubId,
      tipo,
      categoria,
      concepto: (concepto || '').trim(),
      monto: montoNum,
      metodoPago: metodoPago || 'efectivo',
      origen: 'manual',
      reservation: reservationId || null,
      court: courtId || null,
      fecha: fecha ? new Date(fecha) : new Date(),
      notas: (notas || '').trim(),
      createdBy: req.user?._id || null
    });

    const populated = await CashMovement.findById(movement._id)
      .populate('court', 'nombre tipo')
      .populate('createdBy', 'nombre');

    res.status(201).json({ ok: true, movimiento: populated });
  } catch (error) {
    next(error);
  }
};

// PATCH /cash/:id — edita un movimiento manual (los 'online' no se editan acá).
const updateMovement = async (req, res, next) => {
  try {
    const movement = await CashMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ ok: false, message: 'Movimiento no encontrado' });
    }
    if (movement.origen === 'online') {
      return res.status(400).json({ ok: false, message: 'Los movimientos automáticos de reservas no se editan' });
    }

    const { tipo, categoria, concepto, monto, metodoPago, fecha, notas } = req.body;
    const nextTipo = tipo || movement.tipo;
    const nextCat = categoria || movement.categoria;
    if ((tipo || categoria) && !categoriaValida(nextTipo, nextCat)) {
      return res.status(400).json({ ok: false, message: 'La categoría no corresponde al tipo' });
    }
    if (monto !== undefined) {
      const m = Number(monto);
      if (!Number.isFinite(m) || m <= 0) {
        return res.status(400).json({ ok: false, message: 'El monto debe ser mayor a 0' });
      }
      movement.monto = m;
    }
    if (tipo) movement.tipo = tipo;
    if (categoria) movement.categoria = categoria;
    if (concepto !== undefined) movement.concepto = concepto.trim();
    if (metodoPago) movement.metodoPago = metodoPago;
    if (fecha) movement.fecha = new Date(fecha);
    if (notas !== undefined) movement.notas = notas.trim();

    await movement.save();
    const populated = await CashMovement.findById(movement._id)
      .populate('court', 'nombre tipo')
      .populate('createdBy', 'nombre');

    res.status(200).json({ ok: true, movimiento: populated });
  } catch (error) {
    next(error);
  }
};

// DELETE /cash/:id — elimina un movimiento manual.
const deleteMovement = async (req, res, next) => {
  try {
    const movement = await CashMovement.findById(req.params.id);
    if (!movement) {
      return res.status(404).json({ ok: false, message: 'Movimiento no encontrado' });
    }
    if (movement.origen === 'online') {
      return res.status(400).json({ ok: false, message: 'Los movimientos automáticos de reservas no se eliminan' });
    }
    await movement.deleteOne();
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMovements, createMovement, updateMovement, deleteMovement };
