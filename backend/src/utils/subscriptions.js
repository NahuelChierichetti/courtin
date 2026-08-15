// Estado de acceso de un complejo según su suscripción.
//
// Cómo se reparte la responsabilidad:
//   • Este módulo es una función pura: dadas las fechas de la suscripción,
//     dice qué estado le corresponde al club.
//   • El cron de dunning lo usa para escribir `Club.estado`.
//   • Las lecturas (búsqueda pública, guards del panel) consultan `Club.estado`,
//     que ya está persistido — no recalculan nada.
//
// Se persiste en vez de calcularse al vuelo porque las consultas públicas tienen
// que poder filtrar por estado en la base, sin traerse todos los clubes a
// memoria para evaluarlos uno por uno.

// Días desde el vencimiento hasta cada corte.
const DIAS_NIVEL_1 = 7; // se despublica y deja de cargar turnos
const DIAS_NIVEL_2 = 30; // se bloquea el panel

const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Qué puede hacer un club en cada estado.
//
// `accedePanel` no cubre la página de suscripción: esa vive fuera del guard a
// propósito, porque si no un club suspendido no podría pagar y saldría del
// bloqueo. Ver docs/suscripciones.md.
const CAPACIDADES = {
  // El alta se pidió desde el registro público y todavía no la revisó un
  // superadmin. No es un estado de facturación: el trial arranca recién cuando
  // se aprueba, así que la espera no le come días de prueba a nadie.
  pendiente: { publicado: false, creaReservas: false, accedePanel: false },
  rechazado: { publicado: false, creaReservas: false, accedePanel: false },
  trial: { publicado: true, creaReservas: true, accedePanel: true },
  activo: { publicado: true, creaReservas: true, accedePanel: true },
  impago: { publicado: false, creaReservas: false, accedePanel: true },
  suspendido: { publicado: false, creaReservas: false, accedePanel: false },
  cancelado: { publicado: false, creaReservas: false, accedePanel: false },
  // Apagado manual por un superadmin, sin relación con el pago.
  inactivo: { publicado: false, creaReservas: false, accedePanel: false }
};

const SIN_ACCESO = { publicado: false, creaReservas: false, accedePanel: false };

const capacidades = (estado) => CAPACIDADES[estado] || SIN_ACCESO;

// Listas derivadas de la tabla de arriba, para no repetir los estados sueltos
// por el código. Si mañana cambia una capacidad, cambia en un solo lugar.
const estadosCon = (capacidad) =>
  Object.keys(CAPACIDADES).filter((estado) => CAPACIDADES[estado][capacidad]);

const ESTADOS_VISIBLES = estadosCon('publicado');
const ESTADOS_CON_RESERVAS = estadosCon('creaReservas');
const ESTADOS_CON_PANEL = estadosCon('accedePanel');

/**
 * Filtro de Mongo para los clubes visibles en la interfaz pública: además del
 * opt-in manual (`publicado`), el estado de la suscripción tiene que permitirlo.
 * Un club en mora nivel 1 desaparece del buscador sin que nadie toque su flag.
 */
const filtroClubVisible = (extra = {}) => ({
  publicado: true,
  estado: { $in: ESTADOS_VISIBLES },
  ...extra
});

const puedeCrearReservas = (club) => ESTADOS_CON_RESERVAS.includes(club?.estado);
const puedeAccederPanel = (club) => ESTADOS_CON_PANEL.includes(club?.estado);

// Estados previos al alta efectiva. Un club acá no entra al circuito de
// facturación: no tiene suscripción, no se le emite factura y el cron de
// dunning lo saltea. Sin esta lista, `ensureSubscription` le arrancaría el trial
// al primer barrido y la espera de la aprobación se le descontaría de la prueba.
const ESTADOS_SIN_ALTA = ['pendiente', 'rechazado'];

const esperaAprobacion = (club) => ESTADOS_SIN_ALTA.includes(club?.estado);

const diasEntre = (desde, hasta) => Math.floor((hasta.getTime() - desde.getTime()) / MS_POR_DIA);

/**
 * Estado que le corresponde a un club según su suscripción.
 *
 * Ojo con la ventana de gracia: entre el vencimiento y el día 7 el club sigue
 * `activo`. Debe plata y recibe avisos, pero todavía no se le restringe nada.
 * Es deliberado — cortar el mismo día del vencimiento, sin débito automático,
 * sería cortarle el servicio a cualquiera que se demore un fin de semana.
 *
 * @param {object} subscription Documento de Subscription.
 * @param {Date}   ahora        Inyectable para poder testear.
 * @returns {string} Un valor válido de `Club.estado`.
 */
const estadoPorSuscripcion = (subscription, ahora = new Date()) => {
  // Sin suscripción no hay nada que cobrar: se lo trata como apagado manual y
  // no como moroso, para no despublicar clubes por un dato que falta.
  if (!subscription) return 'inactivo';

  if (subscription.canceladaEn) return 'cancelado';

  // El trial manda mientras esté vigente, aunque no haya pagado nada.
  if (subscription.trialHasta && ahora <= subscription.trialHasta) return 'trial';

  if (subscription.vigenciaHasta && ahora <= subscription.vigenciaHasta) return 'activo';

  // Vencido: la referencia es el fin de la vigencia o, si nunca pagó, el fin
  // del trial.
  const referencia = subscription.vigenciaHasta || subscription.trialHasta;

  // Sin ninguna fecha no se puede calcular mora. Se lo deja fuera de servicio en
  // vez de asumir que está al día.
  if (!referencia) return 'inactivo';

  const diasDeMora = diasEntre(referencia, ahora);

  if (diasDeMora >= DIAS_NIVEL_2) return 'suspendido';
  if (diasDeMora >= DIAS_NIVEL_1) return 'impago';

  return 'activo';
};

/**
 * Días de mora acumulados. 0 si está al día.
 * Lo usan los emails de dunning para saber qué aviso toca.
 */
const diasDeMora = (subscription, ahora = new Date()) => {
  if (!subscription) return 0;

  const referencia = subscription.vigenciaHasta || subscription.trialHasta;
  if (!referencia || ahora <= referencia) return 0;

  return diasEntre(referencia, ahora);
};

/**
 * Cuántos días faltan para el próximo corte, y cuál sería.
 * Alimenta el aviso del panel: "en 3 días se despublica tu complejo".
 */
const proximoCorte = (subscription, ahora = new Date()) => {
  const mora = diasDeMora(subscription, ahora);

  if (mora < DIAS_NIVEL_1) {
    return { nivel: 1, enDias: DIAS_NIVEL_1 - mora, efecto: 'despublicacion' };
  }
  if (mora < DIAS_NIVEL_2) {
    return { nivel: 2, enDias: DIAS_NIVEL_2 - mora, efecto: 'bloqueo-panel' };
  }
  // Ya pasó todo: no queda nada por cortar.
  return null;
};

/**
 * Suma un ciclo a una fecha. Se usa al acreditar un pago para extender la
 * vigencia.
 *
 * La extensión parte del vencimiento anterior y no de hoy, así quien paga tarde
 * no gana días gratis. Salvo que la vigencia haya quedado muy atrás: ahí se
 * cuenta desde hoy, porque si no un club que vuelve tras meses de baja pagaría
 * un período que ya pasó.
 */
const extenderVigencia = (vigenciaActual, ciclo = 'mensual', ahora = new Date()) => {
  const base = vigenciaActual && vigenciaActual > ahora ? new Date(vigenciaActual) : new Date(ahora);

  if (ciclo === 'anual') {
    base.setFullYear(base.getFullYear() + 1);
  } else {
    base.setMonth(base.getMonth() + 1);
  }

  return base;
};

module.exports = {
  DIAS_NIVEL_1,
  DIAS_NIVEL_2,
  CAPACIDADES,
  capacidades,
  ESTADOS_VISIBLES,
  ESTADOS_CON_RESERVAS,
  ESTADOS_CON_PANEL,
  ESTADOS_SIN_ALTA,
  filtroClubVisible,
  puedeCrearReservas,
  puedeAccederPanel,
  esperaAprobacion,
  estadoPorSuscripcion,
  diasDeMora,
  proximoCorte,
  extenderVigencia
};
