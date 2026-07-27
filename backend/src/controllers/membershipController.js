const Membership = require('../models/Membership');
const User = require('../models/User');
const Club = require('../models/Club');
const ROLES = require('../config/roles');

const createMembership = async (req, res, next) => {
    try {
        const { userId, clubId, role, estado } = req.body;

        if (role === ROLES.SUPERADMIN) {
            return res.status(400).json({ ok: false, message: 'No se puede asignar el rol SUPERADMIN a un usuario' });
        }

        const [user, club, existingMembership] = await Promise.all([
            User.findById(userId),
            Club.findById(clubId),
            Membership.findOne({ user: userId, club: clubId })
        ])

        if (!club) {
            return res.status(404).json({ ok: false, message: 'Club no encontrado' });
        }

        if (existingMembership) {
            return res.status(400).json({ ok: false, message: 'El usuario ya es miembro del club' });
        }

        const membership = await Membership.create({
            user: userId,
            club: clubId,
            role,
            estado
        });

        const populatedMembership = await Membership.findById(membership._id)
            .populate('user', 'nombre email estado globalRole')
            .populate('club', 'nombre slug estado');

        res.status(201).json({
            ok: true,
            membership: populatedMembership
        });
    } catch (error) {
        next(error);
    }
}

const getClubMemberships = async (req, res, next) => {
  try {
    const memberships = await Membership.find({ club: req.params.clubId })
      .populate('user', 'nombre email estado globalRole')
      .populate('club', 'nombre slug estado')
      .sort({ createdAt: -1 });

    res.status(200).json({
      ok: true,
      memberships
    });
  } catch (error) {
    next(error);
  }
};

const getMyMemberships = async (req, res, next) => {
  try {
    const memberships = await Membership.find({
      user: req.user._id,
      estado: 'activo'
    })
      .populate('club', 'nombre slug direccion telefono estado')
      .sort({ createdAt: -1 });

    res.status(200).json({
      ok: true,
      memberships
    });
  } catch (error) {
    next(error);
  }
};

const updateMembership = async (req, res, next) => {
  try {
    const { role, estado } = req.body;

    if (role === ROLES.SUPERADMIN) {
      return res.status(400).json({
        ok: false,
        message: 'El rol superadmin no se asigna mediante memberships'
      });
    }

    const membership = await Membership.findByIdAndUpdate(
      req.params.id,
      {
        role,
        estado
      },
      {
        new: true,
        runValidators: true
      }
    )
      .populate('user', 'nombre email estado globalRole')
      .populate('club', 'nombre slug estado');

    if (!membership) {
      return res.status(404).json({
        ok: false,
        message: 'Membership no encontrado'
      });
    }

    res.status(200).json({
      ok: true,
      membership
    });
  } catch (error) {
    next(error);
  }
};

// Roles que el dueño de un complejo puede asignar dentro de su equipo.
const MANAGEABLE_ROLES = [ROLES.TENANT_ADMIN, ROLES.EMPLOYEE];

// PUT /memberships/club/:clubId/:id
// Versión acotada de `updateMembership` para el dueño del complejo: sólo toca
// membresías de SU club y no puede fabricar roles que no le corresponden.
// El clubId va en la ruta porque es lo que `authorizeClubRoles` necesita para
// verificar la membresía de quien hace el pedido.
const updateClubMembership = async (req, res, next) => {
  try {
    const { clubId, id } = req.params;
    const { role, estado } = req.body;

    if (role !== undefined && !MANAGEABLE_ROLES.includes(role)) {
      return res.status(400).json({ ok: false, message: 'El rol debe ser tenant_admin o employee' });
    }

    if (estado !== undefined && !['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ ok: false, message: 'El estado debe ser activo o inactivo' });
    }

    const membership = await Membership.findOne({ _id: id, club: clubId });

    if (!membership) {
      return res.status(404).json({ ok: false, message: 'Ese miembro no pertenece a este complejo' });
    }

    // Nadie se edita a sí mismo: es la forma más fácil de quedarse afuera del
    // propio complejo por accidente (bajarse el rol o desactivarse).
    if (String(membership.user) === String(req.user._id)) {
      return res.status(400).json({ ok: false, message: 'No podés modificar tu propio acceso' });
    }

    // Un complejo sin ningún administrador activo queda huérfano: nadie podría
    // volver a invitar gente ni cambiar la configuración.
    const dejaDeSerAdmin =
      membership.role === ROLES.TENANT_ADMIN &&
      ((role !== undefined && role !== ROLES.TENANT_ADMIN) || estado === 'inactivo');

    if (dejaDeSerAdmin) {
      const adminsActivos = await Membership.countDocuments({
        club: clubId,
        role: ROLES.TENANT_ADMIN,
        estado: 'activo'
      });

      if (adminsActivos <= 1) {
        return res.status(400).json({
          ok: false,
          message: 'El complejo necesita al menos un administrador activo'
        });
      }
    }

    if (role !== undefined) membership.role = role;
    if (estado !== undefined) membership.estado = estado;
    await membership.save();

    const populated = await Membership.findById(membership._id)
      .populate('user', 'nombre email estado globalRole')
      .populate('club', 'nombre slug estado');

    res.status(200).json({ ok: true, membership: populated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMembership,
  getClubMemberships,
  getMyMemberships,
  updateMembership,
  updateClubMembership
};