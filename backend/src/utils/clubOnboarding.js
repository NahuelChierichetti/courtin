// Alta de un complejo con aprobación previa.
//
// El registro público NO da de alta un complejo: crea una SOLICITUD. El club
// queda en `pendiente` (sin panel, sin buscador, sin suscripción) hasta que un
// superadmin la resuelve desde el backoffice.
//
// La razón es que un complejo mal cargado no es un usuario más: aparece en el
// buscador público con la marca de CourtIn encima, y su plan (o sea, lo que se
// le va a facturar) sale de lo que él mismo declaró. Revisar antes cuesta un
// clic; limpiar después cuesta soporte.
//
// Este módulo concentra las tres piezas que el circuito comparte entre el
// registro (authController) y la aprobación (adminController): el slug, los
// destinatarios de los avisos y los emails.

const Club = require('../models/Club');
const User = require('../models/User');
const Membership = require('../models/Membership');
const ROLES = require('../config/roles');
const { sendEmail } = require('./email');
const { appUrl } = require('./publicUrls');
const { sportLabel } = require('../config/sports');
const { getPlan, TRIAL_DIAS } = require('../config/plans');

const clubSolicitudNueva = require('../emails/templates/clubSolicitudNueva');
const clubSolicitudRecibida = require('../emails/templates/clubSolicitudRecibida');
const clubAprobado = require('../emails/templates/clubAprobado');
const clubRechazado = require('../emails/templates/clubRechazado');

const slugify = (texto = '') =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/**
 * Slug libre a partir del nombre del complejo.
 *
 * El formulario de registro ya no lo pide: es un detalle técnico (la URL
 * pública) que no significa nada para quien está dando de alta su club, y
 * pedirlo sólo genera slugs feos elegidos con desgano. Se deriva del nombre y el
 * superadmin lo puede corregir al aprobar.
 *
 * El sufijo numérico se busca contra la base incluyendo los borrados lógicos:
 * el índice `unique` de Mongo no sabe de soft delete, así que reusar el slug de
 * un club eliminado explotaría con un error 11000 imposible de leer.
 */
const slugUnico = async (nombre) => {
  const base = slugify(nombre) || 'complejo';

  for (let intento = 0; intento < 50; intento += 1) {
    const candidato = intento === 0 ? base : `${base}-${intento + 1}`;
    const tomado = await Club.findOne({ slug: candidato })
      .setOptions({ withDeleted: true })
      .select('_id')
      .lean();
    if (!tomado) return candidato;
  }

  // Con 50 homónimos, desempatar por tiempo es más barato que seguir probando.
  return `${base}-${Date.now().toString(36)}`;
};

/**
 * A quién se le avisa que hay una solicitud esperando.
 *
 * Se buscan los superadmins reales en la base en vez de leer una env var: si
 * mañana hay dos personas revisando altas, alcanza con darles el rol. La env var
 * `SUPERADMIN_EMAIL` queda como respaldo para el caso en que todavía no exista
 * ningún superadmin cargado (instalación nueva).
 */
const destinatariosSuperadmin = async () => {
  const admins = await User.find({ globalRole: ROLES.SUPERADMIN, estado: 'activo' })
    .select('email')
    .lean();

  const emails = admins.map((a) => a.email).filter(Boolean);
  if (emails.length) return emails;

  const fallback = process.env.SUPERADMIN_EMAIL || process.env.SOPORTE_EMAIL;
  return fallback ? [fallback] : [];
};

const deportesLegibles = (club) => (club.deportes || []).map(sportLabel);

const planLabel = (planKey) => getPlan(planKey)?.label || planKey;

const formatFecha = (fecha) =>
  fecha
    ? new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

/** El dueño del complejo (quien lo registró). */
const ownerDeClub = async (clubId) => {
  const membership = await Membership.findOne({
    club: clubId,
    role: ROLES.TENANT_ADMIN,
    estado: 'activo'
  })
    .sort({ createdAt: 1 })
    .populate('user', 'nombre email')
    .lean();

  return membership?.user || null;
};

/**
 * Avisos del momento del registro: acuse al complejo y alerta al superadmin.
 *
 * Best-effort, como todo `sendEmail`: la solicitud ya está guardada y no se
 * pierde porque falle el correo. Lo que sí se pierde es que alguien se entere,
 * por eso el fallo se loguea.
 */
const notificarSolicitud = async (club, admin, { verifyUrl, verifyTtlHoras } = {}) => {
  const deportes = deportesLegibles(club);
  const plan = planLabel(club.plan);

  const acuse = clubSolicitudRecibida({
    nombre: admin.nombre,
    clubNombre: club.nombre,
    deportes,
    plan,
    trialDias: TRIAL_DIAS,
    verifyUrl,
    verifyTtlHoras
  });

  const superadmins = await destinatariosSuperadmin();

  const aviso = clubSolicitudNueva({
    clubNombre: club.nombre,
    ciudad: club.ciudad,
    provincia: club.provincia,
    direccion: club.direccion,
    telefono: club.telefono,
    email: club.email,
    canchas: club.alta?.canchasDeclaradas,
    plan,
    deportes,
    adminNombre: admin.nombre,
    adminEmail: admin.email,
    adminTelefono: admin.telefono,
    backofficeUrl: `${appUrl()}/admin/complejos?estado=pendiente`
  });

  const envios = [
    sendEmail({
      to: admin.email,
      subject: acuse.subject,
      html: acuse.html,
      template: 'club-solicitud-recibida',
      refId: club._id,
      club: club._id
    })
  ];

  if (superadmins.length) {
    envios.push(
      sendEmail({
        to: superadmins,
        subject: aviso.subject,
        html: aviso.html,
        // Sin dedupe: una solicitud, un aviso. El `refId` alcanza para
        // rastrearla en EmailLog.
        template: 'club-solicitud-nueva',
        refId: club._id,
        club: club._id
      })
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[alta-complejo] No hay superadmin al que avisarle de la solicitud de "${club.nombre}". Cargá SUPERADMIN_EMAIL.`
    );
  }

  return Promise.all(envios);
};

/** Le avisa al dueño que ya puede entrar al panel. */
const notificarAprobacion = async (club, subscription) => {
  const owner = await ownerDeClub(club._id);
  if (!owner?.email) return { ok: false, skipped: 'sin destinatario' };

  const { subject, html } = clubAprobado({
    nombre: owner.nombre,
    clubNombre: club.nombre,
    loginUrl: `${appUrl()}/panel/login`,
    plan: planLabel(club.plan),
    trialHasta: formatFecha(subscription?.trialHasta)
  });

  return sendEmail({
    to: owner.email,
    subject,
    html,
    template: 'club-aprobado',
    refId: club._id,
    club: club._id
  });
};

/** Le avisa al dueño que el alta no prosperó, con el motivo. */
const notificarRechazo = async (club, motivo) => {
  const owner = await ownerDeClub(club._id);
  if (!owner?.email) return { ok: false, skipped: 'sin destinatario' };

  const { subject, html } = clubRechazado({
    nombre: owner.nombre,
    clubNombre: club.nombre,
    motivo,
    soporteEmail: process.env.SOPORTE_EMAIL || process.env.MAIL_REPLY_TO || null
  });

  return sendEmail({
    to: owner.email,
    subject,
    html,
    template: 'club-rechazado',
    refId: club._id,
    club: club._id
  });
};

module.exports = {
  slugify,
  slugUnico,
  destinatariosSuperadmin,
  ownerDeClub,
  notificarSolicitud,
  notificarAprobacion,
  notificarRechazo
};
