const mongoose = require('mongoose');

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
    plan: {
      type: String,
      enum: ['starter', 'pro', 'business', 'enterprise'],
      default: 'starter'
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo', 'trial', 'suspendido', 'cancelado', 'impago'],
      default: 'trial'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Club', clubSchema);