const { getClient, isConfigured } = require('../config/mailer');
const EmailLog = require('../models/EmailLog');

// Envío de emails. Mismo contrato que `notify()` en utils/notifications.js:
// es best-effort y NUNCA rompe el flujo que lo dispara. Si el proveedor falla,
// la reserva ya está creada y el usuario no tiene por qué enterarse.
//
// Siempre devuelve un objeto (nunca lanza):
//   { ok: true,  id }                    → aceptado por el proveedor
//   { ok: false, skipped: 'motivo' }     → no se intentó (apagado / ya enviado)
//   { ok: false, error: 'mensaje' }      → se intentó y falló
//
// Cada envío queda registrado en EmailLog. Si se pasa `dedupeKey`, el registro
// se crea ANTES de enviar: esa reserva del lugar es lo que garantiza que el
// email salga una sola vez aunque el proceso se caiga a la mitad.

// Remitente por defecto. `onboarding@resend.dev` es el sandbox de Resend: sirve
// para probar sin dominio propio, pero solo permite enviar a la casilla dueña
// de la cuenta. Con el dominio verificado se pasa a MAIL_FROM.
const DEFAULT_FROM = 'CourtIn <onboarding@resend.dev>';

const asList = (value) => (Array.isArray(value) ? value : [value]).filter(Boolean);

// Fallback de texto plano a partir del HTML. Los clientes de correo que no
// renderizan HTML necesitan una versión `text`, y su ausencia además suma
// puntos de spam.
const htmlToText = (html = '') =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const sendEmail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
  attachments,
  tags,
  // --- Trazabilidad e idempotencia ---
  template = 'sin-clasificar',
  dedupeKey = null,
  refId = null,
  club = null
} = {}) => {
  let log = null;

  try {
    if (!to || !subject || !html) {
      return { ok: false, skipped: 'faltan destinatario, asunto o cuerpo' };
    }

    // Interruptor general: en local se deja en false para no gastar cuota ni
    // mandarle mails de prueba a nadie por accidente.
    if (process.env.MAIL_ENABLED === 'false') {
      // eslint-disable-next-line no-console
      console.log(`[email:off] Para: ${asList(to).join(', ')} · Asunto: ${subject}`);
      return { ok: false, skipped: 'MAIL_ENABLED=false' };
    }

    if (!isConfigured()) {
      // eslint-disable-next-line no-console
      console.warn('[email] RESEND_API_KEY no configurada: no se envió nada.');
      return { ok: false, skipped: 'sin RESEND_API_KEY' };
    }

    // Reserva del envío. Va ANTES de mandar, no después: si registráramos
    // recién al terminar, una caída entre el envío y el registro haría que el
    // reintento mande el email por segunda vez.
    try {
      log = await EmailLog.create({
        template,
        to: asList(to)[0],
        subject,
        refId: refId ? String(refId) : null,
        club,
        // Mongoose omite las claves undefined, que es justo lo que necesita el
        // índice sparse para no tratar a todos los repetibles como duplicados.
        dedupeKey: dedupeKey || undefined
      });
    } catch (err) {
      if (err.code === 11000) {
        // Otro proceso ya reservó esta clave: el email ya salió (o está saliendo).
        return { ok: false, skipped: 'ya enviado (dedupeKey)' };
      }
      // Con dedupeKey no podemos seguir sin la reserva: enviar acá sería
      // arriesgar un duplicado, que es exactamente lo que vinimos a evitar.
      if (dedupeKey) {
        console.error('[email] No se pudo registrar el envío:', err.message);
        return { ok: false, error: `no se pudo registrar: ${err.message}` };
      }
      // Sin dedupeKey el registro es solo auditoría: que falle no justifica
      // dejar al usuario sin su email.
      console.error('[email] No se pudo registrar el envío (se envía igual):', err.message);
    }

    let recipients = asList(to);
    let finalSubject = subject;

    // Red de seguridad para dev/staging: redirige TODO a una casilla propia y
    // deja el destinatario real en el asunto. Sin esto, un seed o una prueba
    // contra datos reales le manda emails a clientes de verdad.
    const redirect = process.env.MAIL_DEV_REDIRECT;
    if (redirect) {
      finalSubject = `[dev → ${recipients.join(', ')}] ${subject}`;
      recipients = [redirect];
    }

    const { data, error } = await getClient().emails.send({
      from: process.env.MAIL_FROM || DEFAULT_FROM,
      to: recipients,
      subject: finalSubject,
      html,
      text: text || htmlToText(html),
      // El `from` es siempre de CourtIn, pero la respuesta del jugador tiene que
      // llegarle al complejo: cada llamada puede pasar el email del club.
      replyTo: replyTo || process.env.MAIL_REPLY_TO || undefined,
      attachments,
      tags
    });

    if (error) {
      // eslint-disable-next-line no-console
      console.error('[email] Resend rechazó el envío:', error.message || error);
      await markFailed(log, error.message || String(error));
      return { ok: false, error: error.message || String(error) };
    }

    await markSent(log, data?.id);
    return { ok: true, id: data?.id };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] No se pudo enviar:', err.message);
    await markFailed(log, err.message);
    return { ok: false, error: err.message };
  }
};

const markSent = async (log, providerId) => {
  if (!log) return;
  try {
    await EmailLog.updateOne({ _id: log._id }, { status: 'enviado', providerId: providerId || null });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] No se pudo cerrar el registro:', err.message);
  }
};

// El envío falló, así que la reserva de la clave se libera con $unset para que
// el próximo intento (por ejemplo, la corrida siguiente del cron) pueda mandarlo.
// Tiene que ser $unset y no `null`: un null cuenta como valor presente y el
// índice sparse lo indexaría, bloqueando el reintento.
const markFailed = async (log, message) => {
  if (!log) return;
  try {
    await EmailLog.updateOne(
      { _id: log._id },
      { $set: { status: 'fallido', error: message || 'error desconocido' }, $unset: { dedupeKey: 1 } }
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] No se pudo registrar la falla:', err.message);
  }
};

module.exports = { sendEmail, htmlToText };
