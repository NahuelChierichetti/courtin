const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
require('dayjs/locale/es');

dayjs.extend(utc);
dayjs.extend(timezone);

const { sendEmail } = require('./email');
const { buildReservationICS } = require('./calendar');
const { DEFAULT_TZ } = require('./timezone');
const reservationConfirmedEmail = require('../emails/templates/reservationConfirmed');
const reservationReminderEmail = require('../emails/templates/reservationReminder');
const clubReservaAvisoEmail = require('../emails/templates/clubReservaAviso');
const reservationRefundedEmail = require('../emails/templates/reservationRefunded');
const reservationCancelledEmail = require('../emails/templates/reservationCancelled');
const { emailsDelClub } = require('./clubContact');
const { appUrl } = require('./publicUrls');

// Emails ligados a una reserva. Todo lo de acá es best-effort: si el envío
// falla, la reserva ya existe y el flujo sigue igual.

const formatMoney = (amount, moneda = 'ARS') => {
  if (amount === null || amount === undefined) return null;
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${moneda} ${amount}`;
  }
};

// Datos del turno ya formateados en la zona horaria y la moneda del club.
// Compartido por la confirmación y el recordatorio para que ambos emails
// muestren exactamente lo mismo.
const buildContext = (reservation, club, court) => {
  const tz = club.timezone || DEFAULT_TZ;
  const inicio = dayjs(reservation.inicio).tz(tz).locale('es');
  const fin = dayjs(reservation.fin).tz(tz).locale('es');
  const minutos = fin.diff(inicio, 'minute');

  const baseUrl = appUrl();

  return {
    fecha: inicio.format('dddd D [de] MMMM'),
    hora: `${inicio.format('HH:mm')} a ${fin.format('HH:mm')}`,
    duracion: minutos >= 60 ? `${minutos / 60} h` : `${minutos} min`,
    manageUrl: `${baseUrl}/reserva/${reservation.manageToken}`,
    // Ficha pública del complejo. Sin slug (clubs viejos, o un populate acotado)
    // queda vacía y quien la use tiene que contemplarlo.
    clubUrl: club.slug ? `${baseUrl}/club/${club.slug}` : null,
    direccion: [club.direccion, club.ciudad].filter(Boolean).join(', '),
    canchaNombre: court?.nombre || 'Cancha',
    telefono: club.telefono || club.whatsapp,
    toleranciaCancelacionHoras: club.horarios?.reservas?.toleranciaCancelacionHoras ?? 0
  };
};

/**
 * Confirmación de reserva al jugador, con el turno adjunto como .ics.
 *
 * @param {object} reservation Documento de la reserva (necesita `manageToken`).
 * @param {object} club        Club poblado (nombre, timezone, moneda, email...).
 * @param {object} court       Cancha poblada (nombre).
 * @param {string} to          Email destino. Si no viene, se usa el de la reserva.
 * @param {string} nombre      Nombre del jugador. Para reservas de un cliente
 *                             registrado hay que pasarlo: `guestName` va vacío.
 */
const sendReservationConfirmation = async ({ reservation, club, court, to, nombre } = {}) => {
  try {
    const email = to || reservation?.guestEmail;

    // Sin email no hay nada que hacer: una reserva cargada por teléfono en el
    // backoffice puede no tenerlo, y es un caso normal.
    if (!email || !reservation || !club) {
      return { ok: false, skipped: 'sin email o datos incompletos' };
    }

    const { fecha, hora, duracion, manageUrl, direccion, canchaNombre } = buildContext(
      reservation,
      club,
      court
    );

    const { subject, html } = reservationConfirmedEmail({
      nombre: nombre || reservation.guestName,
      clubNombre: club.nombre,
      canchaNombre,
      fecha,
      hora,
      duracion,
      precio: formatMoney(reservation.precioFinal, club.moneda),
      estado: reservation.estado,
      manageUrl,
      direccion,
      telefono: club.telefono || club.whatsapp,
      toleranciaCancelacionHoras: club.horarios?.reservas?.toleranciaCancelacionHoras ?? 0,
      // Sólo para las reservas cobradas online; en las que se pagan en el
      // complejo estos campos quedan vacíos y el email no menciona el cobro.
      pagado:
        reservation.pago?.estado === 'pagado'
          ? formatMoney(reservation.pago.montoPagado, club.moneda)
          : null,
      saldoPendiente:
        reservation.pago?.saldoPendiente > 0
          ? formatMoney(reservation.pago.saldoPendiente, club.moneda)
          : null
    });

    const ics = buildReservationICS({
      uid: String(reservation._id),
      inicio: reservation.inicio,
      fin: reservation.fin,
      titulo: `${canchaNombre} · ${club.nombre}`,
      descripcion: `Turno reservado por CourtIn.\nGestionalo en: ${manageUrl}`,
      ubicacion: direccion,
      url: manageUrl,
      confirmado: reservation.estado === 'confirmada'
    });

    return await sendEmail({
      to: email,
      subject,
      html,
      template: 'reservation-confirmed',
      // Una reserva se confirma una sola vez: si el endpoint se llamara dos
      // veces, el jugador igual recibe un único email.
      dedupeKey: `reservation-confirmed:${reservation._id}`,
      refId: reservation._id,
      club: club._id,
      // El jugador responde y le llega al complejo, no a CourtIn.
      replyTo: club.email || undefined,
      attachments: [
        {
          filename: 'turno.ics',
          content: Buffer.from(ics).toString('base64')
        }
      ]
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo enviar la confirmación de reserva:', err.message);
    return { ok: false, error: err.message };
  }
};

/**
 * Recordatorio del turno, 24 h antes. Lo dispara el cron de `jobs/`.
 *
 * `dedupeKey` fijo por reserva: aunque la tarea corra varias veces mientras el
 * turno está dentro de la ventana, el jugador recibe un solo email.
 */
const sendReservationReminder = async ({ reservation, club, court, to, nombre } = {}) => {
  try {
    const email = to || reservation?.guestEmail;

    if (!email || !reservation || !club) {
      return { ok: false, skipped: 'sin email o datos incompletos' };
    }

    const ctx = buildContext(reservation, club, court);

    const { subject, html } = reservationReminderEmail({
      nombre: nombre || reservation.guestName,
      clubNombre: club.nombre,
      canchaNombre: ctx.canchaNombre,
      fecha: ctx.fecha,
      hora: ctx.hora,
      manageUrl: ctx.manageUrl,
      direccion: ctx.direccion,
      telefono: ctx.telefono,
      toleranciaCancelacionHoras: ctx.toleranciaCancelacionHoras
    });

    return await sendEmail({
      to: email,
      subject,
      html,
      template: 'reservation-reminder-24h',
      dedupeKey: `reservation-reminder-24h:${reservation._id}`,
      refId: reservation._id,
      club: club._id,
      replyTo: club.email || undefined
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo enviar el recordatorio:', err.message);
    return { ok: false, error: err.message };
  }
};

/**
 * Aviso de turno cancelado al jugador.
 *
 * Es el email más importante de todos: si el complejo cancela y esto no sale, el
 * jugador se presenta a jugar a un horario que ya no tiene. La notificación
 * dentro de la app no alcanza — un invitado sin cuenta ni siquiera la ve.
 *
 * Adjunta un .ics de baja para que el turno se tache del calendario donde el
 * jugador lo había agregado desde el email de confirmación.
 *
 * @param {boolean} porElComplejo `true` si canceló el complejo, `false` si fue
 *                                el propio jugador (ahí el email es comprobante).
 */
const sendReservationCancellation = async ({
  reservation,
  club,
  court,
  to,
  nombre,
  porElComplejo = false
} = {}) => {
  try {
    const email = to || reservation?.guestEmail;

    if (!email || !reservation || !club) {
      return { ok: false, skipped: 'sin email o datos incompletos' };
    }

    const ctx = buildContext(reservation, club, court);

    const { subject, html } = reservationCancelledEmail({
      nombre: nombre || reservation.guestName,
      clubNombre: club.nombre,
      canchaNombre: ctx.canchaNombre,
      fecha: ctx.fecha,
      hora: ctx.hora,
      direccion: ctx.direccion,
      telefono: ctx.telefono,
      porElComplejo,
      reservarUrl: ctx.clubUrl,
      // Sólo lo cobrado online: lo que se paga en el complejo nunca salió del
      // bolsillo del jugador y no hay nada que devolver.
      pagado:
        reservation.pago?.estado === 'pagado'
          ? formatMoney(reservation.pago.montoPagado, club.moneda)
          : null
    });

    const ics = buildReservationICS({
      // Mismo UID que el .ics de la confirmación: es la baja de ese evento.
      uid: String(reservation._id),
      inicio: reservation.inicio,
      fin: reservation.fin,
      titulo: `${ctx.canchaNombre} · ${club.nombre}`,
      ubicacion: ctx.direccion,
      cancelado: true
    });

    return await sendEmail({
      to: email,
      subject,
      html,
      template: 'reservation-cancelled',
      // El inicio va en la clave y no sólo el id de la reserva: cubre el
      // doble clic en el panel, y a la vez deja avisar de nuevo si el turno se
      // reactivó, se movió de horario y se volvió a cancelar.
      dedupeKey: `reservation-cancelled:${reservation._id}:${new Date(reservation.inicio).getTime()}`,
      refId: reservation._id,
      club: club._id,
      replyTo: club.email || undefined,
      attachments: [
        {
          filename: 'turno-cancelado.ics',
          content: Buffer.from(ics).toString('base64')
        }
      ]
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo avisar la cancelación:', err.message);
    return { ok: false, error: err.message };
  }
};

/**
 * Aviso al complejo sobre el movimiento de un turno.
 *
 * Sólo se dispara por lo que el complejo NO hizo: una reserva que entró por la
 * web o una cancelación del jugador. Avisarle de lo que él mismo acaba de cargar
 * en el backoffice sería ruido, y a las diez veces lo marca como spam.
 *
 * @param {'nueva'|'cancelacion'} tipo
 */
const sendClubReservationNotice = async ({ tipo, reservation, club, court } = {}) => {
  try {
    if (!reservation || !club) {
      return { ok: false, skipped: 'datos incompletos' };
    }

    // Cada aviso se puede apagar por separado desde la configuración del club.
    const preferencia = tipo === 'cancelacion'
      ? club.notificaciones?.cancelacion
      : club.notificaciones?.nuevaReserva;

    // `undefined` en un club anterior a esta funcionalidad cuenta como activado,
    // que es el default del modelo.
    if (preferencia === false) {
      return { ok: false, skipped: 'desactivado por el complejo' };
    }

    const { to } = await emailsDelClub(club);
    if (to.length === 0) {
      return { ok: false, skipped: 'sin destinatario' };
    }

    const ctx = buildContext(reservation, club, court);
    const baseUrl = appUrl();

    const { subject, html } = clubReservaAvisoEmail({
      tipo,
      clubNombre: club.nombre,
      canchaNombre: ctx.canchaNombre,
      fecha: ctx.fecha,
      hora: ctx.hora,
      precio: formatMoney(reservation.precioFinal, club.moneda),
      jugadorNombre: reservation.guestName,
      jugadorTelefono: reservation.guestPhone,
      jugadorEmail: reservation.guestEmail,
      panelUrl: `${baseUrl}/panel/turnos`,
      // Lo primero que necesita saber el complejo de una reserva online: si hay
      // algo que cobrar cuando el jugador llegue, o si ya está todo pago.
      pagado:
        reservation.pago?.estado === 'pagado'
          ? formatMoney(reservation.pago.montoPagado, club.moneda)
          : null,
      saldoPendiente:
        reservation.pago?.saldoPendiente > 0
          ? formatMoney(reservation.pago.saldoPendiente, club.moneda)
          : null
    });

    return await sendEmail({
      to,
      subject,
      html,
      template: `club-reserva-${tipo}`,
      // Un turno genera un aviso de cada tipo, no más.
      dedupeKey: `club-reserva-${tipo}:${reservation._id}`,
      refId: reservation._id,
      club: club._id
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo avisar al complejo:', err.message);
    return { ok: false, error: err.message };
  }
};

/**
 * Aviso de devolución al jugador. Lo dispara el complejo desde el panel.
 *
 * El `dedupeKey` incluye el id del pago y no sólo el de la reserva: si alguna
 * vez hubiera dos cobros devueltos sobre el mismo turno, cada devolución tiene
 * que avisarse.
 */
const sendRefundNotice = async ({ reservation, club, court, payment, to, nombre } = {}) => {
  try {
    const email = to || reservation?.guestEmail;

    if (!email || !reservation || !club || !payment) {
      return { ok: false, skipped: 'sin email o datos incompletos' };
    }

    const ctx = buildContext(reservation, club, court);

    const { subject, html } = reservationRefundedEmail({
      nombre: nombre || reservation.guestName,
      clubNombre: club.nombre,
      canchaNombre: ctx.canchaNombre,
      fecha: ctx.fecha,
      hora: ctx.hora,
      monto: formatMoney(payment.monto, club.moneda)
    });

    return await sendEmail({
      to: email,
      subject,
      html,
      template: 'reservation-refunded',
      dedupeKey: `reservation-refunded:${payment._id}`,
      refId: reservation._id,
      club: club._id,
      replyTo: club.email || undefined
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('No se pudo avisar la devolución:', err.message);
    return { ok: false, error: err.message };
  }
};

module.exports = {
  sendReservationConfirmation,
  sendReservationReminder,
  sendReservationCancellation,
  sendClubReservationNotice,
  sendRefundNotice
};
