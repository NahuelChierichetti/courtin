const mongoose = require('mongoose');

const tarifaSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre de la tarifa es obligatorio'],
      trim: true
    },
    dias: {
      type: String,
      required: [true, 'Los días son obligatorios'],
      trim: true
    },
    horaInicio: {
      type: String,
      required: [true, 'La hora de inicio es obligatoria'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM inválido']
    },
    horaFin: {
      type: String,
      required: [true, 'La hora de fin es obligatoria'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM inválido']
    },
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    }
  },
  { _id: true }
);

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
    superficie: {
      type: String,
      trim: true
    },
    cubierta: {
      type: Boolean,
      default: true
    },
    jugadores: {
      type: Number,
      min: [3, 'Mínimo 3 jugadores'],
      max: [11, 'Máximo 11 jugadores']
    },
    estado: {
      type: String,
      enum: ['activa', 'inactiva', 'mantenimiento'],
      default: 'activa'
    },
    precio: {
      type: Number,
      min: [0, 'El precio no puede ser negativo']
    },
    tarifas: {
      type: [tarifaSchema],
      default: []
    },
    duracionTurno: {
      type: Number,
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