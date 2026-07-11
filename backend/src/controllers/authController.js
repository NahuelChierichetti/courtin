const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Membership = require('../models/Membership');
const Club = require('../models/Club');
const ROLES = require('../config/roles');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

const buildUserResponse = (user) => {
  return {
    _id: user._id,
    nombre: user.nombre,
    email: user.email,
    estado: user.estado,
    globalRole: user.globalRole
  };
};

const register = async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe un usuario con ese email'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      nombre,
      email,
      password: hashedPassword
    });

    const token = generateToken(user._id);

    res.status(201).json({
      ok: true,
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

// Alta de complejo (onboarding del negocio): crea el usuario dueño, el club y
// la membresía tenant_admin que lo vincula. Distinto de `register`, que da de
// alta un cliente/jugador sin club.
const registerClub = async (req, res, next) => {
  try {
    const { owner = {}, club = {} } = req.body;
    const { nombre, email, password } = owner;
    const { nombre: clubNombre, slug } = club;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan datos del responsable (nombre, email y contraseña)'
      });
    }

    if (!clubNombre || !slug) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan datos del complejo (nombre y slug)'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe un usuario con ese email'
      });
    }

    const existingClub = await Club.findOne({ slug });
    if (existingClub) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe un complejo con ese slug'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      nombre,
      email,
      password: hashedPassword
    });

    const newClub = await Club.create({
      nombre: clubNombre,
      slug,
      direccion: club.direccion,
      ciudad: club.ciudad,
      provincia: club.provincia,
      telefono: club.telefono
    });

    await Membership.create({
      user: user._id,
      club: newClub._id,
      role: ROLES.TENANT_ADMIN
    });

    const token = generateToken(user._id);

    res.status(201).json({
      ok: true,
      token,
      user: buildUserResponse(user),
      club: newClub
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales inválidas'
      });
    }

    if (user.estado !== 'activo') {
      return res.status(403).json({
        ok: false,
        message: 'Usuario inactivo'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales inválidas'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      ok: true,
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const memberships = await Membership.find({
      user: req.user._id,
      estado: 'activo'
    }).populate('club', 'nombre slug estado timezone moneda');

    res.status(200).json({
      ok: true,
      user: req.user,
      memberships
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  registerClub,
  login,
  getMe
};