const mongoose = require('mongoose');
const crypto = require('crypto');

const reservationSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio']
    },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court',
      required: [true, 'La cancha es obligatoria']
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    guestName: {
      type: String,
      trim: true,
      default: null
    },
    guestPhone: {
      type: String,
      trim: true,
      default: null
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },
    inicio: {
      type: Date,
      required: [true, 'El inicio es obligatorio']
    },
    fin: {
      type: Date,
      required: [true, 'El fin es obligatorio']
    },
    estado: {
      type: String,
      enum: ['pendiente', 'confirmada', 'cancelada', 'completada'],
      default: 'confirmada'
    },
    precioFinal: {
      type: Number,
      min: [0, 'El precio final no puede ser negativo']
    },
    notas: {
      type: String,
      trim: true
    },
    // Quién la creó internamente (admin/empleado). Null en reservas públicas
    // hechas por un invitado sin cuenta.
    creadaPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Origen de la reserva: backoffice (admin) o pública (web del jugador).
    origen: {
      type: String,
      enum: ['backoffice', 'publica'],
      default: 'backoffice'
    },
    // Token de gestión: prueba de propiedad para que un invitado (sin cuenta)
    // pueda ver/cancelar SU reserva vía link, sin poder tocar las de otros.
    // Es aleatorio e impredecible; nunca se expone en los listados.
    manageToken: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomBytes(24).toString('hex')
    },
    // Estado del cobro online. El detalle de cada intento vive en `Payment`;
    // acá queda el resumen, que es lo que necesitan el panel y los emails.
    //
    // `no_requerido` por defecto: las reservas del backoffice y las anteriores
    // a los pagos online no se cobran por acá y quedan bien sin migración.
    pago: {
      estado: {
        type: String,
        enum: ['no_requerido', 'pendiente', 'pagado', 'reembolsado'],
        default: 'no_requerido'
      },
      tipo: {
        type: String,
        enum: ['sena', 'total'],
        default: null
      },
      montoPagado: {
        type: Number,
        default: 0
      },
      // Lo que el jugador todavía debe pagar en el complejo (seña).
      saldoPendiente: {
        type: Number,
        default: 0
      }
    },
    // Vencimiento del bloqueo del horario mientras el jugador está pagando.
    //
    // La reserva nace `pendiente` para que el índice único de abajo le reserve
    // el slot, pero si nadie paga hay que soltarlo: sin esto, cada checkout
    // abandonado dejaría un horario muerto para siempre. Lo limpia el job de
    // `jobs/reservationHolds.js`.
    expiraEn: {
      type: Date,
      default: null,
      index: true
    }
  },
  {
    timestamps: true
  }
);

reservationSchema.index({ club: 1, court: 1, inicio: 1, fin: 1 });

// Backstop de concurrencia: impide que dos reservas activas ocupen exactamente
// el mismo inicio en la misma cancha. La validación de solapamiento parcial
// sigue en el controlador; este índice cierra la ventana de carrera (TOCTOU)
// del caso más común: dos personas tomando el mismo slot al mismo tiempo.
reservationSchema.index(
  { court: 1, inicio: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: { $in: ['pendiente', 'confirmada'] } }
  }
);

module.exports = mongoose.model('Reservation', reservationSchema);