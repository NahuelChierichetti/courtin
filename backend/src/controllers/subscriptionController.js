const Club = require('../models/Club');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const Court = require('../models/Court');
const { PLANS, PLAN_KEYS, CICLOS, precioDe, limiteCanchas, getPlan } = require('../config/plans');
const {
  diasDeMora,
  proximoCorte,
  capacidades,
  DIAS_NIVEL_1,
  DIAS_NIVEL_2
} = require('../utils/subscriptions');
const {
  ensureSubscription,
  sincronizarEstado,
  emitirFactura,
  acreditarPago,
  periodoDe,
  notificarFactura
} = require('../utils/billing');

// Suscripción y facturación.
//
// Estas rutas viven FUERA de `requiereSuscripcionActiva` a propósito: si un club
// suspendido no pudiera entrar acá, no tendría forma de pagar y no habría manera
// de salir del bloqueo.

// Catálogo de planes para las pantallas. Es público: son los precios de lista.
const getPlanes = async (req, res, next) => {
  try {
    res.status(200).json({
      ok: true,
      planes: PLAN_KEYS.map((key) => ({
        ...PLANS[key],
        // Infinity no sobrevive a JSON: null significa "sin tope".
        maxCanchas: PLANS[key].maxCanchas
      })),
      ciclos: CICLOS
    });
  } catch (error) {
    next(error);
  }
};

// GET /subscriptions/club/:clubId
// Lo que ve el dueño del complejo en /panel/suscripcion.
const getClubSubscription = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      return res.status(404).json({ ok: false, message: 'Complejo no encontrado' });
    }

    // Se crea al vuelo si el club es anterior a esta funcionalidad.
    const subscription = await ensureSubscription(club);

    // El estado guardado puede estar desactualizado si el cron todavía no pasó;
    // se recalcula al leer para que la pantalla no mienta.
    const estado = await sincronizarEstado(club, subscription);

    const [invoices, canchas] = await Promise.all([
      Invoice.find({ club: club._id }).sort({ vencimiento: -1 }).limit(24),
      Court.countDocuments({ club: club._id })
    ]);

    const mora = diasDeMora(subscription);

    res.status(200).json({
      ok: true,
      suscripcion: {
        plan: subscription.plan,
        planLabel: getPlan(subscription.plan)?.label || subscription.plan,
        ciclo: subscription.ciclo,
        precio: subscription.precio,
        moneda: subscription.moneda,
        trialHasta: subscription.trialHasta,
        vigenciaHasta: subscription.vigenciaHasta,
        canceladaEn: subscription.canceladaEn
      },
      estado,
      capacidades: capacidades(estado),
      mora: {
        dias: mora,
        proximoCorte: proximoCorte(subscription),
        diasNivel1: DIAS_NIVEL_1,
        diasNivel2: DIAS_NIVEL_2
      },
      uso: {
        canchas,
        limite: Number.isFinite(limiteCanchas(subscription.plan))
          ? limiteCanchas(subscription.plan)
          : null
      },
      facturas: invoices
    });
  } catch (error) {
    next(error);
  }
};

// GET /subscriptions  (superadmin)
// Listado de todos los complejos con su estado de suscripción.
const listSubscriptions = async (req, res, next) => {
  try {
    const clubs = await Club.find().select('nombre slug plan estado createdAt').sort({ nombre: 1 });

    const subs = await Subscription.find({ club: { $in: clubs.map((c) => c._id) } });
    const subPorClub = new Map(subs.map((s) => [String(s.club), s]));

    // Facturas pendientes o vencidas, para mostrar la deuda de un vistazo.
    const impagas = await Invoice.aggregate([
      { $match: { estado: { $in: ['pendiente', 'vencida'] } } },
      { $group: { _id: '$club', total: { $sum: '$monto' }, cantidad: { $sum: 1 } } }
    ]);
    const deudaPorClub = new Map(impagas.map((d) => [String(d._id), d]));

    const filas = clubs.map((club) => {
      const sub = subPorClub.get(String(club._id)) || null;
      const deuda = deudaPorClub.get(String(club._id));

      return {
        _id: club._id,
        nombre: club.nombre,
        slug: club.slug,
        plan: club.plan,
        estado: club.estado,
        ciclo: sub?.ciclo || null,
        precio: sub?.precio || null,
        trialHasta: sub?.trialHasta || null,
        vigenciaHasta: sub?.vigenciaHasta || null,
        diasDeMora: sub ? diasDeMora(sub) : 0,
        deuda: deuda ? { monto: deuda.total, facturas: deuda.cantidad } : null,
        sinSuscripcion: !sub
      };
    });

    res.status(200).json({ ok: true, suscripciones: filas });
  } catch (error) {
    next(error);
  }
};

// PUT /subscriptions/club/:clubId  (superadmin)
// Cambia plan y/o ciclo. El precio se toma de la lista vigente al momento del
// cambio y queda congelado en la suscripción.
const updateSubscription = async (req, res, next) => {
  try {
    const { plan, ciclo, precio } = req.body;

    const club = await Club.findById(req.params.clubId);
    if (!club) {
      return res.status(404).json({ ok: false, message: 'Complejo no encontrado' });
    }

    if (plan && !PLAN_KEYS.includes(plan)) {
      return res.status(400).json({ ok: false, message: 'Plan inválido' });
    }
    if (ciclo && !CICLOS.includes(ciclo)) {
      return res.status(400).json({ ok: false, message: 'Ciclo inválido' });
    }

    const subscription = await ensureSubscription(club);

    if (plan) subscription.plan = plan;
    if (ciclo) subscription.ciclo = ciclo;

    // Precio explícito (acuerdo particular) o el de lista para plan+ciclo.
    subscription.precio =
      precio !== undefined ? precio : precioDe(subscription.plan, subscription.ciclo);

    await subscription.save();

    // El plan del club acompaña al de la suscripción: es lo que consultan las
    // validaciones de límite de canchas.
    if (plan && club.plan !== plan) {
      await Club.updateOne({ _id: club._id }, { plan });
    }

    res.status(200).json({ ok: true, suscripcion: subscription });
  } catch (error) {
    next(error);
  }
};

// POST /subscriptions/club/:clubId/invoices  (superadmin)
// Emite la factura del período actual.
const createInvoice = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.clubId);
    if (!club) {
      return res.status(404).json({ ok: false, message: 'Complejo no encontrado' });
    }

    const subscription = await ensureSubscription(club);
    const periodo = req.body.periodo || periodoDe(new Date(), subscription.ciclo);

    const invoice = await emitirFactura({ club, subscription, periodo });

    // Avisa al complejo. El dedupeKey hace que reemitir el mismo período no
    // vuelva a escribirle.
    const aviso = await notificarFactura(club, invoice);

    res.status(201).json({
      ok: true,
      factura: invoice,
      // Para que el superadmin sepa si el club se enteró o hay que llamarlo.
      aviso: {
        enviado: Boolean(aviso.ok),
        motivo: aviso.ok ? null : aviso.skipped || aviso.error || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /subscriptions/invoices/:id/pay  (superadmin)
// Registra un pago hecho por fuera de la plataforma (transferencia, efectivo).
// Es la vía para cobrar mientras MercadoPago no esté integrado.
const payInvoiceManually = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ ok: false, message: 'Factura no encontrada' });
    }

    if (invoice.estado === 'anulada') {
      return res.status(400).json({ ok: false, message: 'La factura está anulada' });
    }

    const resultado = await acreditarPago(invoice, {
      metodoPago: req.body.metodoPago || 'transferencia',
      usuario: req.user._id,
      notas: req.body.notas
    });

    if (resultado.yaEstabaPaga) {
      return res.status(200).json({
        ok: true,
        message: 'La factura ya estaba pagada.',
        factura: resultado.invoice
      });
    }

    res.status(200).json({
      ok: true,
      message: 'Pago registrado.',
      factura: resultado.invoice,
      estado: resultado.estado,
      vigenciaHasta: resultado.subscription.vigenciaHasta
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlanes,
  getClubSubscription,
  listSubscriptions,
  updateSubscription,
  createInvoice,
  payInvoiceManually
};
