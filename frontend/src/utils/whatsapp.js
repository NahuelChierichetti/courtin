// Mensajes de WhatsApp para avisarle al jugador por un turno.
//
// --- Qué es y qué no es ---
//
// Esto NO manda mensajes. Arma un link `wa.me` que abre WhatsApp (la app en el
// celular, WhatsApp Web en la compu) con el mensaje ya escrito en el chat de la
// persona: el complejo sólo tiene que apretar Enviar. No hay integración con
// Meta, no hay costo por mensaje, y tampoco hay confirmación de entrega ni
// forma de saber si finalmente lo mandó. Por eso los botones dicen "por
// WhatsApp" y no "Enviar": lo que hacen es abrir la conversación.
//
// A cambio de esas limitaciones, funciona desde el día uno y con cualquier
// número, que es justo lo que un complejo necesita para confirmar un turno.

import { dayjs, formatCurrency, DEFAULT_TZ } from './datetime'

// --- Normalización del número ---
//
// `wa.me` sólo acepta el número en formato internacional, sólo dígitos, sin
// `+`. Un teléfono guardado como "221 15 456-7890" —que es como lo escribe
// cualquiera— arma un link que WhatsApp rechaza con un "número no válido" sin
// explicar nada.
//
// Esta lógica es gemela de `backend/src/utils/phone.js`, que es la que valida
// el dato al guardarlo. Está duplicada porque no hay código compartido entre
// los dos paquetes; si cambia una, tiene que cambiar la otra. Acá además tiene
// que ser tolerante: los turnos cargados antes de que el teléfono fuera
// obligatorio pueden tener cualquier formato y el botón tiene que funcionar
// igual siempre que el número se pueda deducir.
//
// Argentina: 54 + 9 + característica (sin el 0) + abonado (sin el 15), donde
// característica + abonado suman siempre 10 dígitos.

const AR = '54'

const sacarQuince = (nacional) => {
  if (nacional.length !== 12) return nacional

  // El `15` va después de la característica, y dónde termina depende del largo:
  // sólo el 11 (AMBA) es de 2 dígitos, el resto son de 3 o 4.
  const posiciones = nacional.startsWith('11') ? [2] : [3, 4]

  for (const i of posiciones) {
    if (nacional.slice(i, i + 2) === '15') {
      return nacional.slice(0, i) + nacional.slice(i + 2)
    }
  }

  return nacional
}

/**
 * Pasa un teléfono escrito de cualquier forma al formato que necesita wa.me.
 * @returns {string|null} Sólo dígitos con código de país, o null si no se puede.
 */
export const normalizePhone = (raw) => {
  if (!raw) return null

  const texto = String(raw).trim()
  const internacional = texto.startsWith('+') || texto.startsWith('00')
  let digitos = texto.replace(/\D/g, '')

  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  if (!digitos) return null

  // Un número de otro país escrito en internacional se respeta tal cual.
  if (internacional && !digitos.startsWith(AR)) {
    return digitos.length >= 8 && digitos.length <= 15 ? digitos : null
  }

  let nacional = digitos
  if (nacional.startsWith(AR) && nacional.length > 10) nacional = nacional.slice(AR.length)
  if (nacional.startsWith('9') && nacional.length > 10) nacional = nacional.slice(1)
  if (nacional.startsWith('0')) nacional = nacional.slice(1)

  nacional = sacarQuince(nacional)

  return nacional.length === 10 ? `${AR}9${nacional}` : null
}

/** ¿Se le puede escribir por WhatsApp a este teléfono? */
export const puedeWhatsapp = (raw) => normalizePhone(raw) !== null

/**
 * Arma el link que abre WhatsApp con el mensaje cargado.
 * @returns {string|null} null si el teléfono no se pudo normalizar.
 */
export const waLink = (telefono, texto) => {
  const numero = normalizePhone(telefono)
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

// --- Los mensajes ---
//
// Se escriben acá y no en un template configurable por complejo: son dos
// mensajes cortos y el complejo puede editarlos en WhatsApp antes de enviar,
// que es la personalización que realmente se usa.
//
// Sin markdown ni emojis de más: el texto viaja en una URL y lo que se lee del
// otro lado es un mensaje de una persona, no una notificación automática.

const datosDelTurno = (reservation, court, tz, moneda) => {
  const inicio = dayjs.utc(reservation.inicio).tz(tz)
  const fin = dayjs.utc(reservation.fin).tz(tz)
  const fecha = inicio.format('dddd D [de] MMMM')

  return {
    nombre: (reservation.guestName || reservation.customer?.nombre || '').split(' ')[0] || '',
    cancha: court?.nombre || reservation.court?.nombre || 'la cancha',
    // El día en minúscula ("sábado 6 de septiembre") se lee como parte de la
    // frase; capitalizado parece un encabezado pegado en el medio del mensaje.
    fecha,
    hora: `${inicio.format('HH:mm')} a ${fin.format('HH:mm')}`,
    precio: reservation.precioFinal ? formatCurrency(reservation.precioFinal, moneda) : null,
  }
}

// Saldo pendiente cuando el jugador pagó una seña online. Es el dato que más se
// pregunta por teléfono, así que va en el mensaje.
const lineaDePago = (reservation, moneda) => {
  const saldo = Number(reservation?.pago?.saldoPendiente) || 0
  if (saldo <= 0) return null
  return `Te queda un saldo de ${formatCurrency(saldo, moneda)} para abonar en el complejo.`
}

/**
 * Mensaje de confirmación: se manda cuando se carga o confirma el turno.
 */
export const mensajeConfirmacion = ({ reservation, club, court, tz = DEFAULT_TZ, moneda = 'ARS' }) => {
  const t = datosDelTurno(reservation, court, tz, moneda)
  const saludo = t.nombre ? `Hola ${t.nombre}!` : 'Hola!'

  const lineas = [
    `${saludo} Te confirmamos tu turno en ${club?.nombre || 'el complejo'}.`,
    '',
    `Cancha: ${t.cancha}`,
    `Día: ${t.fecha}`,
    `Horario: ${t.hora}`,
  ]

  if (t.precio) lineas.push(`Precio: ${t.precio}`)

  const pago = lineaDePago(reservation, moneda)
  if (pago) lineas.push('', pago)

  lineas.push('', 'Cualquier cosa escribinos por acá. Nos vemos!')

  return lineas.join('\n')
}

/**
 * Mensaje de recordatorio: se manda el día anterior o unas horas antes.
 *
 * Más corto que la confirmación a propósito. El jugador ya sabe que reservó;
 * lo que necesita es la hora y poder avisar si no va, que es el único motivo
 * por el que a un complejo le sirve mandar un recordatorio.
 */
export const mensajeRecordatorio = ({ reservation, club, court, tz = DEFAULT_TZ, moneda = 'ARS' }) => {
  const t = datosDelTurno(reservation, court, tz, moneda)
  const saludo = t.nombre ? `Hola ${t.nombre}!` : 'Hola!'

  const inicio = dayjs.utc(reservation.inicio).tz(tz)
  const esHoy = inicio.isSame(dayjs().tz(tz), 'day')
  const cuando = esHoy ? `hoy de ${t.hora}` : `${t.fecha} de ${t.hora}`

  const lineas = [
    `${saludo} Te recordamos tu turno en ${club?.nombre || 'el complejo'}: ${t.cancha}, ${cuando}.`,
  ]

  const pago = lineaDePago(reservation, moneda)
  if (pago) lineas.push('', pago)

  lineas.push('', 'Si no podés venir, avisanos así liberamos el horario. Gracias!')

  return lineas.join('\n')
}
