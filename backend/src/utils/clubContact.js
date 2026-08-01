const Membership = require('../models/Membership');
const User = require('../models/User');
const ROLES = require('../config/roles');

// A qué dirección le escribe la plataforma a un complejo.
//
// La fuente de verdad es `Club.email`, que el complejo configura en su perfil.
// Ahí van las facturas, los avisos de deuda y las notificaciones de reservas.
//
// Si todavía no lo cargó, se cae a los administradores del club: es preferible
// que una factura llegue a la casilla personal del dueño antes que no llegue a
// ningún lado. El fallback se informa en el resultado para poder avisarle que
// complete el dato.

/**
 * @returns {Promise<{ to: string[], usoFallback: boolean }>}
 *          `to` vacío significa que no hay a quién escribirle.
 */
const emailsDelClub = async (club) => {
  const configurado = (club?.email || '').trim();

  if (configurado) {
    return { to: [configurado], usoFallback: false };
  }

  // Sin email configurado: los tenant_admin activos del club.
  const memberships = await Membership.find({
    club: club._id,
    role: ROLES.TENANT_ADMIN,
    estado: 'activo'
  }).select('user');

  if (memberships.length === 0) {
    return { to: [], usoFallback: true };
  }

  const admins = await User.find({
    _id: { $in: memberships.map((m) => m.user) },
    estado: 'activo'
  }).select('email');

  return {
    to: admins.map((a) => a.email).filter(Boolean),
    usoFallback: true
  };
};

module.exports = { emailsDelClub };
