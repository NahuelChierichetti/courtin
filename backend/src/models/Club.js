const mongoose = require('mongoose');

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const diaSchema = new mongoose.Schema(
  {
    abierto: {
      type: Boolean,
      default: true
    },
    horaInicio: {
      type: String,
      match: [HORA_REGEX, 'Formato HH:MM inválido'],
      default: '08:00'
    },
    horaFin: {
      type: String,
      match: [HORA_REGEX, 'Formato HH:MM inválido'],
      default: '23:30'
    }
  },
  { _id: false }
);

const diaEspecialSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del día especial es obligatorio'],
      trim: true
    },
    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria']
    },
    tipo: {
      type: String,
      enum: ['cerrado', 'especial'],
      default: 'cerrado'
    },
    horaInicio: {
      type: String,
      match: [HORA_REGEX, 'Formato HH:MM inválido']
    },
    horaFin: {
      type: String,
      match: [HORA_REGEX, 'Formato HH:MM inválido']
    }
  },
  { _id: true }
);

const horariosSchema = new mongoose.Schema(
  {
    semanal: {
      lunes: { type: diaSchema, default: () => ({}) },
      martes: { type: diaSchema, default: () => ({}) },
      miercoles: { type: diaSchema, default: () => ({}) },
      jueves: { type: diaSchema, default: () => ({}) },
      viernes: { type: diaSchema, default: () => ({ horaFin: '00:30' }) },
      sabado: { type: diaSchema, default: () => ({ horaInicio: '09:00', horaFin: '00:30' }) },
      domingo: { type: diaSchema, default: () => ({ horaInicio: '09:00', horaFin: '22:00' }) }
    },
    diasEspeciales: {
      type: [diaEspecialSchema],
      default: []
    },
    reservas: {
      toleranciaCancelacionHoras: {
        type: Number,
        min: [0, 'La tolerancia no puede ser negativa'],
        default: 4
      },
      anticipacionMaximaDias: {
        type: Number,
        min: [1, 'La anticipación mínima es de 1 día'],
        default: 15
      }
    }
  },
  { _id: false }
);

const clubSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre del club es obligatorio'],
      trim: true
    },
    slug: {
      type: String,
      required: [true, 'El slug es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true
    },
    direccion: {
      type: String,
      trim: true
    },
    ciudad: {
      type: String,
      trim: true
    },
    provincia: {
      type: String,
      trim: true
    },
    telefono: {
      type: String,
      trim: true
    },
    whatsapp: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    timezone: {
      type: String,
      trim: true,
      default: 'America/Argentina/Buenos_Aires'
    },
    moneda: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ARS'
    },
    plan: {
      type: String,
      enum: ['starter', 'pro', 'business', 'enterprise'],
      default: 'starter'
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo', 'trial', 'suspendido', 'cancelado', 'impago'],
      default: 'trial'
    },
    horarios: {
      type: horariosSchema,
      default: () => ({})
    },
    // --- Perfil público (para la card de descubrimiento/reserva) ---
    descripcion: {
      type: String,
      trim: true
    },
    // URLs a object storage (Cloudinary/S3); la subida se resuelve en infra.
    logo: {
      type: String,
      trim: true
    },
    fotos: {
      type: [String],
      default: []
    },
    // Coordenadas para el mapa. El picker/geocoding se resuelve en el frontend.
    ubicacion: {
      lat: { type: Number },
      lng: { type: Number }
    },
    servicios: {
      type: [String],
      default: []
    },
    // Opt-in: el club no aparece en la interfaz pública hasta activarlo.
    publicado: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Club', clubSchema);