const mongoose = require('mongoose');

// Registro de cada email que intentamos mandar. Cumple dos funciones:
//
//  1. Auditoría: saber si al cliente que reclama "no me llegó nada" realmente
//     se le envió algo, cuándo y con qué resultado.
//  2. Idempotencia: `dedupeKey` impide mandar dos veces el mismo email. Es
//     imprescindible para los crons — sin esto, un cron que se reintenta le
//     manda el recordatorio de las 24 h tres veces al mismo jugador.
const emailLogSchema = new mongoose.Schema(
  {
    // Identificador del email dentro del sistema, ej. 'reservation-confirmed'.
    template: {
      type: String,
      required: true,
      index: true
    },
    to: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    subject: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pendiente', 'enviado', 'fallido'],
      default: 'pendiente'
    },
    // ID que devuelve Resend: sirve para rastrear el envío en su panel.
    providerId: {
      type: String,
      default: null
    },
    error: {
      type: String,
      default: null
    },
    // A qué se refiere el email (reserva, usuario, club). String suelto a
    // propósito: no todos los emails apuntan a la misma colección.
    refId: {
      type: String,
      default: null,
      index: true
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      default: null
    },
    // Clave de deduplicación, opcional. Presente = "este email se manda una
    // sola vez". Ausente = se puede repetir (ej. pedir otro reset de clave).
    dedupeKey: {
      type: String
    }
  },
  { timestamps: true }
);

// Único y sparse: sparse indexa solo los documentos que TIENEN el campo, así
// los emails repetibles (sin dedupeKey) no chocan entre sí.
//
// Importante: para liberar una clave hay que hacer $unset del campo, no
// ponerlo en null — un null está "presente" y sparse igual lo indexaría.
emailLogSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
emailLogSchema.index({ club: 1, createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
