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
    telefono: {
      type: String,
      trim: true
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Club', clubSchema);