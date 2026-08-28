const ROLES = require('../config/roles');

/**
 * Filtro para buscar un recurso por id ACOTADO al club que el pedido tiene
 * autorizado.
 *
 * Existe porque `authorizeClubRoles` resuelve el club desde
 * `req.params.clubId || req.body.clubId || req.headers['x-club-id']`: en una
 * ruta que no lleva `:clubId` en el path (`/courts/:id`, `/cash/:id`), el
 * cliente manda SU propio club, el middleware confirma que es miembro de ese
 * club —cierto— y el controller se queda sin saber de quién es el recurso. Un
 * `findById(req.params.id)` ahí adentro alcanza para leer, editar o borrar la
 * cancha o el movimiento de caja de otro complejo. Los ids de cancha, además,
 * son públicos: salen del endpoint de disponibilidad sin autenticación.
 *
 * La fuente de verdad es `req.membership`, que es lo que el middleware
 * verificó contra la base, y no lo que vino en el pedido.
 *
 * Falla cerrado: sin membresía validada devuelve un filtro que no matchea
 * nada, para que una ruta montada por error sin `authorizeClubRoles` no quede
 * abierta en silencio.
 */
const esSuperadmin = (req) => req.user?.globalRole === ROLES.SUPERADMIN;

const scopedById = (req, id) => {
  if (esSuperadmin(req)) return { _id: id };

  const club = req.membership?.club;
  if (!club) return { _id: null };

  return { _id: id, club };
};

module.exports = { scopedById, esSuperadmin };
