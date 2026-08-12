const mongoose = require('mongoose');

// Complejo guardado por un jugador.
//
// Colección aparte en vez de un array en `User`: el par (jugador, complejo) es
// la unidad natural, el índice único hace idempotente el "marcar favorito" sin
// leer antes, y guardar `createdAt` permite ordenar por cuándo lo guardó.
const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    club: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true
    }
  },
  { timestamps: true }
);

// Un jugador no puede guardar dos veces el mismo complejo. Es también lo que
// permite usar `updateOne(..., { upsert: true })` como alta idempotente.
favoriteSchema.index({ user: 1, club: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
