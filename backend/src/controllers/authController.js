const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Membership = require('../models/Membership');
const Club = require('../models/Club');
const ROLES = require('../config/roles');
const { issueToken, findValidToken, consumeToken } = require('../utils/tokens');
const { sendEmail } = require('../utils/email');
const { appUrl } = require('../utils/publicUrls');
const passwordResetEmail = require('../emails/templates/passwordReset');
const verifyEmailTemplate = require('../emails/templates/verifyEmail');
const { ensureSubscription } = require('../utils/billing');

// Ventana de validez del link de reset.
const RESET_TTL_MINUTES = 60;

// La verificación dura más: no bloquea nada, así que no hay apuro en usarla.
const VERIFY_TTL_HOURS = 48;

const publicBaseUrl = () => appUrl();

// Emite el token de verificación y manda el email. Best-effort: si falla, la
// cuenta ya existe y la persona puede pedir el reenvío desde el panel.
const sendVerificationEmail = async (user) => {
  const { raw } = await issueToken({
    tipo: 'email-verify',
    user: user._id,
    ttlMinutes: VERIFY_TTL_HOURS * 60
  });

  const { subject, html } = verifyEmailTemplate({
    nombre: user.nombre,
    verifyUrl: `${publicBaseUrl()}/verificar?token=${raw}`,
    expiraEnHoras: VERIFY_TTL_HOURS
  });

  return sendEmail({
    to: user.email,
    subject,
    html,
    template: 'email-verify',
    refId: user._id
  });
};

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
    globalRole: user.globalRole,
    emailVerifiedAt: user.emailVerifiedAt || null
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

    await sendVerificationEmail(user);

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

    // Arranca el trial. Best-effort: si fallara, `ensureSubscription` la crea la
    // primera vez que entren a la pantalla de suscripción.
    try {
      await ensureSubscription(newClub);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('No se pudo crear la suscripción del club:', err.message);
    }

    const token = generateToken(user._id);

    await sendVerificationEmail(user);

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
      // `deportes` viaja acá porque el panel arma con eso los filtros y el alta
      // de canchas: sin él, la sesión no sabe con qué deportes trabaja el club.
    }).populate('club', 'nombre slug estado timezone moneda deportes');

    res.status(200).json({
      ok: true,
      user: req.user,
      memberships
    });
  } catch (error) {
    next(error);
  }
};

// --- Recuperación de contraseña ---

// Pide el link de reset. Responde SIEMPRE lo mismo exista o no la cuenta: si
// distinguiéramos los casos, cualquiera podría usar este endpoint para averiguar
// qué emails están registrados en la plataforma.
const forgotPassword = async (req, res, next) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();

    const genericResponse = {
      ok: true,
      message: 'Si el email está registrado, te enviamos un link para restablecer tu contraseña.'
    };

    if (!email) {
      return res.status(400).json({ ok: false, message: 'El email es obligatorio' });
    }

    const user = await User.findOne({ email });

    // Un usuario inactivo tampoco recibe el link: recuperar la clave no debe
    // ser una vía para reactivar una cuenta dada de baja.
    if (!user || user.estado !== 'activo') {
      return res.status(200).json(genericResponse);
    }

    const { raw } = await issueToken({
      tipo: 'password-reset',
      user: user._id,
      ttlMinutes: RESET_TTL_MINUTES
    });

    const baseUrl = appUrl();
    const resetUrl = `${baseUrl}/restablecer?token=${raw}`;

    const { subject, html } = passwordResetEmail({
      nombre: user.nombre,
      resetUrl,
      expiraEnMinutos: RESET_TTL_MINUTES
    });

    // Best-effort: si el proveedor falla, ya lo loguea `sendEmail`. No se lo
    // contamos al cliente para no filtrar si la cuenta existe.
    //
    // Sin `dedupeKey` a propósito: pedir el link de nuevo tiene que volver a
    // enviarlo (el anterior queda invalidado por `issueToken`).
    await sendEmail({
      to: user.email,
      subject,
      html,
      template: 'password-reset',
      refId: user._id
    });

    res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

// Chequea el link antes de mostrar el formulario, para no hacerle escribir la
// contraseña nueva a alguien cuyo token ya venció.
const verifyResetToken = async (req, res, next) => {
  try {
    const token = await findValidToken(req.query.token, 'password-reset');

    if (!token) {
      return res.status(400).json({
        ok: false,
        message: 'El link no es válido o ya venció. Pedí uno nuevo.'
      });
    }

    res.status(200).json({ ok: true, email: token.user?.email });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token: rawToken, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const token = await findValidToken(rawToken, 'password-reset');

    if (!token || !token.user) {
      return res.status(400).json({
        ok: false,
        message: 'El link no es válido o ya venció. Pedí uno nuevo.'
      });
    }

    // Se consume primero: si dos requests entran a la vez, solo uno gana y el
    // otro corta acá sin llegar a tocar la contraseña.
    const consumed = await consumeToken(token._id);
    if (!consumed) {
      return res.status(400).json({
        ok: false,
        message: 'El link ya fue usado. Pedí uno nuevo.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(token.user._id, { password: hashedPassword });

    // Sesión iniciada al toque: la persona ya probó que controla la casilla.
    const jwtToken = generateToken(token.user._id);

    res.status(200).json({
      ok: true,
      token: jwtToken,
      user: buildUserResponse(token.user)
    });
  } catch (error) {
    next(error);
  }
};

// --- Verificación de email ---

// POST /auth/verify-email — pública: el link llega por email y quien lo abre
// puede no tener sesión iniciada en ese navegador.
const verifyEmail = async (req, res, next) => {
  try {
    const token = await findValidToken(req.body.token, 'email-verify');

    if (!token || !token.user) {
      return res.status(400).json({
        ok: false,
        message: 'El link no es válido o ya venció. Pedí uno nuevo desde tu cuenta.'
      });
    }

    // Idempotente: si ya estaba verificado, el segundo clic no es un error.
    if (token.user.emailVerifiedAt) {
      await consumeToken(token._id);
      return res.status(200).json({ ok: true, message: 'Tu email ya estaba confirmado.' });
    }

    const consumed = await consumeToken(token._id);
    if (!consumed) {
      return res.status(400).json({ ok: false, message: 'Ese link ya fue usado.' });
    }

    await User.findByIdAndUpdate(token.user._id, { emailVerifiedAt: new Date() });

    res.status(200).json({ ok: true, message: '¡Listo! Tu email quedó confirmado.' });
  } catch (error) {
    next(error);
  }
};

// POST /auth/resend-verification — protegida: reenvía a la casilla de la cuenta
// en sesión. No recibe un email por parámetro, así nadie puede usarla para
// mandarle correo a terceros.
const resendVerification = async (req, res, next) => {
  try {
    if (req.user.emailVerifiedAt) {
      return res.status(400).json({ ok: false, message: 'Tu email ya está confirmado' });
    }

    const result = await sendVerificationEmail(req.user);

    if (!result.ok && result.error) {
      return res.status(502).json({
        ok: false,
        message: 'No pudimos enviar el email. Probá de nuevo en un momento.'
      });
    }

    res.status(200).json({
      ok: true,
      message: `Te reenviamos el link a ${req.user.email}.`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  registerClub,
  login,
  getMe,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  verifyEmail,
  resendVerification
};