const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio']
    },
    nombre: {
      type: String,
      required: [true, 'El nombre de la cancha es obligatorio'],
      trim: true
    },
    tipo: {
      type: String,
      enum: ['futbol', 'padel', 'tenis', 'basquet', 'otro'],
      default: 'futbol'
    },
    estado: {
      type: String,
      enum: ['activa', 'inactiva', 'mantenimiento'],
      default: 'activa'
    },
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    duracionTurno: {
      type: Number,
      required: [true, 'La duración del turno es obligatoria'],
      min: [30, 'La duración mínima es de 30 minutos'],
      default: 60
    },
    descripcion: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Court', courtSchema);