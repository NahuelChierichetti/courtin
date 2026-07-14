const Notification = require('../models/Notification');

const clubIdFrom = (req) => req.query.clubId || req.body?.clubId || req.headers['x-club-id'] || null;

// GET /notifications?clubId=  → últimas notificaciones + no leídas.
const getNotifications = async (req, res, next) => {
  try {
    const clubId = clubIdFrom(req);
    if (!clubId) return res.status(400).json({ ok: false, message: 'Debes indicar un clubId' });

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ club: clubId }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ club: clubId, leida: false })
    ]);

    res.status(200).json({ ok: true, notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// PATCH /notifications/read-all — marca todas como leídas.
const markAllRead = async (req, res, next) => {
  try {
    const clubId = clubIdFrom(req);
    if (!clubId) return res.status(400).json({ ok: false, message: 'Debes indicar un clubId' });
    await Notification.updateMany({ club: clubId, leida: false }, { leida: true });
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
};

// PATCH /notifications/:id/read — marca una como leída.
const markRead = async (req, res, next) => {
  try {
    const clubId = clubIdFrom(req);
    const notif = await Notification.findById(req.params.id);
    if (!notif || (clubId && notif.club.toString() !== clubId)) {
      return res.status(404).json({ ok: false, message: 'Notificación no encontrada' });
    }
    notif.leida = true;
    await notif.save();
    res.status(200).json({ ok: true, notification: notif });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markAllRead, markRead };
