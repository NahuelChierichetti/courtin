// Catálogo de deportes de la plataforma.
//
// Es la fuente de verdad de qué deportes existen: de acá salen el enum de
// `Court.tipo` y el de `Club.deportes`, así que sumar un deporte es agregar una
// entrada en esta tabla y nada más del lado del backend.
//
// Qué deportes ofrece CADA complejo no se decide acá: lo elige el superadmin al
// crear el complejo (`Club.deportes`) y eso es lo que acota las canchas que el
// club puede cargar. Este catálogo es sólo el universo de opciones posibles.
//
// El equivalente visual (color, ícono, superficies sugeridas) vive en
// frontend/src/utils/sports.js. Si se agrega un deporte acá, hay que agregarlo
// también allá o queda sin color ni ícono propio.

const SPORTS = [
  { key: 'futbol', label: 'Fútbol' },
  { key: 'padel', label: 'Pádel' },
  { key: 'tenis', label: 'Tenis' },
  { key: 'basquet', label: 'Básquet' },
  // Cajón de sastre para lo que no entra en los anteriores (multiuso, salón,
  // etc.). Existe para que un complejo raro pueda operar sin bloquear el alta,
  // no para reemplazar al deporte real: si algo se repite, se le hace su lugar.
  { key: 'otro', label: 'Otro' }
];

const SPORT_KEYS = SPORTS.map((s) => s.key);

// Deportes con los que arranca un complejo que se registra por su cuenta, sin
// que un superadmin le arme la configuración. Son los tres más comunes; el
// superadmin los ajusta después desde el panel de complejos.
const DEFAULT_CLUB_SPORTS = ['futbol', 'padel', 'tenis'];

const getSport = (key) => SPORTS.find((s) => s.key === key) || null;

const sportLabel = (key) => getSport(key)?.label || key;

const isValidSport = (key) => SPORT_KEYS.includes(key);

// Limpia una lista de deportes que llega por API: descarta lo que no está en el
// catálogo, saca repetidos y respeta el orden del catálogo (para que la UI los
// muestre siempre igual). Devuelve null si el valor no es una lista.
const normalizeSports = (raw) => {
  if (!Array.isArray(raw)) return null;
  const pedidos = new Set(raw.filter((k) => typeof k === 'string').map((k) => k.trim().toLowerCase()));
  return SPORT_KEYS.filter((key) => pedidos.has(key));
};

module.exports = {
  SPORTS,
  SPORT_KEYS,
  DEFAULT_CLUB_SPORTS,
  getSport,
  sportLabel,
  isValidSport,
  normalizeSports
};
