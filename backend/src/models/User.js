const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo'
    },
    globalRole: {
      type: String,
      enum: ['superadmin'],
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);