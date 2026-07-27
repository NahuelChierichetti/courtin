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
    // Cuándo confirmó su email. Null = todavía no lo hizo.
    //
    // La verificación es blanda a propósito: no bloquea el login ni el uso de
    // la plataforma, sólo muestra un aviso. Cortarle el acceso a un complejo
    // que se está dando de alta por un email que quedó en spam cuesta más de lo
    // que protege.
    emailVerifiedAt: {
      type: Date,
      default: null
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