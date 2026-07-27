const mongoose = require('mongoose');

// Tokens de un solo uso enviados por email: reset de contraseña, verificación
// de cuenta e invitaciones de staff.
//
// Guardamos el SHA-256 del token, nunca el token en claro. Si alguien accede a
// la base, no puede reusarlos: es el mismo criterio con el que se guardan las
// contraseñas. (Distinto del `manageToken` de Reservation, que es un
// identificador permanente y no una credencial de un solo uso.)
const tokenSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ['password-reset', 'email-verify', 'staff-invite'],
      required: [true, 'El tipo de token es obligatorio']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    // Para invitaciones: el destinatario todavía no tiene cuenta.
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null
    },
    tokenHash: {
      type: String,
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    usedAt: {
      type: Date,
      default: null
    },
    // Datos extra según el tipo (ej. club y rol de una invitación).
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

// TTL: Mongo borra solo los documentos vencidos, así la colección no crece
// indefinidamente. El barrido corre cada ~60s, por eso la validez igual se
// chequea en código y no se confía en que el documento ya no exista.
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tokenSchema.index({ user: 1, tipo: 1 });

module.exports = mongoose.model('Token', tokenSchema);
