// Catálogo de deportes del frontend.
//
// Es la única lista de deportes de la interfaz: labels, colores, superficies
// sugeridas y duración por defecto salen de acá, así que sumar un deporte es
// agregar una entrada (y su color en style.css). El espejo del backend está en
// backend/src/config/sports.js — las `key` tienen que coincidir.
//
// Ojo con la diferencia entre el CATÁLOGO y los deportes de un COMPLEJO: este
// archivo dice qué deportes existen en la plataforma, pero lo que se le muestra
// a un club es siempre `club.deportes` (lo que le habilitó el superadmin). Para
// eso está `sportsForClub`.
//
// Las clases de Tailwind van escritas enteras a propósito: si se armaran
// concatenando (`bg-sport-${key}-50`), el compilador no las ve y no las genera.

export const SPORTS = [
  {
    key: 'futbol',
    label: 'Fútbol',
    // Para gráficos (SVG/canvas), donde no se puede usar una clase.
    hex: '#347048',
    accent: 'bg-sport-futbol-500',
    border: 'border-sport-futbol-500',
    bg: 'bg-sport-futbol-50',
    bgSoft: 'bg-sport-futbol-100',
    bgStrong: 'bg-sport-futbol-500',
    text: 'text-sport-futbol-700',
    textSoft: 'text-sport-futbol-600',
    ring: 'ring-sport-futbol-100',
    dot: 'bg-sport-futbol-500',
    superficies: ['Césped sintético', 'Césped natural', 'Cemento / Futsal'],
    duracionSugerida: 60,
    // Sólo el fútbol se cuenta por jugadores (F5, F7, F11); en el resto el dato
    // no significa nada y el formulario lo esconde.
    pideJugadores: true,
  },
  {
    key: 'padel',
    label: 'Pádel',
    hex: '#2f6fb0',
    accent: 'bg-sport-padel-500',
    border: 'border-sport-padel-500',
    bg: 'bg-sport-padel-50',
    bgSoft: 'bg-sport-padel-100',
    bgStrong: 'bg-sport-padel-500',
    text: 'text-sport-padel-700',
    textSoft: 'text-sport-padel-600',
    ring: 'ring-sport-padel-100',
    dot: 'bg-sport-padel-500',
    superficies: ['Muro de cemento', 'Cristal (Blindex)', 'Panorámica', 'Sintética'],
    duracionSugerida: 90,
    pideJugadores: false,
  },
  {
    key: 'tenis',
    label: 'Tenis',
    hex: '#b9cf32',
    accent: 'bg-sport-tenis-500',
    border: 'border-sport-tenis-500',
    bg: 'bg-sport-tenis-50',
    bgSoft: 'bg-sport-tenis-100',
    bgStrong: 'bg-sport-tenis-500',
    // El lima es demasiado claro para texto: sobre blanco recién contrasta en
    // el tono 800.
    text: 'text-sport-tenis-800',
    textSoft: 'text-sport-tenis-700',
    ring: 'ring-sport-tenis-100',
    dot: 'bg-sport-tenis-500',
    superficies: ['Polvo de ladrillo', 'Cemento / Hard', 'Césped', 'Sintética / Resina'],
    duracionSugerida: 90,
    pideJugadores: false,
  },
  {
    key: 'basquet',
    label: 'Básquet',
    hex: '#e07b32',
    accent: 'bg-sport-basquet-500',
    border: 'border-sport-basquet-500',
    bg: 'bg-sport-basquet-50',
    bgSoft: 'bg-sport-basquet-100',
    bgStrong: 'bg-sport-basquet-500',
    text: 'text-sport-basquet-700',
    textSoft: 'text-sport-basquet-600',
    ring: 'ring-sport-basquet-100',
    dot: 'bg-sport-basquet-500',
    superficies: ['Parquet', 'Cemento', 'Sintética'],
    duracionSugerida: 60,
    pideJugadores: false,
  },
  {
    key: 'otro',
    label: 'Otro',
    hex: '#b8a08b',
    accent: 'bg-sport-otro-500',
    border: 'border-sport-otro-500',
    bg: 'bg-sport-otro-50',
    bgSoft: 'bg-sport-otro-100',
    bgStrong: 'bg-sport-otro-500',
    text: 'text-sport-otro-700',
    textSoft: 'text-sport-otro-600',
    ring: 'ring-sport-otro-100',
    dot: 'bg-sport-otro-500',
    superficies: [],
    duracionSugerida: 60,
    pideJugadores: false,
  },
]

export const SPORT_KEYS = SPORTS.map((s) => s.key)

// Deportes que se ofrecen como filtro en la web pública. Es el catálogo sin
// "Otro": nadie busca "una cancha de otro", y como filtro no le diría nada al
// jugador. Las canchas cargadas como "Otro" siguen apareciendo en la ficha del
// complejo y en el listado sin filtrar.
export const PUBLIC_SPORTS = SPORTS.filter((s) => s.key !== 'otro')

const BY_KEY = Object.fromEntries(SPORTS.map((s) => [s.key, s]))

// Deporte desconocido (dato viejo o de un catálogo posterior): se muestra en
// gris con su propia clave como label, en vez de romper la vista.
const desconocido = (key) => ({ ...BY_KEY.otro, key: key || 'otro', label: key || 'Otro' })

export const sportMeta = (key) => BY_KEY[key] || desconocido(key)

export const sportLabel = (key) => sportMeta(key).label

export const sportHex = (key) => sportMeta(key).hex

// Los deportes habilitados de un complejo, en el orden del catálogo y ya
// resueltos a su metadata. Es lo que alimenta los selectores y filtros del
// panel: nunca hay que listar SPORTS directamente en una vista de club.
//
// Si el club todavía no llegó (carga inicial) devuelve una lista vacía: es
// preferible un selector vacío por un instante a ofrecer deportes que el club
// no tiene.
export const sportsForClub = (club) => {
  const habilitados = club?.deportes
  if (!Array.isArray(habilitados)) return []
  return SPORTS.filter((s) => habilitados.includes(s.key))
}

// Opciones para un `<select>`/chips: { value, label }.
export const sportOptions = (club) => sportsForClub(club).map((s) => ({ value: s.key, label: s.label }))
