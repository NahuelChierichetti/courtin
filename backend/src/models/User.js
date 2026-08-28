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
    // El índice único va abajo, como índice PARCIAL y no `sparse`: ver la nota
    // al pie del schema.
    googleId: {
      type: String,
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

// Único sobre el googleId, pero indexando SÓLO las cuentas que tienen uno de
// verdad (un string).
//
// Antes era `unique + sparse` con `default: null`, y esa combinación no
// funciona: `sparse` saltea los documentos donde el campo está AUSENTE, pero un
// `null` está presente. Como toda cuenta nueva nace con `googleId: null` por el
// default, la primera se quedaba con el único lugar disponible para el null y
// **la siguiente registración fallaba** con "Ya existe un registro con ese
// googleId". Es la misma trampa que ya está documentada en `EmailLog.dedupeKey`,
// que la evita no poniéndole default.
//
// `partialFilterExpression` lo resuelve sin depender del default: los `null` y
// los ausentes quedan fuera del índice, y dos cuentas de Google con el mismo id
// siguen sin poder coexistir, que es lo único que este índice tiene que impedir.
userSchema.index(
  { googleId: 1 },
  { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } }
);

module.exports = mongoose.model('User', userSchema);