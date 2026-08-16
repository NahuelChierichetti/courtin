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
    // Obligatoria salvo que la cuenta venga de Google, donde no hay contraseña
    // que pedir: quien inicia sesión con el botón nunca elige una.
    //
    // Esas cuentas quedan con `password: null`, así que todo lo que compare
    // contra este campo tiene que contemplar el caso (ver changePassword). Una
    // cuenta de Google puede sumar contraseña después —desde "olvidé mi
    // contraseña"— y a partir de ahí entra por los dos caminos.
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        'La contraseña es obligatoria'
      ],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false,
      default: null
    },
    // `sub` de Google: su identificador estable de la cuenta.
    //
    // La identidad canónica es ésta y no el email a propósito. El email de una
    // cuenta de Google puede cambiar (pasa en Workspace); si la búsqueda fuera
    // por email, ese día se crearía un usuario duplicado y la persona perdería
    // sus reservas, favoritos y notificaciones.
    //
    // `sparse` porque la enorme mayoría de las cuentas no lo tiene, y sin eso el
    // índice único chocaría entre todos los `null`.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      default: null
    },
    // Foto de perfil de Google. Decorativa: si el día de mañana la URL deja de
    // resolver, la interfaz cae a las iniciales como con cualquier otra cuenta.
    avatar: {
      type: String,
      trim: true,
      default: null
    },
    // Teléfono de contacto. Opcional: la cuenta se crea sólo con nombre, email
    // y contraseña, y el jugador lo completa después desde su cuenta. Cuando
    // está cargado, precarga el formulario de reserva y le llega al complejo.
    telefono: {
      type: String,
      trim: true,
      default: null
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