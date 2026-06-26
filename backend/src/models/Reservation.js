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