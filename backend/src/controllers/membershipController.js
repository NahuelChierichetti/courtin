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

module.exports = {
  createMembership,
  getClubMemberships,
  getMyMemberships,
  updateMembership
};