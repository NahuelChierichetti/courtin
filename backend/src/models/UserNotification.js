const mongoose = require('mongoose');

// Notificación dirigida a un jugador (campanita del sitio público).
//
// Modelo separado de `Notification` (que es del complejo) y no un campo más
// sobre aquél: las dos audiencias comparten cuatro campos y nada más. Difieren
// el destinatario, los tipos de evento, las rutas y los permisos. Con un solo
// modelo, además, cualquier consulta del backoffice que olvidara filtrar por
// destinatario le mostraría al complejo las notificaciones de sus jugadores.
const userNotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    // El complejo del que habla la notificación. Opcional: los avisos de la
    // plataforma no cuelgan de ningún club.
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null
    },
    tipo: {
      type: String,
      enum: ['confirmacion', 'pago', 'cancelacion', 'recordatorio', 'sistema'],
      default: 'sistema'
    },
    titulo: {
      type: String,
      trim: true,
      required: true
    },
    mensaje: {
      type: String,
      trim: true,
      default: ''
    },
    leida: {
      type: Boolean,
      default: false
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null
    },
    // Evita duplicados de eventos que se disparan más de una vez a propósito.
    // El caso concreto es el recordatorio de turno: el job usa una ventana ancha
    // de 2 h para sobrevivir a corridas salteadas, así que la misma reserva pasa
    // por ahí varias veces. Igual que el `dedupeKey` de los emails.
    //
    // Sin `default`: el campo tiene que quedar AUSENTE cuando no se usa, no en
    // `null`. Ver el índice de abajo.
    dedupeKey: {
      type: String
    }
  },
  { timestamps: true }
);

userNotificationSchema.index({ user: 1, createdAt: -1 });

// Índice parcial, no `sparse`. `sparse` sólo excluye los documentos donde el
// campo está ausente, y basta un `default: null` en el schema para que deje de
// estarlo: entonces todas las notificaciones sin dedupe comparten la clave
// `null` y la segunda choca contra el índice único. El filtro por tipo `string`
// es explícito y no depende de cómo esté declarado el campo.
userNotificationSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);

module.exports = mongoose.model('UserNotification', userNotificationSchema);
