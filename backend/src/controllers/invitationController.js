const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Club = require('../models/Club');
const Membership = require('../models/Membership');
const Token = require('../models/Token');
const ROLES = require('../config/roles');
const { issueToken, findValidToken, consumeToken } = require('../utils/tokens');
const { sendEmail } = require('../utils/email');
const { appUrl } = require('../utils/publicUrls');
const staffInviteEmail = require('../emails/templates/staffInvite');

// Invitaciones al equipo de un complejo.
//
// Reemplaza el circuito de `adminController.createAdminUser`, donde el admin
// elegía la contraseña del nuevo usuario y se la pasaba por fuera. Acá el
// invitado define su propia clave: nadie más que él la conoce.

const INVITE_TTL_DAYS = 7;

// Sólo roles de gestión: `customer` no es staff y `superadmin` no se asigna
// nunca por membresía.
const INVITABLE_ROLES = [ROLES.TENANT_ADMIN, ROLES.EMPLOYEE];

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /invitations
const createInvitation = async (req, res, next) => {
  try {
    const { clubId, role, nombre } = req.body;
    const email = (req.body.email || '').toLowerCase().trim();

    if (!email || !clubId || !role) {
      return res.status(400).json({ ok: false, message: 'Indicá email, complejo y rol' });
    }

    if (!INVITABLE_ROLES.includes(role)) {
      return res.status(400).json({ ok: false, message: 'El rol debe ser tenant_admin o employee' });
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ ok: false, message: 'Complejo no encontrado' });
    }

    // Si ya tiene cuenta, la invitación sólo agrega la membresía.
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      const existingMembership = await Membership.findOne({ user: existingUser._id, club: clubId });
      if (existingMembership) {
        return res.status(400).json({
          ok: false,
          message: 'Esa persona ya forma parte del equipo de este complejo'
        });
      }
    }

    // `issueToken` invalida las invitaciones anteriores para el mismo email, así
    // reinvitar no deja dos links vivos.
    const { raw, expiresAt } = await issueToken({
      tipo: 'staff-invite',
      email,
      ttlMinutes: INVITE_TTL_DAYS * 24 * 60,
      meta: {
        club: String(clubId),
        clubNombre: club.nombre,
        role,
        nombre: nombre || null,
        invitedBy: String(req.user._id),
        invitedByNombre: req.user.nombre
      }
    });

    const baseUrl = appUrl();
    const acceptUrl = `${baseUrl}/invitacion/${raw}`;

    const { subject, html } = staffInviteEmail({
      nombre: nombre || existingUser?.nombre,
      clubNombre: club.nombre,
      role,
      invitadoPor: req.user.nombre,
      acceptUrl,
      expiraEnDias: INVITE_TTL_DAYS,
      yaTieneCuenta: Boolean(existingUser)
    });

    const result = await sendEmail({
      to: email,
      subject,
      html,
      template: 'staff-invite',
      refId: clubId,
      club: clubId
    });

    // Acá sí le contamos el fallo al que invita: a diferencia del reset de
    // contraseña, no hay riesgo de filtrar nada y necesita saber que el email
    // no salió para poder reintentar.
    if (!result.ok && result.error) {
      return res.status(502).json({
        ok: false,
        message: 'La invitación se creó pero el email no pudo enviarse. Probá reenviarla.'
      });
    }

    res.status(201).json({
      ok: true,
      message: `Invitación enviada a ${email}`,
      invitation: { email, role, expiresAt, yaTieneCuenta: Boolean(existingUser) }
    });
  } catch (error) {
    next(error);
  }
};

// GET /invitations/club/:clubId — invitaciones pendientes (ni usadas ni vencidas).
const getClubInvitations = async (req, res, next) => {
  try {
    const invitations = await Token.find({
      tipo: 'staff-invite',
      'meta.club': String(req.params.clubId),
      usedAt: null,
      expiresAt: { $gt: new Date() }
    })
      .select('email meta expiresAt createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      ok: true,
      invitations: invitations.map((i) => ({
        _id: i._id,
        email: i.email,
        role: i.meta?.role,
        nombre: i.meta?.nombre,
        invitadoPor: i.meta?.invitedByNombre,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /invitations/:id — revoca una invitación pendiente.
const revokeInvitation = async (req, res, next) => {
  try {
    const invitation = await Token.findOne({ _id: req.params.id, tipo: 'staff-invite' });

    if (!invitation) {
      return res.status(404).json({ ok: false, message: 'Invitación no encontrada' });
    }

    // El middleware valida que sea admin de ALGÚN club, no de ESTE. Sin este
    // chequeo, el dueño de un complejo podría revocar las invitaciones de otro
    // con sólo conocer el id. El superadmin sí puede sobre cualquiera.
    const esSuperadmin = req.user.globalRole === ROLES.SUPERADMIN;
    const mismoClub = String(invitation.meta?.club) === String(req.params.clubId);

    if (!esSuperadmin && !mismoClub) {
      return res.status(403).json({ ok: false, message: 'Esa invitación no es de tu complejo' });
    }

    // Se borra en vez de marcarse como usada: una invitación revocada no debe
    // dejar rastro que alguien pueda confundir con una aceptación.
    await Token.deleteOne({ _id: invitation._id });

    res.status(200).json({ ok: true, message: 'Invitación revocada' });
  } catch (error) {
    next(error);
  }
};

// GET /invitations/:token — pública: el frontend arma el formulario según si el
// invitado ya tiene cuenta o no.
const getInvitation = async (req, res, next) => {
  try {
    const invitation = await findValidToken(req.params.token, 'staff-invite');

    if (!invitation) {
      return res.status(400).json({
        ok: false,
        message: 'La invitación no es válida o ya venció. Pedile al complejo que te la reenvíe.'
      });
    }

    const existingUser = await User.findOne({ email: invitation.email });

    res.status(200).json({
      ok: true,
      invitation: {
        email: invitation.email,
        nombre: invitation.meta?.nombre || existingUser?.nombre || null,
        role: invitation.meta?.role,
        clubNombre: invitation.meta?.clubNombre,
        invitadoPor: invitation.meta?.invitedByNombre,
        // Con cuenta existente no se pide contraseña: ya tiene la suya.
        yaTieneCuenta: Boolean(existingUser)
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /invitations/:token/accept — pública: crea (o vincula) la cuenta y la
// membresía, y deja la sesión iniciada.
const acceptInvitation = async (req, res, next) => {
  try {
    const { nombre, password } = req.body;

    const invitation = await findValidToken(req.params.token, 'staff-invite');

    if (!invitation) {
      return res.status(400).json({
        ok: false,
        message: 'La invitación no es válida o ya venció. Pedile al complejo que te la reenvíe.'
      });
    }

    const clubId = invitation.meta?.club;
    const role = invitation.meta?.role;

    if (!clubId || !INVITABLE_ROLES.includes(role)) {
      return res.status(400).json({ ok: false, message: 'La invitación está incompleta' });
    }

    let user = await User.findOne({ email: invitation.email });

    // Cuenta nueva: la contraseña la elige el invitado, no quien lo invitó.
    if (!user) {
      if (!password || password.length < 6) {
        return res.status(400).json({
          ok: false,
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }

      const finalNombre = nombre || invitation.meta?.nombre;
      if (!finalNombre) {
        return res.status(400).json({ ok: false, message: 'Indicá tu nombre' });
      }

      user = await User.create({
        nombre: finalNombre,
        email: invitation.email,
        password: await bcrypt.hash(password, 10)
      });
    }

    // Se consume antes de crear la membresía: si dos clics entran a la vez,
    // sólo uno sigue.
    const consumed = await consumeToken(invitation._id);
    if (!consumed) {
      return res.status(400).json({ ok: false, message: 'La invitación ya fue aceptada.' });
    }

    // Idempotente ante el caso raro de que la membresía ya exista (por ejemplo,
    // si se la crearon a mano entre el envío y la aceptación).
    const existingMembership = await Membership.findOne({ user: user._id, club: clubId });
    if (!existingMembership) {
      await Membership.create({ user: user._id, club: clubId, role, estado: 'activo' });
    }

    res.status(200).json({
      ok: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        estado: user.estado,
        globalRole: user.globalRole
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInvitation,
  getClubInvitations,
  revokeInvitation,
  getInvitation,
  acceptInvitation
};
