// Datos de ubicación de Argentina, contra georef-ar-api del Estado
// (https://apis.datos.gob.ar/georef/api). Es la API oficial de datos.gob.ar:
// pública, sin API key y con CORS abierto, así que se consume directo desde el
// navegador sin pasar por nuestro backend.
//
// Por qué una API y no una lista escrita a mano: la ciudad y la dirección son
// el filtro principal del buscador público y lo que después ubica al complejo en
// el mapa. Escritas a mano conviven "Av. San Martín", "san martin" y "S. Martin"
// como tres direcciones distintas, y ninguna geocodifica.
//
// Las tres entidades que usamos, y por qué son ésas:
//   • provincias           → 24, fijas.
//   • localidades-censales → es la unidad que aceptan `/calles` y `/direcciones`.
//     Ojo: NO es lo mismo que `/localidades` (otra jerarquía, otros ids); si se
//     lista una y se consulta la otra, las calles vuelven vacías.
//   • calles               → por localidad censal, con el rango de alturas válido.
//
// El autocompletado de calles se hace en el cliente a propósito. El parámetro
// `nombre` de georef no busca por prefijo ("San Mar" devuelve 0 resultados), así
// que una llamada por tecla no serviría de nada: se baja la lista de calles de
// la localidad una sola vez (~170 KB en Rosario, la más grande) y se filtra en
// memoria.

import {
  PROVINCE_NAMES,
  CABA_PROVINCIA,
  CABA_LOCALIDAD_ID,
  CABA_BARRIOS,
} from '@/utils/provinces'

const BASE = 'https://apis.datos.gob.ar/georef/api'

// Corte de paciencia. Es una dependencia externa en medio de un formulario de
// alta: si tarda más que esto, se cae al modo manual y la persona sigue.
const TIMEOUT_MS = 8000

// Tope de `max` que admite la API por request. Alcanza para la localidad con más
// calles del país (La Plata, 4637).
const MAX_RESULTADOS = 5000

// Cachés de sesión. Los datos son de un censo: no cambian mientras alguien
// completa un formulario, y volver a pedirlos al cambiar de provincia y volver
// sería gratis para nosotros y lento para el usuario.
let provinciasCache = null
const localidadesCache = new Map() // provincia → localidades
const callesCache = new Map() // id de localidad censal → nombres de calle

const get = async (path, params = {}) => {
  const url = new URL(`${BASE}/${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`georef respondió ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// El nomenclador guarda las calles en mayúscula sostenida ("AV SAN MARTIN").
// Tal cual vienen, la dirección terminaría gritada en la ficha pública del
// complejo, así que se pasan a capitalizada antes de mostrarlas. Las partículas
// van en minúscula para que quede "Av. Roque Sáenz Peña" y no "Av. Roque Sáenz
// Peña" con "De" en el medio.
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'el', 'al'])

export const capitalizarCalle = (texto = '') =>
  texto
    .toLowerCase()
    .split(' ')
    .map((palabra, i) => {
      if (!palabra) return palabra
      if (i > 0 && PARTICULAS.has(palabra)) return palabra
      return palabra[0].toUpperCase() + palabra.slice(1)
    })
    .join(' ')

/** Para comparar nombres escritos por una persona con los del censo. */
export const normalizar = (texto = '') =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** En CABA la unidad que elige la gente es el barrio, no la ciudad. */
export const esCABA = (provincia) => normalizar(provincia) === normalizar(CABA_PROVINCIA)

/**
 * Las 24 jurisdicciones.
 *
 * Si la API no contesta cae a la lista estática de provinces.js: son 24 valores
 * que no cambian desde 1990, y no vale la pena frenar un alta por eso.
 */
export const getProvincias = async () => {
  if (provinciasCache) return provinciasCache

  try {
    const data = await get('provincias', { campos: 'id,nombre', max: 30, orden: 'nombre' })
    provinciasCache = data.provincias.map((p) => ({ id: p.id, nombre: p.nombre }))
  } catch {
    provinciasCache = PROVINCE_NAMES.map((nombre) => ({ id: null, nombre }))
  }

  return provinciasCache
}

/**
 * Localidades censales de una provincia.
 *
 * Devuelve también el departamento porque hay homónimas dentro de una misma
 * provincia (Santa Fe tiene dos "Aldao"): sin el departamento al lado, la lista
 * muestra dos opciones idénticas y no hay forma de saber cuál es cuál.
 */
export const getLocalidades = async (provincia) => {
  if (!provincia) return []
  if (localidadesCache.has(provincia)) return localidadesCache.get(provincia)

  // CABA no pasa por la API: son sus 48 barrios, todos con el mismo id censal.
  // Ver la nota en utils/provinces.js.
  if (esCABA(provincia)) {
    const barrios = CABA_BARRIOS.map((nombre) => ({
      // El `key` existe porque en CABA el id se repite en las 48 opciones y el
      // select necesita algo único para saber cuál está elegida.
      key: `${CABA_LOCALIDAD_ID}-${nombre}`,
      id: CABA_LOCALIDAD_ID,
      nombre,
      departamento: null,
    }))
    localidadesCache.set(provincia, barrios)
    return barrios
  }

  const data = await get('localidades-censales', {
    provincia,
    campos: 'id,nombre,departamento.nombre',
    max: MAX_RESULTADOS,
    orden: 'nombre',
  })

  const localidades = data.localidades_censales.map((l) => ({
    key: l.id,
    id: l.id,
    nombre: l.nombre,
    departamento: l.departamento?.nombre || null,
  }))

  localidadesCache.set(provincia, localidades)
  return localidades
}

/** Nombres de calle de una localidad censal, para filtrar en el cliente. */
export const getCalles = async (localidadId) => {
  if (!localidadId) return []
  if (callesCache.has(localidadId)) return callesCache.get(localidadId)

  const data = await get('calles', {
    localidad_censal: localidadId,
    campos: 'nombre',
    max: MAX_RESULTADOS,
    orden: 'nombre',
  })

  // Sin repetidos: una avenida larga aparece varias veces, una por tramo.
  const calles = [...new Set(data.calles.map((c) => capitalizarCalle(c.nombre)))]

  callesCache.set(localidadId, calles)
  return calles
}

/**
 * Separa "San Martín 1234" en calle y altura.
 *
 * La altura es el último número suelto del texto. Se toma el ÚLTIMO y no el
 * primero porque hay calles que empiezan con número ("9 de Julio 1200",
 * "3 de Febrero 450"): buscando el primero, la calle se perdería.
 */
export const parseDireccion = (texto = '') => {
  const limpio = texto.trim()
  const match = limpio.match(/^(.*?)[\s,]+(\d{1,6})\s*$/)

  if (match) return { calle: match[1].trim(), altura: Number(match[2]) }
  return { calle: limpio, altura: null }
}

/**
 * Normaliza una dirección contra el nomenclador y devuelve sus coordenadas.
 *
 * El lat/lon es la mitad del valor de todo esto: es lo que llena
 * `Club.ubicacion` y lo que después pone al complejo en el mapa. Sin esto, la
 * dirección es una cadena de texto que no ubica nada.
 *
 * @returns {Promise<object|null>} null si el nomenclador no la reconoce.
 */
export const normalizarDireccion = async ({ localidadId, direccion }) => {
  if (!localidadId || !direccion?.trim()) return null

  try {
    const data = await get('direcciones', {
      localidad_censal: localidadId,
      direccion,
      max: 1,
    })

    const encontrada = data.direcciones?.[0]
    if (!encontrada) return null

    return {
      nomenclatura: encontrada.nomenclatura,
      calle: encontrada.calle?.nombre ? capitalizarCalle(encontrada.calle.nombre) : null,
      altura: encontrada.altura?.valor ?? null,
      // georef usa `lon`; el modelo Club usa `lng`. La traducción va acá y no en
      // cada pantalla, para que no se filtre el nombre ajeno al resto del código.
      ubicacion: encontrada.ubicacion
        ? { lat: encontrada.ubicacion.lat, lng: encontrada.ubicacion.lon }
        : null,
    }
  } catch {
    // Que el nomenclador no responda no puede frenar un alta: la dirección
    // escrita a mano se guarda igual, sólo que sin coordenadas.
    return null
  }
}

export default {
  esCABA,
  capitalizarCalle,
  getProvincias,
  getLocalidades,
  getCalles,
  normalizarDireccion,
  parseDireccion,
  normalizar,
}
