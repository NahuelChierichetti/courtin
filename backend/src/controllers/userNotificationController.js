const UserNotification = require('../models/UserNotification');

// Todo lo de acá se acota por `req.user._id`. Ese filtro es la autorización:
// no hay forma de pedir las notificaciones de otro jugador.

// GET /me/notifications — últimas notificaciones + cuántas sin leer.
const getMyNotifications = async (req, res, next) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      UserNotification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('club', 'nombre slug'),
      UserNotification.countDocuments({ user: req.user._id, leida: false })
    ]);

    res.status(200).json({ ok: true, notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// PATCH /me/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await UserNotification.updateMany(
      { user: req.user._id, leida: false },
      { leida: true }
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};

// PATCH /me/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const notification = await UserNotification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { leida: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ ok: false, message: 'Notificación no encontrada' });
    }

    res.status(200).json({ ok: true, notification });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyNotifications, markAllRead, markRead };
