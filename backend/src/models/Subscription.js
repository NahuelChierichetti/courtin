const mongoose = require('mongoose');

const { PLAN_KEYS, CICLOS, MONEDA } = require('../config/plans');

// Suscripción de un complejo a CourtIn. Una por club.
//
// Guarda QUÉ contrató y HASTA CUÁNDO está paga. El estado de acceso efectivo
// (activo / impago / suspendido) no se guarda acá: se calcula a partir de estas
// fechas en `utils/subscriptions.js` y se refleja en `Club.estado`, que es lo
// que consultan las lecturas.
const subscriptionSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio'],
      unique: true
    },
    plan: {
      type: String,
      enum: PLAN_KEYS,
      default: 'start'
    },
    // El anual es un pago único adelantado por 12 meses, no 12 cuotas.
    ciclo: {
      type: String,
      enum: CICLOS,
      default: 'mensual'
    },
    // Precio del ciclo contratado, congelado al momento de contratar. Un aumento
    // de la lista de precios no afecta a quien ya está suscripto.
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    moneda: {
      type: String,
      trim: true,
      uppercase: true,
      default: MONEDA
    },
    // Fin de la prueba gratis. Null en un club que nunca tuvo trial.
    trialHasta: {
      type: Date,
      default: null
    },
    // Hasta cuándo está paga. Es la fecha desde la que se cuenta la mora, y por
    // lo tanto la que determina el acceso.
    vigenciaHasta: {
      type: Date,
      default: null
    },
    canceladaEn: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Para el cron de dunning: barre por vencimiento.
subscriptionSchema.index({ vigenciaHasta: 1 });
subscriptionSchema.index({ trialHasta: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
