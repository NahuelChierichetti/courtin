// Helpers compartidos por la vista de Turnos (calendario de reservas).

import { dayjs } from './datetime'

// --- Tiempo en minutos desde medianoche ---

// "HH:MM" -> minutos. "00:30" tras la medianoche puede representarse como cierre,
// por eso normalizeClose lo trata como fin de día.
export const timeToMinutes = (hhmm) => {
  if (!hhmm) return 0
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const minutesToTime = (mins) => {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(mins)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Para horarios de cierre: "00:00"/"00:30" significan después de medianoche.
export const normalizeCloseMinutes = (hhmm) => {
  const min = timeToMinutes(hhmm)
  return min === 0 ? 24 * 60 : min
}

// Los metadatos por deporte (label, colores, superficies) viven en
// utils/sports.js, que es el catálogo. Se re-exporta `sportMeta` porque media
// vista de turnos la usa y no tiene sentido que importen dos archivos.
export { sportMeta } from './sports'

// --- Días de la semana ---

export const WEEKDAY_KEYS = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
]

// Grupos de días usados en las tarifas de las canchas.
const isWeekday = (dow) => dow >= 1 && dow <= 5 // lun-vie
const isWeekend = (dow) => dow === 0 || dow === 6

// Códigos de día canónicos. Índice = dow (0=Dom..6=Sáb).
const DAY_CODES = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
const CODE_SET = new Set(DAY_CODES)

// Determina si una tarifa aplica a un día de la semana (0=Dom..6=Sáb).
// Soporta el formato canónico ("lun,mar,mie,...") y los combos legacy.
const tarifaMatchesDay = (diasRaw, dow) => {
  const dias = (diasRaw || '').toLowerCase().trim()
  if (!dias) return true

  const tokens = dias.split(',').map((s) => s.trim()).filter(Boolean)
  if (tokens.length && tokens.every((t) => CODE_SET.has(t))) {
    return tokens.includes(DAY_CODES[dow])
  }

  if (dias.includes('lun a dom')) return true
  if (dias.includes('lun a sab') && dow >= 1) return true
  if ((dias.includes('lun a vie') || dias.includes('lun-vie')) && isWeekday(dow)) return true
  if (dias.includes('finde') && isWeekend(dow)) return true
  if (dias.includes('feriado')) return false
  if (dias.includes('dom') && dow === 0) return true
  if (dias.includes('sab') && dow === 6) return true
  return false
}

// Precio POR HORA de una cancha para un día/horario. La tarifa configurada se
// interpreta como valor por hora.
export const suggestedPrice = (court, dow, horaInicio) => {
  if (!court) return 0
  const startMin = timeToMinutes(horaInicio)
  const tarifas = court.tarifas || []
  const match = tarifas.find((t) => {
    const ini = timeToMinutes(t.horaInicio)
    const fin = normalizeCloseMinutes(t.horaFin)
    return tarifaMatchesDay(t.dias, dow) && startMin >= ini && startMin < fin
  })
  if (match) return match.precio
  if (tarifas.length) return Math.min(...tarifas.map((t) => t.precio))
  return court.precio || 0
}

// Precio total del turno = precio por hora (franja del inicio) prorrateado por
// la duración en minutos. Ej: $8.000/h en 90 min => $12.000.
export const priceForDuration = (court, dow, horaInicio, durationMin) => {
  const perHour = suggestedPrice(court, dow, horaInicio)
  const mins = Number(durationMin) || court?.duracionTurno || 60
  return Math.round(perHour * (mins / 60))
}

// --- Estados de reserva ---

export const ESTADO_META = {
  pendiente: { label: 'Pendiente', dot: 'bg-warning-500', text: 'text-warning-600' },
  confirmada: { label: 'Confirmada', dot: 'bg-success-500', text: 'text-success-600' },
  completada: { label: 'Completada', dot: 'bg-brand-purple-500', text: 'text-brand-purple-600' },
  cancelada: { label: 'Cancelada', dot: 'bg-stone-400', text: 'text-stone-400' },
}

export const reservationLabel = (r) =>
  r.customer?.nombre || r.guestName || 'Sin nombre'

// --- Estado del cobro online ---

// Resume el pago de una reserva para mostrarlo como chip. Devuelve null cuando
// no hay nada que decir (turno cargado en el mostrador, que se cobra aparte):
// un chip "sin pagar" en cada turno del backoffice sería ruido constante.
export const pagoMeta = (r, formatMoney) => {
  const pago = r?.pago
  if (!pago || pago.estado === 'no_requerido') return null

  if (pago.estado === 'pagado') {
    const señado = pago.saldoPendiente > 0
    return {
      label: señado ? `Seña ${formatMoney(pago.montoPagado)}` : 'Pagado',
      // Con seña queda plata por cobrar en el mostrador: se marca en ámbar para
      // que no se confunda con un turno saldado.
      dot: señado ? 'bg-warning-500' : 'bg-success-500',
      text: señado ? 'text-warning-600' : 'text-success-600',
      detalle: señado ? `Resta ${formatMoney(pago.saldoPendiente)}` : 'Cobrado online',
    }
  }

  if (pago.estado === 'reembolsado') {
    return { label: 'Devuelto', dot: 'bg-stone-400', text: 'text-stone-400', detalle: 'Pago devuelto' }
  }

  return {
    label: 'Sin pagar',
    dot: 'bg-error-500',
    text: 'text-error-500',
    detalle: 'Esperando el pago online',
  }
}

// --- Reglas de horarios del club (semanal + días especiales + anticipación) ---

// Devuelve la configuración efectiva de un día concreto ("YYYY-MM-DD"),
// priorizando días especiales por sobre el horario semanal.
export const dayConfigForDate = (horarios, dateKey) => {
  if (!horarios) return { abierto: true, horaInicio: '00:00', horaFin: '24:00' }

  const especial = (horarios.diasEspeciales || []).find(
    (d) => dayjs.utc(d.fecha).format('YYYY-MM-DD') === dateKey,
  )
  if (especial) {
    if (especial.tipo === 'cerrado') return { abierto: false, especial: true, nombre: especial.nombre }
    if (especial.horaInicio && especial.horaFin) {
      return {
        abierto: true,
        horaInicio: especial.horaInicio,
        horaFin: especial.horaFin,
        especial: true,
        nombre: especial.nombre,
      }
    }
    // Día especial "abierto" sin horario propio: cae al horario semanal.
  }

  const key = WEEKDAY_KEYS[dayjs(dateKey).day()]
  const d = horarios.semanal?.[key]
  if (!d) return { abierto: true, horaInicio: '00:00', horaFin: '24:00' }
  if (d.abierto === false) return { abierto: false }
  return { abierto: true, horaInicio: d.horaInicio, horaFin: d.horaFin }
}

// Rango abierto del día en minutos, o null si está cerrado.
// Solo se usa para *mostrar* (sombrear horas cerradas, sugerir un inicio). La
// validación de reglas es responsabilidad del backend.
export const openRangeForDate = (horarios, dateKey) => {
  const cfg = dayConfigForDate(horarios, dateKey)
  if (!cfg.abierto) return null
  const startMin = timeToMinutes(cfg.horaInicio)
  const endMin = normalizeCloseMinutes(cfg.horaFin)
  if (endMin <= startMin) return null
  return { startMin, endMin }
}
