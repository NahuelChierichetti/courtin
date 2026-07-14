const mongoose = require('mongoose');

// Notificación interna del complejo (aparece en la campanita del backoffice).
// Se genera automáticamente ante eventos: nueva reserva, cancelación, nuevo
// cliente, etc.
const notificationSchema = new mongoose.Schema(
  {
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: [true, 'El club es obligatorio'],
      index: true
    },
    tipo: {
      type: String,
      enum: ['reserva', 'cancelacion', 'cliente', 'pago', 'sistema'],
      default: 'sistema'
    },
    titulo: {
      type: String,
      trim: true,
      required: [true, 'El título es obligatorio']
    },
    mensaje: {
      type: String,
      trim: true,
      default: ''
    },
    leida: {
      type: Boolean,
      default: false,
      index: true
    },
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      default: null
    }
  },
  { timestamps: true }
);

notificationSchema.index({ club: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
