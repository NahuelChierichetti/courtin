const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Membership = require('../models/Membership');
const ROLES = require('../config/roles');

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        ok: false,
        message: 'No autorizado, falta token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'Usuario no encontrado'
      });
    }

    if (user.estado !== 'activo') {
      return res.status(403).json({
        ok: false,
        message: 'Usuario inactivo'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Token inválido o vencido'
    });
  }
};

// Autenticación opcional: si viene un token válido de un usuario activo, setea
// req.user; si no hay token o es inválido, sigue sin cortar. Se usa en rutas
// públicas que se enriquecen cuando el que las llama está logueado (p.ej.
// asociar una reserva pública a la cuenta del cliente).
const attachUserOptional = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return next();
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user && user.estado === 'activo') {
      req.user = user;
    }
  } catch (error) {
    // Token inválido/vencido: se ignora y se sigue como anónimo.
  }

  next();
};

const authorizeSuperadmin = (req, res, next) => {
  if (req.user.globalRole !== ROLES.SUPERADMIN) {
    return res.status(403).json({
      ok: false,
      message: 'Acceso denegado'
    });
  }

  next();
};

const authorizeClubRoles = (...roles) => {
  return async (req, res, next) => {
    try {
      if (req.user.globalRole === ROLES.SUPERADMIN) {
        return next();
      }

      const clubId = req.params.clubId || req.body?.clubId || req.headers['x-club-id'];

      if (!clubId) {
        return res.status(400).json({
          ok: false,
          message: 'Debes indicar un clubId'
        });
      }

      const membership = await Membership.findOne({
        user: req.user._id,
        club: clubId,
        estado: 'activo'
      });

      if (!membership) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes acceso a este club'
        });
      }

      if (roles.length > 0 && !roles.includes(membership.role)) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos suficientes'
        });
      }

      req.membership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  protect,
  attachUserOptional,
  authorizeSuperadmin,
  authorizeClubRoles
};