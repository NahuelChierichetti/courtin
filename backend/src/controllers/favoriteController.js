const Favorite = require('../models/Favorite');
const Club = require('../models/Club');

// Lo mismo que muestra una card del buscador: la vista de favoritos reusa
// `ClubCard`, así que necesita los mismos campos.
const CLUB_FIELDS = 'nombre slug direccion ciudad deportes fotos moneda horarios timezone estado';

// GET /favorites — complejos guardados por el jugador, el último primero.
const getFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('club', CLUB_FIELDS);

    // Un club borrado (soft delete) deja de poblarse y quedaría como `null`.
    // Se filtra en vez de devolver huecos que la vista tendría que esquivar.
    const clubs = favorites.map((f) => f.club).filter(Boolean);

    res.status(200).json({ ok: true, clubs });
  } catch (error) {
    next(error);
  }
};

// POST /favorites/:clubId — guarda un complejo. Idempotente.
const addFavorite = async (req, res, next) => {
  try {
    const { clubId } = req.params;

    const club = await Club.findById(clubId).select('_id');
    if (!club) {
      return res.status(404).json({ ok: false, message: 'Complejo no encontrado' });
    }

    // `upsert` en vez de leer-y-crear: el índice único resuelve la carrera de
    // dos toques seguidos al corazón sin devolver un 500 por duplicado.
    await Favorite.updateOne(
      { user: req.user._id, club: clubId },
      { $setOnInsert: { user: req.user._id, club: clubId } },
      { upsert: true }
    );

    res.status(200).json({ ok: true, favorito: true });
  } catch (error) {
    next(error);
  }
};

// DELETE /favorites/:clubId — deja de seguir un complejo. Idempotente.
const removeFavorite = async (req, res, next) => {
  try {
    await Favorite.deleteOne({ user: req.user._id, club: req.params.clubId });
    res.status(200).json({ ok: true, favorito: false });
  } catch (error) {
    next(error);
  }
};

// Ids de los complejos que el usuario tiene guardados, como Set de strings.
// Lo usa el buscador público para marcar el corazón sin una consulta por card.
const favoriteClubIdSet = async (userId) => {
  if (!userId) return new Set();
  const ids = await Favorite.find({ user: userId }).distinct('club');
  return new Set(ids.map((id) => id.toString()));
};

module.exports = { getFavorites, addFavorite, removeFavorite, favoriteClubIdSet };
