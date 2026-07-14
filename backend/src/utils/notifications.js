const Notification = require('../models/Notification');

// Crea una notificación del complejo. Best-effort: nunca debe romper el flujo
// que la dispara.
const notify = async (clubId, { tipo, titulo, mensaje, reservation } = {}) => {
  try {
    if (!clubId || !titulo) return null;
    return await Notification.create({
      club: clubId,
      tipo: tipo || 'sistema',
      titulo,
      mensaje: mensaje || '',
      reservation: reservation || null
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo crear la notificación:', err.message);
    return null;
  }
};

module.exports = { notify };
