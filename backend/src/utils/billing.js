const Club = require('../models/Club');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const { precioDe, MONEDA, TRIAL_DIAS, getPlan } = require('../config/plans');
const { estadoPorSuscripcion, extenderVigencia } = require('./subscriptions');
const { emailsDelClub } = require('./clubContact');
const { sendEmail } = require('./email');
const { appUrl } = require('./publicUrls');
const invoiceIssuedEmail = require('../emails/templates/invoiceIssued');
const trialAvisoEmail = require('../emails/templates/trialAviso');
const deudaAvisoEmail = require('../emails/templates/deudaAviso');
const pagoAcreditadoEmail = require('../emails/templates/pagoAcreditado');

// Operaciones de facturación. Acá vive todo lo que crea o modifica una
// suscripción, para que el pago manual (paso 3), el webhook de MercadoPago
// (paso 4) y los crons (paso 5) compartan exactamente la misma lógica y no se
// desincronicen entre sí.

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Identificador del período que se está facturando.
 * Mensual → `2026-08`. Anual → `2026`.
 */
const periodoDe = (fecha, ciclo = 'mensual') => {
  const d = new Date(fecha);
  const anio = d.getUTCFullYear();
  if (ciclo === 'anual') return String(anio);
  return `${anio}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/**
 * Devuelve la suscripción del club, creándola si no existe.
 *
 * Los clubes anteriores a esta funcionalidad no tienen ninguna: se les arma una
 * con el trial contado desde su fecha de alta, así un club que existe hace un
 * año no arranca con 30 días gratis de regalo.
 *
 * @param {Date} [trialDesde] Cuándo empieza la prueba gratis. Por defecto, la
 *   fecha de alta del club. La aprobación de un complejo pasa la fecha de hoy:
 *   la solicitud puede haber estado días esperando revisión y esa espera no
 *   tiene por qué descontarse del mes de prueba.
 */
const ensureSubscription = async (club, trialDesde = null) => {
  const existente = await Subscription.findOne({ club: club._id });
  if (existente) return existente;

  const desde = trialDesde || club.createdAt || new Date();
  const trialHasta = new Date(new Date(desde).getTime() + TRIAL_DIAS * MS_POR_DIA);

  return Subscription.create({
    club: club._id,
    plan: club.plan || 'start',
    ciclo: 'mensual',
    precio: precioDe(club.plan || 'start', 'mensual'),
    moneda: club.moneda || MONEDA,
    trialHasta,
    vigenciaHasta: null
  });
};

/**
 * Recalcula `Club.estado` a partir de la suscripción y lo persiste.
 *
 * Es el único lugar que escribe ese campo por motivos de facturación. Un
 * superadmin puede seguir poniendo `inactivo` a mano; eso se respeta porque
 * `inactivo` no sale de esta función nunca (salvo que no haya suscripción).
 *
 * @returns {Promise<string>} El estado resultante.
 */
const sincronizarEstado = async (club, subscription, ahora = new Date()) => {
  const nuevo = estadoPorSuscripcion(subscription, ahora);

  if (club.estado !== nuevo) {
    await Club.updateOne({ _id: club._id }, { estado: nuevo });
  }

  return nuevo;
};

/**
 * Emite la factura del período. Idempotente: si ya existe una para ese club y
 * período, devuelve la que había en vez de duplicarla.
 */
const emitirFactura = async ({ club, subscription, periodo, vencimiento }) => {
  const per = periodo || periodoDe(new Date(), subscription.ciclo);

  const existente = await Invoice.findOne({ club: club._id, periodo: per });
  if (existente) return existente;

  // Vence cuando termina lo que está pago: si ya venció, vence ahora.
  const vence =
    vencimiento || subscription.vigenciaHasta || subscription.trialHasta || new Date();

  try {
    return await Invoice.create({
      club: club._id,
      subscription: subscription._id,
      periodo: per,
      plan: subscription.plan,
      ciclo: subscription.ciclo,
      monto: subscription.precio,
      moneda: subscription.moneda,
      estado: 'pendiente',
      vencimiento: vence
    });
  } catch (err) {
    // Carrera con otro proceso que la creó en el medio: el índice único
    // (club, periodo) hizo su trabajo, así que devolvemos la que ganó.
    if (err.code === 11000) {
      return Invoice.findOne({ club: club._id, periodo: per });
    }
    throw err;
  }
};

/**
 * Acredita el pago de una factura: la marca pagada, extiende la vigencia y
 * recalcula el estado del club.
 *
 * Es idempotente: una factura ya pagada no vuelve a extender la vigencia, así
 * un doble clic en "marcar pagada" no regala un mes.
 *
 * @returns {Promise<{ invoice, subscription, estado, yaEstabaPaga }>}
 */
const acreditarPago = async (invoice, { metodoPago = 'transferencia', usuario = null, notas = null } = {}) => {
  const club = await Club.findById(invoice.club);
  const subscription = await Subscription.findById(invoice.subscription) ||
    (await Subscription.findOne({ club: invoice.club }));

  if (invoice.estado === 'pagada') {
    return {
      invoice,
      subscription,
      estado: club?.estado,
      yaEstabaPaga: true
    };
  }

  // Se guarda antes de extender la vigencia: es lo que decide si el email de
  // confirmación anuncia una reactivación o es sólo un comprobante.
  const veniaCortado = ['impago', 'suspendido'].includes(club?.estado);

  invoice.estado = 'pagada';
  invoice.pagadaEn = new Date();
  invoice.metodoPago = metodoPago;
  if (usuario) invoice.registradaPor = usuario;
  if (notas) invoice.notas = notas;
  await invoice.save();

  subscription.vigenciaHasta = extenderVigencia(subscription.vigenciaHasta, subscription.ciclo);
  await subscription.save();

  const estado = await sincronizarEstado(club, subscription);

  // Best-effort: el pago ya está acreditado y el club reactivado aunque el email
  // no salga.
  if (club) await notificarPago(club, invoice, subscription, veniaCortado);

  return { invoice, subscription, estado, yaEstabaPaga: false };
};

const formatMoney = (monto, moneda = MONEDA) => {
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0
    }).format(monto);
  } catch {
    return `${moneda} ${monto}`;
  }
};

const formatFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

/**
 * Avisa al complejo que se emitió su factura.
 *
 * Va a `Club.email`, la dirección que el complejo configura en su perfil y que
 * recibe todo lo importante de la plataforma. Si todavía no la cargó, cae a los
 * administradores del club (ver `clubContact.js`).
 *
 * Best-effort: si el email no sale, la factura ya está emitida igual.
 */
const notificarFactura = async (club, invoice) => {
  try {
    const { to, usoFallback } = await emailsDelClub(club);

    if (to.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[billing] ${club.nombre} no tiene email configurado ni administradores activos: la factura ${invoice.periodo} no se pudo avisar.`
      );
      return { ok: false, skipped: 'sin destinatario' };
    }

    if (usoFallback) {
      // eslint-disable-next-line no-console
      console.warn(
        `[billing] ${club.nombre} no tiene email configurado: la factura ${invoice.periodo} se envió a sus administradores.`
      );
    }

    const baseUrl = appUrl();

    const { subject, html } = invoiceIssuedEmail({
      clubNombre: club.nombre,
      periodo: invoice.periodo,
      monto: formatMoney(invoice.monto, invoice.moneda),
      vencimiento: formatFecha(invoice.vencimiento),
      plan: getPlan(invoice.plan)?.label || invoice.plan,
      ciclo: invoice.ciclo,
      panelUrl: `${baseUrl}/panel/suscripcion`,
      soporteEmail: process.env.SOPORTE_EMAIL || process.env.MAIL_REPLY_TO || null,
      soporteWhatsapp: process.env.SOPORTE_WHATSAPP || null
    });

    return await sendEmail({
      to,
      subject,
      html,
      template: 'invoice-issued',
      // Una factura se avisa una sola vez, aunque se reemita el mismo período.
      dedupeKey: `invoice-issued:${invoice._id}`,
      refId: invoice._id,
      club: club._id
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[billing] No se pudo avisar la factura:', err.message);
    return { ok: false, error: err.message };
  }
};

// Datos de soporte que aparecen en todos los emails de cobranza. El abono se
// cobra por fuera de la plataforma, así que el CTA siempre es contactarnos.
const datosSoporte = () => ({
  soporteEmail: process.env.SOPORTE_EMAIL || process.env.MAIL_REPLY_TO || null,
  soporteWhatsapp: process.env.SOPORTE_WHATSAPP || null
});

const panelUrl = () => `${appUrl()}/panel/suscripcion`;

// Envoltura común: resuelve el destinatario y manda. Devuelve el resultado de
// `sendEmail` o un skip si el club no tiene a dónde recibir.
const enviarAlClub = async (club, { subject, html, template, dedupeKey, refId }) => {
  const { to } = await emailsDelClub(club);

  if (to.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(`[billing] ${club.nombre} no tiene email ni administradores: no se envió ${template}.`);
    return { ok: false, skipped: 'sin destinatario' };
  }

  return sendEmail({ to, subject, html, template, dedupeKey, refId, club: club._id });
};

/**
 * Aviso del período de prueba.
 * @param {number} diasRestantes 0 = ya terminó.
 */
const notificarTrial = async (club, subscription, diasRestantes) => {
  try {
    const { subject, html } = trialAvisoEmail({
      clubNombre: club.nombre,
      diasRestantes,
      panelUrl: panelUrl(),
      ...datosSoporte()
    });

    return await enviarAlClub(club, {
      subject,
      html,
      template: 'trial-aviso',
      // Una vez por etapa: el cron corre a diario y no debe repetirlo.
      dedupeKey: `trial-aviso:${subscription._id}:${diasRestantes}`,
      refId: subscription._id
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[billing] No se pudo avisar el trial:', err.message);
    return { ok: false, error: err.message };
  }
};

// Etapas que comparten plantilla pero son escalones distintos de la escalera.
// La clave de dedupe usa la etapa real (así el recordatorio del día 21 se manda
// aunque ya se haya mandado el del 14); la plantilla usa la variante.
const PLANTILLA_DE_ETAPA = { 'recordatorio-2': 'recordatorio' };

/**
 * Aviso de deuda. `etapa` define el tono y la urgencia (ver deudaAviso.js).
 */
const notificarDeuda = async (club, invoice, etapa, dias) => {
  try {
    const { subject, html } = deudaAvisoEmail({
      etapa: PLANTILLA_DE_ETAPA[etapa] || etapa,
      clubNombre: club.nombre,
      periodo: invoice.periodo,
      monto: formatMoney(invoice.monto, invoice.moneda),
      vencimiento: formatFecha(invoice.vencimiento),
      diasDeMora: dias,
      panelUrl: panelUrl(),
      ...datosSoporte()
    });

    return await enviarAlClub(club, {
      subject,
      html,
      template: `deuda-${etapa}`,
      // Clave por factura Y etapa: cada escalón se manda una sola vez.
      dedupeKey: `deuda:${invoice._id}:${etapa}`,
      refId: invoice._id
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[billing] No se pudo avisar la deuda:', err.message);
    return { ok: false, error: err.message };
  }
};

/**
 * Confirmación de pago. Si el complejo venía cortado, es además el aviso de que
 * volvió a estar operativo.
 */
const notificarPago = async (club, invoice, subscription, veniaCortado = false) => {
  try {
    const { subject, html } = pagoAcreditadoEmail({
      clubNombre: club.nombre,
      periodo: invoice.periodo,
      monto: formatMoney(invoice.monto, invoice.moneda),
      vigenciaHasta: formatFecha(subscription.vigenciaHasta),
      panelUrl: panelUrl(),
      veniaCortado
    });

    return await enviarAlClub(club, {
      subject,
      html,
      template: 'pago-acreditado',
      dedupeKey: `pago-acreditado:${invoice._id}`,
      refId: invoice._id
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[billing] No se pudo avisar el pago:', err.message);
    return { ok: false, error: err.message };
  }
};

module.exports = {
  periodoDe,
  ensureSubscription,
  sincronizarEstado,
  emitirFactura,
  acreditarPago,
  notificarFactura,
  notificarTrial,
  notificarDeuda,
  notificarPago,
  formatMoney,
  formatFecha
};
