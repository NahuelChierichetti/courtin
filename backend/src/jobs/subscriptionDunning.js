const Club = require('../models/Club');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
require('../models/User');
require('../models/Membership');

const {
  diasDeMora,
  estadoPorSuscripcion,
  esperaAprobacion,
  DIAS_NIVEL_1,
  DIAS_NIVEL_2
} = require('../utils/subscriptions');
const {
  ensureSubscription,
  sincronizarEstado,
  emitirFactura,
  facturaAbierta,
  notificarFactura,
  notificarTrial,
  notificarDeuda,
  periodoDe
} = require('../utils/billing');

// Ciclo diario de suscripciones. Es lo que hace que el sistema funcione solo:
// sin esto, un club que cae en mora no se despublica hasta que alguien abra la
// pantalla de suscripción.
//
// Cada corrida, por cada club:
//   1. Emite la factura del período si corresponde
//   2. Marca como vencidas las facturas pasadas de fecha
//   3. Aplica el estado que le toca (activo / impago / suspendido)
//   4. Manda el aviso de la etapa en la que está
//
// Como el abono se cobra por fuera de la plataforma, estos emails NO son un
// recordatorio: son el mecanismo de cobranza. Si no salen, nadie se entera.

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Avisos del trial, por días restantes.
const AVISOS_TRIAL = [7, 1, 0];

// Escalón de aviso que le corresponde a los días que quedan de prueba.
//
// Es "el umbral ya alcanzado" y no "el umbral exacto de hoy" por el mismo
// motivo que la escalera de deuda: si una corrida se saltea (deploy, instancia
// dormida), un umbral exacto pierde ese aviso para siempre y el complejo se
// entera de que se le termina la prueba cuando ya se le terminó. El escalón sólo
// define la clave de dedupe; el email siempre dice los días reales.
const escalonTrial = (restantes) => {
  const alcanzados = AVISOS_TRIAL.filter((umbral) => restantes <= umbral);
  return alcanzados.length ? Math.min(...alcanzados) : null;
};

// Cuántos días antes del vencimiento se emite la factura. Emitirla el día
// después de vencer llegaría tarde: el complejo recibiría el aviso cuando ya
// está en mora, sin margen para pagar a tiempo.
const DIAS_PREVIOS_FACTURA = 5;

// Escalera de cobranza. Se toma la etapa de mayor `dia` que ya se haya
// alcanzado: si una corrida se saltea, no se mandan los avisos atrasados en
// bloque, se sigue con el que corresponde a hoy.
const ETAPAS_DEUDA = [
  { dia: 0, etapa: 'vencida' },
  { dia: DIAS_NIVEL_1 - 2, etapa: 'aviso-despublicacion' }, // día 5
  { dia: DIAS_NIVEL_1, etapa: 'despublicado' }, // día 7
  { dia: 14, etapa: 'recordatorio' },
  { dia: 21, etapa: 'recordatorio-2' },
  { dia: DIAS_NIVEL_2 - 2, etapa: 'aviso-suspension' }, // día 28
  { dia: DIAS_NIVEL_2, etapa: 'suspendido' } // día 30
];

const etapaParaMora = (dias) => {
  const alcanzadas = ETAPAS_DEUDA.filter((e) => dias >= e.dia);
  return alcanzadas.length ? alcanzadas[alcanzadas.length - 1] : null;
};

const diasHasta = (fecha, ahora) => Math.ceil((new Date(fecha).getTime() - ahora.getTime()) / MS_POR_DIA);

/**
 * Corre el ciclo completo. Se puede invocar a mano (scripts/runDunning.js).
 *
 * @returns {Promise<object>} Contadores de lo que hizo.
 */
const runSubscriptionCycle = async (ahora = new Date()) => {
  const stats = {
    revisadas: 0,
    sinAprobar: 0,
    suscripcionesCreadas: 0,
    facturasEmitidas: 0,
    facturasVencidas: 0,
    cambiosDeEstado: 0,
    avisosTrial: 0,
    avisosDeuda: 0,
    sinDestinatario: 0
  };

  // Se recorren los CLUBES y no las suscripciones a propósito.
  //
  // Si se iterara `Subscription`, un complejo sin suscripción quedaría fuera del
  // circuito de cobranza para siempre y en silencio. Y eso pasa seguido: los
  // clubes creados por un superadmin desde el panel no tienen una, y tampoco los
  // anteriores a esta funcionalidad. Iterando clubes, la tarea se autorrepara.
  //
  // `Club.find()` ya excluye los borrados lógicamente.
  const clubs = await Club.find();
  stats.revisadas = clubs.length;

  for (const club of clubs) {
    // Un alta que todavía no aprobó nadie no tiene nada que facturar. Sin este
    // corte, `ensureSubscription` le arrancaría el trial en el primer barrido y
    // el complejo perdería días de prueba mientras espera la aprobación.
    if (esperaAprobacion(club)) {
      stats.sinAprobar += 1;
      continue;
    }

    const existia = await Subscription.exists({ club: club._id });
    const subscription = await ensureSubscription(club);
    if (!existia) stats.suscripcionesCreadas += 1;

    // Una suscripción dada de baja no se cobra ni se avisa.
    if (subscription.canceladaEn) continue;

    // --- 1. Emisión ---
    // Sólo si no hay ninguna factura abierta. Un club que ya debe no acumula
    // facturas nuevas: la deuda se negocia con soporte, y apilar períodos sobre
    // un complejo que además está suspendido (o sea, sin usar el servicio) no
    // tiene sentido comercial.
    const abierta = await Invoice.findOne({
      club: club._id,
      estado: { $in: ['pendiente', 'vencida'] }
    });

    // Se emite cuando falta poco para que termine lo que está pago (o ya
    // terminó). Sin ninguna fecha de referencia, se emite de una: es un club
    // que nunca tuvo trial ni pagó nada.
    const referencia = subscription.vigenciaHasta || subscription.trialHasta;
    const faltanDias = referencia ? diasHasta(referencia, ahora) : -Infinity;

    let recienEmitida = false;

    if (!abierta && faltanDias <= DIAS_PREVIOS_FACTURA) {
      const invoice = await emitirFactura({
        club,
        subscription,
        periodo: periodoDe(ahora, subscription.ciclo)
      });
      stats.facturasEmitidas += 1;
      recienEmitida = true;
      const aviso = await notificarFactura(club, invoice);
      if (aviso.skipped === 'sin destinatario') stats.sinDestinatario += 1;
    }

    // --- 2. Marcar vencidas ---
    const vencidas = await Invoice.updateMany(
      { club: club._id, estado: 'pendiente', vencimiento: { $lt: ahora } },
      { estado: 'vencida' }
    );
    stats.facturasVencidas += vencidas.modifiedCount || 0;

    // --- 3. Estado ---
    const estadoAnterior = club.estado;
    const estadoNuevo = await sincronizarEstado(club, subscription, ahora);
    if (estadoNuevo !== estadoAnterior) stats.cambiosDeEstado += 1;

    // --- 4. Avisos ---
    // La factura que se reclama, y desde cuyo vencimiento corre la escalera de
    // cobranza. Se busca antes que la mora justamente porque es su referencia.
    const factura = await facturaAbierta(club._id);
    const mora = diasDeMora(subscription, ahora, factura?.vencimiento || null);

    if (mora === 0 && subscription.trialHasta && ahora <= subscription.trialHasta) {
      // Todavía en trial: avisos de "se termina".
      const restantes = diasHasta(subscription.trialHasta, ahora);
      const escalon = escalonTrial(restantes);
      if (escalon !== null) {
        const r = await notificarTrial(club, subscription, restantes, escalon);
        if (r.ok) stats.avisosTrial += 1;
        if (r.skipped === 'sin destinatario') stats.sinDestinatario += 1;
      }
      continue;
    }

    if (!factura) continue; // Nada emitido: no hay nada que reclamar.

    // El corte es el vencimiento de la factura, no los días de mora: `mora` es 0
    // tanto para el que está al día como para el que venció hace unas horas, y
    // el primer aviso de la escalera (`vencida`, día 0) tiene que salir en la
    // primera corrida posterior al vencimiento, no un día después.
    if (new Date(factura.vencimiento) >= ahora) continue;

    // La factura salió en esta misma corrida. Mandarle además un aviso de deuda
    // sería contradecirnos por partida doble: dos emails en el mismo minuto, y
    // uno reclamando algo que el otro recién le está avisando. Con el piso de
    // vencimiento de `emitirFactura` esto no debería pasar nunca; queda como
    // red de seguridad porque el costo de equivocarse es un email que asusta a
    // un cliente al día.
    if (recienEmitida) continue;

    const etapa = etapaParaMora(mora);
    if (!etapa) continue;

    // Se pasa la etapa real: `notificarDeuda` resuelve qué plantilla usar y la
    // clave de dedupe queda única por escalón.
    const r = await notificarDeuda(club, factura, etapa.etapa, mora);
    if (r.ok) stats.avisosDeuda += 1;
    if (r.skipped === 'sin destinatario') stats.sinDestinatario += 1;
  }

  return stats;
};

module.exports = { runSubscriptionCycle, ETAPAS_DEUDA, AVISOS_TRIAL };
