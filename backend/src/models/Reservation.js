const mongoose = require('mongoose');

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
    creadaPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario creador es obligatorio']
    }
  },
  {
    timestamps: true
  }
);

reservationSchema.index({ club: 1, court: 1, inicio: 1, fin: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);