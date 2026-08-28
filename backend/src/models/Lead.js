const mongoose = require('mongoose');

// Pedido de demo desde la landing de complejos.
//
// Se guarda en base ADEMÁS de mandarnos el email. El envío es best-effort (ver
// utils/email.js): si Resend está caído o rechaza el mensaje, el pedido no
// lanza error y el usuario ve "listo" igual. Sin este registro, ese contacto
// se perdería sin que nadie se entere. La base es la fuente de verdad; el mail
// es sólo el aviso.

const leadSchema = new mongoose.Schema(
  {
    clubNombre: {
      type: String,
      required: [true, 'El nombre del complejo es obligatorio'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      trim: true,
      lowercase: true
    },
    telefono: {
      type: String,
      required: [true, 'El teléfono es obligatorio'],
      trim: true
    },
    canchas: {
      type: Number,
      min: 1,
      default: null
    },
    // Qué formulario lo originó. Hoy sólo la landing, pero el día que haya un
    // segundo punto de contacto conviene poder separarlos sin migrar nada.
    origen: {
      type: String,
      default: 'landing-demo',
      trim: true
    },
    estado: {
      type: String,
      enum: ['nuevo', 'contactado', 'descartado'],
      default: 'nuevo',
      index: true
    },
    // Si el aviso por email salió. Un lead con `avisado: false` es uno que sólo
    // existe acá: hay que mirarlo a mano.
    avisado: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lead', leadSchema);
