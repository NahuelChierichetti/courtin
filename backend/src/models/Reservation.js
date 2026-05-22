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
    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria']
    },
    horaInicio: {
      type: String,
      required: [true, 'La hora de inicio es obligatoria'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido']
    },
    horaFin: {
      type: String,
      required: [true, 'La hora de fin es obligatoria'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido']
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

reservationSchema.index({ club: 1, court: 1, fecha: 1, horaInicio: 1, horaFin: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);