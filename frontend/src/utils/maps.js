// El complejo en Google Maps, por iframe y sin SDK.
//
// El mapa de la ficha pública es una foto con un pin: no justifica cargar la JS
// API de Google, que además exige una key con facturación habilitada. El embed
// clásico (`output=embed`) hace exactamente eso sin key ni dependencias.
//
// Si en algún momento se necesita más (varios pines, rutas dibujadas), el camino
// está abierto: seteando VITE_GOOGLE_MAPS_API_KEY se pasa solo a la Embed API,
// que es la misma idea con más opciones y mejor calidad de render.

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

const ZOOM_POR_DEFECTO = 16

/** Coordenadas usables: presentes, numéricas y dentro del planeta. */
export const enRango = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180

export const tieneCoords = (u) => {
  if (!u || u.lat == null || u.lng == null || u.lat === '' || u.lng === '') return false
  return enRango(Number(u.lat), Number(u.lng))
}

/**
 * Qué se le pide a Google: el punto exacto si el complejo tiene coordenadas y,
 * si no, la dirección escrita.
 *
 * La dirección como respaldo no es lo mismo que el pin: Google la interpreta y
 * puede clavar el marcador media cuadra más allá, o en otra ciudad homónima. Por
 * eso el panel deja fijar las coordenadas a mano; esto es sólo para que un
 * complejo sin geocodificar igual muestre un mapa aproximado y no un hueco.
 */
export const mapQuery = ({ lat, lng, direccion, ciudad, provincia } = {}) => {
  if (tieneCoords({ lat, lng })) return `${Number(lat)},${Number(lng)}`
  return [direccion, ciudad, provincia].filter(Boolean).join(', ')
}

/** URL para el `src` del iframe. Vacía si no hay ni coordenadas ni dirección. */
export const embedUrl = (opts = {}) => {
  const q = mapQuery(opts)
  if (!q) return ''

  const zoom = opts.zoom || ZOOM_POR_DEFECTO

  if (API_KEY) {
    return `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${encodeURIComponent(q)}&zoom=${zoom}&language=es`
  }

  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&hl=es&output=embed`
}

/** Abrir la ubicación en Google Maps (pestaña nueva). */
export const mapsUrl = (opts = {}) => {
  const q = mapQuery(opts)
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : ''
}

/** "Cómo llegar": Google resuelve el origen con la ubicación del dispositivo. */
export const direccionesUrl = (opts = {}) => {
  const q = mapQuery(opts)
  return q ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}` : ''
}

// "-32.9468, -60.6393" y nada más: anclado a propósito, para no confundir un par
// de coordenadas con dos números cualesquiera que aparezcan en un texto.
const PAR_COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/

/**
 * Saca lat/lng de lo que la persona haya pegado: las coordenadas sueltas o un
 * link de Google Maps.
 *
 * Se prueban varias formas porque Google no tiene una sola: la URL de una ficha
 * trae el pin en `!3d!4d` y el centro de la cámara en `@`, y los links de
 * compartir usan `?q=`. El orden importa —el `@` va último— porque el centro de
 * la cámara puede estar corrido respecto del lugar; si hay algo más preciso, se
 * usa eso.
 *
 * @returns {{lat: number, lng: number}|null}
 */
export const parseCoordenadas = (texto = '') => {
  const valor = String(texto).trim()
  if (!valor) return null

  const intentos = []

  const par = valor.match(PAR_COORDS)
  if (par) intentos.push([par[1], par[2]])

  const ficha = valor.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (ficha) intentos.push([ficha[1], ficha[2]])

  if (/^https?:\/\//i.test(valor)) {
    try {
      const url = new URL(valor)
      for (const clave of ['q', 'query', 'll', 'center', 'destination', 'daddr']) {
        const m = (url.searchParams.get(clave) || '').match(PAR_COORDS)
        if (m) intentos.push([m[1], m[2]])
      }
    } catch {
      // URL mal formada: quedan las otras heurísticas.
    }
  }

  const camara = valor.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (camara) intentos.push([camara[1], camara[2]])

  for (const [a, b] of intentos) {
    const lat = Number(a)
    const lng = Number(b)
    if (enRango(lat, lng)) return { lat, lng }
  }

  return null
}

/**
 * Los links cortos de la app de Google Maps no se pueden resolver desde el
 * navegador (redirigen sin CORS), y son justo los que la gente comparte. Se
 * detectan para poder explicar qué hacer en vez de decir "link inválido".
 */
export const esLinkCorto = (texto = '') => /(maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(String(texto))

/** Cómo se muestran las coordenadas guardadas. */
export const formatCoords = ({ lat, lng } = {}) =>
  tieneCoords({ lat, lng }) ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` : ''

export default {
  tieneCoords,
  mapQuery,
  embedUrl,
  mapsUrl,
  direccionesUrl,
  parseCoordenadas,
  esLinkCorto,
  formatCoords,
}
