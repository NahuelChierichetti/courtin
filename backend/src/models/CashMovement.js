const mongoose = require('mongoose');

// Movimiento de caja de un complejo: ingresos (pagos de reservas online, saldos
// en persona, alquileres, ventas) y egresos (gastos, retiros). Es el libro de
// caja que alimenta la vista de "Control de caja".

// Categorías de ingreso y egreso. 'otro' es compartido.
const CATEGORIAS_INGRESO = ['reserva', 'saldo', 'alquiler', 'venta', 'otro'];
const CATEGORIAS_EGRESO = ['gasto', 'retiro', 'otro'];
const CATEGORIAS = [...new Set([...CATEGORIAS_INGRESO, ...CATEGORIAS_EGRESO])];

const METODOS = ['efectivo', 'mercadopago', 'tarjeta', 'transferencia', 'otro'];

const cashMovementSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio'],
      index: true
    },
    tipo: {
      type: String,
      enum: ['ingreso', 'egreso'],
      required: [true, 'El tipo es obligatorio']
    },
    categoria: {
      type: String,
      enum: CATEGORIAS,
      required: [true, 'La categoría es obligatoria']
    },
    concepto: {
      type: String,
      trim: true,
      default: ''
    },
    monto: {
      type: Number,
      required: [true, 'El monto es obligatorio'],
      min: [0, 'El monto no puede ser negativo']
    },
    metodoPago: {
      type: String,
      enum: METODOS,
      default: 'efectivo'
    },
    // 'online' = generado por un pago desde la plataforma; 'manual' = cargado
    // por el complejo en el mostrador.
    origen: {
      type: String,
      enum: ['online', 'manual'],
      default: 'manual'
    },
    // Vínculos opcionales.
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null
    },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court',
      default: null
    },
    // Fecha "de negocio" del movimiento (cuándo ocurrió). Puede diferir de
    // createdAt si se carga a posteriori.
    fecha: {
      type: Date,
      default: Date.now,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notas: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { timestamps: true }
);

cashMovementSchema.index({ club: 1, fecha: -1 });

module.exports = mongoose.model('CashMovement', cashMovementSchema);
module.exports.CATEGORIAS_INGRESO = CATEGORIAS_INGRESO;
module.exports.CATEGORIAS_EGRESO = CATEGORIAS_EGRESO;
module.exports.METODOS = METODOS;
