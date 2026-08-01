const mongoose = require('mongoose');

const { MONEDA } = require('../config/plans');

// Factura de un período de suscripción del complejo con CourtIn.
//
// El cobro es siempre por fuera de la plataforma: el complejo se contacta con
// soporte, paga como acuerden, y un superadmin registra el pago desde el panel.
const invoiceSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio'],
      index: true
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null
    },
    // `2026-08` para el ciclo mensual, `2026` para el anual.
    periodo: {
      type: String,
      required: [true, 'El período es obligatorio'],
      trim: true
    },
    // Copia del plan y ciclo vigentes al emitir: si el club cambia de plan
    // después, la factura vieja tiene que seguir diciendo lo que se cobró.
    plan: {
      type: String,
      trim: true
    },
    ciclo: {
      type: String,
      trim: true
    },
    monto: {
      type: Number,
      required: [true, 'El monto es obligatorio'],
      min: [0, 'El monto no puede ser negativo']
    },
    moneda: {
      type: String,
      trim: true,
      uppercase: true,
      default: MONEDA
    },
    estado: {
      type: String,
      enum: ['pendiente', 'pagada', 'vencida', 'anulada'],
      default: 'pendiente',
      index: true
    },
    vencimiento: {
      type: Date,
      required: [true, 'El vencimiento es obligatorio']
    },
    pagadaEn: {
      type: Date,
      default: null
    },
    // El abono de la suscripción se cobra siempre por fuera de la plataforma y
    // se registra a mano desde el panel de superadmin. MercadoPago NO interviene
    // acá: es una función del complejo para cobrar las reservas de sus jugadores.
    metodoPago: {
      type: String,
      enum: ['transferencia', 'efectivo', 'otro'],
      default: null
    },
    // Quién registró el pago y por qué.
    registradaPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notas: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

// Impide facturar dos veces el mismo período, aunque el cron corra de más.
invoiceSchema.index({ club: 1, periodo: 1 }, { unique: true });
// Para el barrido de vencidas del dunning.
invoiceSchema.index({ estado: 1, vencimiento: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
