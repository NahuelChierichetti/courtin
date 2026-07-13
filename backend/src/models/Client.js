const mongoose = require('mongoose');

// Cliente de un complejo (CRM liviano). Se crea/actualiza automáticamente al
// hacer una reserva; la identidad es el par (club, email) — el email es la
// clave de deduplicación. Un mismo email puede ser cliente de varios clubes.

const clientSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio'],
      index: true
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      trim: true,
      lowercase: true
    },
    nombre: {
      type: String,
      trim: true,
      default: ''
    },
    telefono: {
      type: String,
      trim: true,
      default: ''
    },
    // Si el cliente tiene cuenta en la plataforma.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Estadísticas acumuladas.
    reservasCount: {
      type: Number,
      default: 0
    },
    totalGastado: {
      type: Number,
      default: 0
    },
    primeraReserva: {
      type: Date,
      default: null
    },
    ultimaReserva: {
      type: Date,
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

// La identidad del cliente dentro de un club es su email.
clientSchema.index({ club: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Client', clientSchema);
