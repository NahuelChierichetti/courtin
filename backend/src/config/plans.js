// Planes de suscripción de CourtIn.
//
// Los planes se diferencian ÚNICAMENTE por la cantidad de canchas: todas las
// funciones están disponibles en todos los planes.
//
// Esta tabla es la fuente de verdad de precios y límites. Vive acá y no repartida
// por el código porque con la inflación argentina se toca seguido — y cada club
// conserva el precio que tenía al contratar (`Subscription.precio`), así que
// cambiar estos valores no afecta a quien ya está suscripto.
//
// El ciclo anual es un PAGO ÚNICO ADELANTADO, no doce cuotas con descuento. El
// precio "por mes" es sólo la forma de comunicarlo.

const PLANS = {
  start: {
    key: 'start',
    label: 'Start',
    // null = sin tope
    maxCanchas: 3,
    precios: {
      mensual: 40000,
      anual: 420000
    },
    // Para mostrar en la web: lo que se comunica es el valor mensualizado.
    precioMensualizadoAnual: 35000
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    maxCanchas: 6,
    precios: {
      mensual: 60000,
      anual: 660000
    },
    precioMensualizadoAnual: 55000
  },
  elite: {
    key: 'elite',
    label: 'Elite',
    maxCanchas: null,
    precios: {
      mensual: 80000,
      anual: 900000
    },
    precioMensualizadoAnual: 75000
  }
};

const PLAN_KEYS = Object.keys(PLANS);
const CICLOS = ['mensual', 'anual'];

const MONEDA = 'ARS';

// Duración de la prueba gratis, en días. Un mes para todos los planes.
const TRIAL_DIAS = 30;

const getPlan = (key) => PLANS[key] || null;

const precioDe = (planKey, ciclo = 'mensual') => {
  const plan = getPlan(planKey);
  if (!plan) return null;
  return plan.precios[ciclo] ?? null;
};

// Cuántas canchas admite un plan. `Infinity` para el que no tiene tope, así
// las comparaciones no necesitan tratar el null como caso especial.
const limiteCanchas = (planKey) => {
  const plan = getPlan(planKey);
  if (!plan) return 0;
  return plan.maxCanchas === null ? Infinity : plan.maxCanchas;
};

// Plan mínimo que soporta esa cantidad de canchas. Se usa para sugerir el
// upgrade y para resolver la migración de los planes viejos.
const planParaCanchas = (cantidad) => {
  const encontrado = PLAN_KEYS.find((key) => cantidad <= limiteCanchas(key));
  // Si no entra en ninguno es porque supera todos los topes finitos: va al
  // último, que es el que no tiene límite.
  return encontrado || PLAN_KEYS[PLAN_KEYS.length - 1];
};

// Si un club tiene más canchas de las que su plan permite. Ocurre cuando alguien
// baja de plan teniendo canchas de sobra: NO se le borra nada, sólo se le impide
// crear nuevas hasta que regularice.
const excedeLimite = (planKey, cantidadCanchas) => cantidadCanchas > limiteCanchas(planKey);

module.exports = {
  PLANS,
  PLAN_KEYS,
  CICLOS,
  MONEDA,
  TRIAL_DIAS,
  getPlan,
  precioDe,
  limiteCanchas,
  planParaCanchas,
  excedeLimite
};
