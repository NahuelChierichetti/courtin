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
const { normalizeSports } = require('../config/sports');
const { planParaCanchas } = require('../config/plans');
const { slugUnico, notificarSolicitud } = require('../utils/clubOnboarding');
const { esperaAprobacion } = require('../utils/subscriptions');

// Ventana de validez del link de reset.
const RESET_TTL_MINUTES = 60;

// La verificación dura más: no bloquea nada, así que no hay apuro en usarla.
const VERIFY_TTL_HOURS = 48;

const publicBaseUrl = () => appUrl();

// Emite el token de verificación y devuelve el link listo para usar.
//
// Está separado del envío porque el alta de un complejo no manda un email de
// verificación aparte: mete el link dentro del acuse de la solicitud, para no
// dispararle dos correos seguidos a alguien que recién se registró.
const issueVerifyUrl = async (user) => {
  const { raw } = await issueToken({
    tipo: 'email-verify',
    user: user._id,
    ttlMinutes: VERIFY_TTL_HOURS * 60
  });

  return `${publicBaseUrl()}/verificar?token=${raw}`;
};

// Emite el token de verificación y manda el email. Best-effort: si falla, la
// cuenta ya existe y la persona puede pedir el reenvío desde el panel.
const sendVerificationEmail = async (user) => {
  const { subject, html } = verifyEmailTemplate({
    nombre: user.nombre,
    verifyUrl: await issueVerifyUrl(user),
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
    telefono: user.telefono || null,
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

// Solicitud de alta de un complejo (onboarding del negocio).
//
// NO da de alta nada operativo: crea el club en estado `pendiente`, el usuario
// administrador y la membresía que los vincula, y avisa al superadmin para que
// lo revise. Hasta que se apruebe no hay suscripción, no hay panel y el club no
// aparece en el buscador (ver utils/clubOnboarding.js).
//
// Tampoco devuelve token: iniciarle sesión a alguien que no puede entrar a
// ningún lado sería mandarlo a una pantalla vacía. La sesión la abre después,
// desde /panel/login, cuando le llega el mail de aprobación.
//
// Distinto de `register`, que da de alta un jugador y lo deja usando la app en
// el mismo acto.
const registerClub = async (req, res, next) => {
  try {
    const { club = {}, admin = {} } = req.body;

    const clubNombre = (club.nombre || '').trim();
    const clubEmail = (club.email || '').trim().toLowerCase();
    const clubTelefono = (club.telefono || '').trim();
    const provincia = (club.provincia || '').trim();
    const ciudad = (club.ciudad || '').trim();
    const direccion = (club.direccion || '').trim();
    const cantidadCanchas = Number(club.cantidadCanchas);

    // Coordenadas del nomenclador oficial, si el frontend pudo verificar la
    // dirección. Se valida el rango en vez de confiar: llega de una API externa
    // vía el navegador, y un par invertido (lat/lng al revés) pondría al
    // complejo en medio del océano sin que nadie se entere hasta ver el mapa.
    const lat = Number(club.ubicacion?.lat);
    const lng = Number(club.ubicacion?.lng);
    const ubicacion =
      Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
        ? { lat, lng }
        : null;

    const adminNombre = [admin.nombre, admin.apellido]
      .map((p) => (p || '').trim())
      .filter(Boolean)
      .join(' ');
    const adminEmail = (admin.email || '').trim().toLowerCase();
    const adminTelefono = (admin.telefono || '').trim();
    const { password } = admin;

    // --- Paso 1: el complejo ---
    if (!clubNombre || !clubEmail || !clubTelefono) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan datos del complejo (nombre, email y teléfono)'
      });
    }

    if (!Number.isInteger(cantidadCanchas) || cantidadCanchas < 1) {
      return res.status(400).json({
        ok: false,
        message: 'Indicá cuántas canchas tiene el complejo'
      });
    }

    if (!provincia || !ciudad || !direccion) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan datos de ubicación (provincia, ciudad y dirección)'
      });
    }

    // --- Paso 2: el administrador ---
    if (!adminNombre || !adminEmail || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan datos del administrador (nombre, apellido, email y contraseña)'
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        ok: false,
        message: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // --- Paso 3: los deportes ---
    const deportes = normalizeSports(club.deportes);
    if (!deportes?.length) {
      return res.status(400).json({
        ok: false,
        message: 'Elegí al menos un deporte del complejo'
      });
    }

    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      return res.status(400).json({
        ok: false,
        message: 'Ya existe una cuenta con ese email. Usá otro para el alta del complejo.'
      });
    }

    // El plan sale de las canchas declaradas: es lo único que diferencia a los
    // planes entre sí. Recién se cobra cuando termina la prueba gratis, y para
    // entonces el superadmin ya vio el alta y pudo corregirlo.
    const plan = planParaCanchas(cantidadCanchas);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      nombre: adminNombre,
      email: adminEmail,
      telefono: adminTelefono || null,
      password: hashedPassword
    });

    const newClub = await Club.create({
      nombre: clubNombre,
      // El slug no se le pide a nadie: se deriva del nombre y se desambigua solo.
      slug: await slugUnico(clubNombre),
      email: clubEmail,
      telefono: clubTelefono,
      provincia,
      ciudad,
      direccion,
      ...(ubicacion && { ubicacion }),
      deportes,
      plan,
      estado: 'pendiente',
      alta: {
        canchasDeclaradas: cantidadCanchas,
        solicitadoEn: new Date()
      }
    });

    await Membership.create({
      user: user._id,
      club: newClub._id,
      role: ROLES.TENANT_ADMIN
    });

    // Acuse al administrador + alerta al superadmin. Best-effort: la solicitud
    // ya está guardada aunque el correo falle.
    await notificarSolicitud(
      newClub,
      {
        nombre: adminNombre,
        email: adminEmail,
        telefono: adminTelefono
      },
      { verifyUrl: await issueVerifyUrl(user), verifyTtlHoras: VERIFY_TTL_HOURS }
    );

    res.status(201).json({
      ok: true,
      estado: 'pendiente',
      message: 'Tu solicitud quedó pendiente de aprobación.',
      club: {
        _id: newClub._id,
        nombre: newClub.nombre,
        plan: newClub.plan,
        estado: newClub.estado
      }
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

    // Un alta que todavía no aprobamos no tiene panel al que entrar. Se corta
    // acá, con el motivo, en vez de dejar iniciar sesión y que la persona rebote
    // contra una pantalla vacía sin entender por qué.
    //
    // Sólo aplica si TODOS sus complejos están sin aprobar: alguien que además
    // administra un club activo entra normalmente.
    if (user.globalRole !== ROLES.SUPERADMIN) {
      const memberships = await Membership.find({ user: user._id, estado: 'activo' })
        .populate('club', 'nombre estado')
        .lean();

      const conClub = memberships.filter((m) => m.club);

      if (conClub.length && conClub.every((m) => esperaAprobacion(m.club))) {
        const rechazado = conClub.every((m) => m.club.estado === 'rechazado');

        return res.status(403).json({
          ok: false,
          code: rechazado ? 'CLUB_RECHAZADO' : 'CLUB_PENDIENTE',
          message: rechazado
            ? 'No pudimos aprobar el alta de tu complejo. Escribinos si querés volver a intentarlo.'
            : 'Tu complejo todavía está pendiente de aprobación. Te avisamos por email en cuanto esté listo.'
        });
      }
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

// PATCH /auth/me — datos personales de la cuenta en sesión.
//
// El email queda afuera a propósito: cambiarlo es mudar la identidad con la que
// se inicia sesión y con la que se deduplican los clientes de cada complejo, así
// que necesita su propio flujo con verificación de la casilla nueva.
const updateMe = async (req, res, next) => {
  try {
    const updates = {};

    if (req.body.nombre !== undefined) {
      const nombre = String(req.body.nombre).trim();
      if (!nombre) {
        return res.status(400).json({ ok: false, message: 'El nombre es obligatorio' });
      }
      updates.nombre = nombre;
    }

    // Vacío borra el teléfono: es opcional y tiene que poder sacarse.
    if (req.body.telefono !== undefined) {
      const telefono = String(req.body.telefono).trim();
      updates.telefono = telefono || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok: false, message: 'No hay datos para actualizar' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ ok: true, user: buildUserResponse(user) });
  } catch (error) {
    next(error);
  }
};

// PUT /auth/me/password — cambio de contraseña con la sesión ya iniciada.
//
// Pide la contraseña actual aunque haya token válido: si alguien deja la sesión
// abierta en un teléfono prestado, no debería poder quedarse con la cuenta.
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, password } = req.body;

    if (!currentPassword || !password) {
      return res.status(400).json({
        ok: false,
        message: 'Ingresá tu contraseña actual y la nueva.'
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        ok: false,
        message: 'La contraseña nueva debe tener al menos 6 caracteres.'
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(400).json({ ok: false, message: 'La contraseña actual no es correcta.' });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({ ok: true, message: 'Contraseña actualizada.' });
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
  updateMe,
  changePassword,
  forgotPassword,
  verifyResetToken,
  resetPassword,
  verifyEmail,
  resendVerification
};