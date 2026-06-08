const bcrypt = require('bcryptjs');
const Club = require('../models/Club');
const Court = require('../models/Court');
const Membership = require('../models/Membership');
const Reservation = require('../models/Reservation');
const User = require('../models/User');

const getAdminClubs = async (req, res, next) => {
  try {
    const { search, plan, estado, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { nombre: regex },
        { ciudad: regex },
        { provincia: regex },
      ];
    }

    if (plan) {
      filter.plan = plan;
    }

    if (estado) {
      filter.estado = estado;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [clubs, total] = await Promise.all([
      Club.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Club.countDocuments(filter),
    ]);

    const clubIds = clubs.map((c) => c._id);

    const [courtCounts, owners, lastReservations] = await Promise.all([
      Court.aggregate([
        { $match: { club: { $in: clubIds } } },
        { $group: { _id: '$club', count: { $sum: 1 } } },
      ]),
      Membership.find({
        club: { $in: clubIds },
        role: 'tenant_admin',
        estado: 'activo',
      })
        .populate('user', 'nombre email')
        .lean(),
      Reservation.aggregate([
        { $match: { club: { $in: clubIds } } },
        { $group: { _id: '$club', lastActivity: { $max: '$updatedAt' } } },
      ]),
    ]);

    const courtCountMap = Object.fromEntries(courtCounts.map((c) => [c._id.toString(), c.count]));
    const ownerMap = {};
    for (const m of owners) {
      const cid = m.club.toString();
      if (!ownerMap[cid]) ownerMap[cid] = m.user;
    }
    const activityMap = Object.fromEntries(lastReservations.map((r) => [r._id.toString(), r.lastActivity]));

    const enrichedClubs = clubs.map((club) => {
      const cid = club._id.toString();
      const clubActivity = activityMap[cid] || club.updatedAt;
      return {
        ...club,
        canchas: courtCountMap[cid] || 0,
        owner: ownerMap[cid] || null,
        ultimaActividad: clubActivity,
      };
    });

    const totalActivos = await Club.countDocuments({ estado: 'activo' });
    const totalAll = await Club.countDocuments();

    res.status(200).json({
      ok: true,
      clubs: enrichedClubs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      stats: {
        total: totalAll,
        activos: totalActivos,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getAdminClubById = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id).lean();

    if (!club) {
      return res.status(404).json({ ok: false, message: 'Club no encontrado' });
    }

    const [courts, owner, memberships] = await Promise.all([
      Court.find({ club: club._id }).lean(),
      Membership.findOne({ club: club._id, role: 'tenant_admin', estado: 'activo' })
        .populate('user', 'nombre email')
        .lean(),
      Membership.find({ club: club._id, estado: 'activo' })
        .populate('user', 'nombre email')
        .lean(),
    ]);

    res.status(200).json({
      ok: true,
      club: {
        ...club,
        canchas: courts.length,
        courts,
        owner: owner?.user || null,
        memberships,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createAdminClub = async (req, res, next) => {
  try {
    const { nombre, slug, direccion, ciudad, provincia, telefono, plan, estado } = req.body;

    const existingClub = await Club.findOne({ slug });
    if (existingClub) {
      return res.status(400).json({ ok: false, message: 'Ya existe un club con ese slug' });
    }

    const club = await Club.create({
      nombre,
      slug,
      direccion,
      ciudad,
      provincia,
      telefono,
      plan: plan || 'starter',
      estado: estado || 'trial',
    });

    res.status(201).json({
      ok: true,
      message: 'Complejo creado con éxito',
      club,
    });
  } catch (error) {
    next(error);
  }
};

const updateAdminClub = async (req, res, next) => {
  try {
    const { nombre, slug, direccion, ciudad, provincia, telefono, plan, estado } = req.body;

    const club = await Club.findByIdAndUpdate(
      req.params.id,
      { nombre, slug, direccion, ciudad, provincia, telefono, plan, estado },
      { new: true, runValidators: true }
    );

    if (!club) {
      return res.status(404).json({ ok: false, message: 'Club no encontrado' });
    }

    res.status(200).json({
      ok: true,
      message: 'Complejo actualizado con éxito',
      club,
    });
  } catch (error) {
    next(error);
  }
};

const suspendAdminClub = async (req, res, next) => {
  try {
    const club = await Club.findById(req.params.id);

    if (!club) {
      return res.status(404).json({ ok: false, message: 'Club no encontrado' });
    }

    club.estado = club.estado === 'suspendido' ? 'activo' : 'suspendido';
    await club.save();

    res.status(200).json({
      ok: true,
      message: club.estado === 'suspendido' ? 'Complejo suspendido' : 'Complejo reactivado',
      club,
    });
  } catch (error) {
    next(error);
  }
};

const getAdminUsers = async (req, res, next) => {
  try {
    const { search, role, clubId, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [{ nombre: regex }, { email: regex }];
    }

    let userIdsFromMembership = null;

    if (role || clubId) {
      const membershipFilter = {};
      if (role) membershipFilter.role = role;
      if (clubId) membershipFilter.club = clubId;
      const memberships = await Membership.find(membershipFilter).select('user').lean();
      userIdsFromMembership = memberships.map((m) => m.user);
      filter._id = { $in: userIdsFromMembership };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);
    const memberships = await Membership.find({ user: { $in: userIds } })
      .populate('club', 'nombre slug estado')
      .lean();

    const membershipMap = {};
    for (const m of memberships) {
      const uid = m.user.toString();
      if (!membershipMap[uid]) membershipMap[uid] = [];
      membershipMap[uid].push(m);
    }

    const enrichedUsers = users.map((user) => ({
      ...user,
      memberships: membershipMap[user._id.toString()] || [],
    }));

    res.status(200).json({
      ok: true,
      users: enrichedUsers,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
      stats: {
        total: await User.countDocuments(),
      },
    });
  } catch (error) {
    next(error);
  }
};

const createAdminUser = async (req, res, next) => {
  try {
    const { nombre, email, password, clubId, role } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ ok: false, message: 'Ya existe un usuario con ese email' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      nombre,
      email,
      password: hashedPassword,
    });

    let membership = null;
    if (clubId && role) {
      membership = await Membership.create({
        user: user._id,
        club: clubId,
        role,
        estado: 'activo',
      });
      membership = await Membership.findById(membership._id)
        .populate('club', 'nombre slug estado')
        .lean();
    }

    res.status(201).json({
      ok: true,
      message: 'Usuario creado con éxito',
      user: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        estado: user.estado,
        createdAt: user.createdAt,
        memberships: membership ? [membership] : [],
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateAdminUser = async (req, res, next) => {
  try {
    const { nombre, email, estado, password } = req.body;

    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (email !== undefined) updateData.email = email;
    if (estado !== undefined) updateData.estado = estado;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 6 caracteres' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    const memberships = await Membership.find({ user: user._id })
      .populate('club', 'nombre slug estado')
      .lean();

    res.status(200).json({
      ok: true,
      message: 'Usuario actualizado con éxito',
      user: { ...user, memberships },
    });
  } catch (error) {
    next(error);
  }
};

const assignUserToClub = async (req, res, next) => {
  try {
    const { clubId, role } = req.body;
    const userId = req.params.id;

    const [user, club] = await Promise.all([
      User.findById(userId),
      Club.findById(clubId),
    ]);

    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }
    if (!club) {
      return res.status(404).json({ ok: false, message: 'Club no encontrado' });
    }

    const existing = await Membership.findOne({ user: userId, club: clubId });
    if (existing) {
      existing.role = role;
      existing.estado = 'activo';
      await existing.save();
      const populated = await Membership.findById(existing._id)
        .populate('club', 'nombre slug estado')
        .populate('user', 'nombre email estado')
        .lean();
      return res.status(200).json({ ok: true, message: 'Membership actualizado', membership: populated });
    }

    let membership = await Membership.create({
      user: userId,
      club: clubId,
      role,
      estado: 'activo',
    });

    membership = await Membership.findById(membership._id)
      .populate('club', 'nombre slug estado')
      .populate('user', 'nombre email estado')
      .lean();

    res.status(201).json({ ok: true, message: 'Usuario asignado al complejo', membership });
  } catch (error) {
    next(error);
  }
};

const removeUserFromClub = async (req, res, next) => {
  try {
    const membership = await Membership.findById(req.params.membershipId);

    if (!membership) {
      return res.status(404).json({ ok: false, message: 'Membership no encontrado' });
    }

    membership.estado = 'inactivo';
    await membership.save();

    res.status(200).json({ ok: true, message: 'Usuario removido del complejo' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminClubs,
  getAdminClubById,
  createAdminClub,
  updateAdminClub,
  suspendAdminClub,
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  assignUserToClub,
  removeUserFromClub,
};
