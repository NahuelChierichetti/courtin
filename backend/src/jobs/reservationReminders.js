const Reservation = require('../models/Reservation');
// Los `populate` de abajo necesitan estos modelos registrados en Mongoose. En la
// app los registran los controladores, pero esta tarea también corre suelta
// desde scripts/sendReminders.js, donde nadie más los carga.
require('../models/Club');
require('../models/Court');
require('../models/User');
const { sendReservationReminder } = require('../utils/reservationEmails');

// Recordatorio de turno 24 h antes.
//
// --- Por qué una ventana ancha y no una exacta ---
//
// Lo intuitivo sería buscar los turnos que empiezan justo dentro de los próximos
// 24 h ± el intervalo del cron. El problema es que si una corrida se saltea
// (deploy, reinicio, la instancia free de Render que se durmió), esa reserva
// nunca vuelve a caer en la ventana y el jugador se queda sin recordatorio.
//
// Por eso la ventana es de 2 horas: cada reserva la atraviesa durante 4
// corridas, así que hay que perder 4 seguidas para que se escape. Los envíos
// repetidos no molestan porque `sendReservationReminder` usa un `dedupeKey` fijo
// por reserva: la segunda vez es un no-op.
const VENTANA_DESDE_HORAS = 23;
const VENTANA_HASTA_HORAS = 25;

const ESTADOS_ACTIVOS = ['pendiente', 'confirmada'];

// Resend limita los envíos por segundo. Como esto corre en segundo plano y no
// hay nadie esperando, se manda de a uno con una pausa en vez de en paralelo.
const PAUSA_ENTRE_ENVIOS_MS = 600;

const CLUB_FIELDS = 'nombre direccion ciudad telefono whatsapp email timezone moneda horarios';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Busca los turnos de mañana y les manda el recordatorio.
 * Se puede llamar a mano (ver scripts/sendReminders.js) además del cron.
 *
 * @returns {Promise<{candidatos:number, enviados:number, omitidos:number, fallidos:number}>}
 */
const runReservationReminders = async () => {
  const ahora = Date.now();
  const desde = new Date(ahora + VENTANA_DESDE_HORAS * 60 * 60 * 1000);
  const hasta = new Date(ahora + VENTANA_HASTA_HORAS * 60 * 60 * 1000);

  const reservations = await Reservation.find({
    estado: { $in: ESTADOS_ACTIVOS },
    inicio: { $gte: desde, $lt: hasta }
  })
    .populate('club', CLUB_FIELDS)
    .populate('court', 'nombre tipo')
    .populate('customer', 'nombre email');

  const stats = { candidatos: reservations.length, enviados: 0, omitidos: 0, fallidos: 0 };

  for (const reservation of reservations) {
    // Un turno cargado por teléfono puede no tener email: es normal, no un error.
    const email = reservation.customer?.email || reservation.guestEmail;

    // Si el club se borró (soft delete), populate devuelve null y no hay a
    // nombre de quién mandar el email.
    if (!email || !reservation.club) {
      stats.omitidos += 1;
      continue;
    }

    const result = await sendReservationReminder({
      reservation,
      club: reservation.club,
      court: reservation.court,
      to: email,
      nombre: reservation.customer?.nombre || reservation.guestName
    });

    if (result.ok) stats.enviados += 1;
    else if (result.skipped) stats.omitidos += 1;
    else stats.fallidos += 1;

    if (result.ok) await esperar(PAUSA_ENTRE_ENVIOS_MS);
  }

  return stats;
};

module.exports = { runReservationReminders, VENTANA_DESDE_HORAS, VENTANA_HASTA_HORAS };
