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

// --- Metadatos por deporte (colores plenos, sin gradientes) ---

export const SPORT_META = {
  padel: {
    label: 'Pádel',
    accent: 'bg-primitive-blue-500',
    border: 'border-primitive-blue-500',
    bg: 'bg-primitive-blue-50',
    bgStrong: 'bg-primitive-blue-500',
    text: 'text-primitive-blue-700',
    textSoft: 'text-primitive-blue-600',
    ring: 'ring-primitive-blue-200',
    dot: 'bg-primitive-blue-500',
  },
  tenis: {
    label: 'Tenis',
    accent: 'bg-primitive-orange-500',
    border: 'border-primitive-orange-500',
    bg: 'bg-primitive-orange-50',
    bgStrong: 'bg-primitive-orange-500',
    text: 'text-primitive-orange-700',
    textSoft: 'text-primitive-orange-600',
    ring: 'ring-primitive-orange-200',
    dot: 'bg-primitive-orange-500',
  },
  futbol: {
    label: 'Fútbol',
    accent: 'bg-success-500',
    border: 'border-success-500',
    bg: 'bg-success-50',
    bgStrong: 'bg-success-500',
    text: 'text-success-700',
    textSoft: 'text-success-600',
    ring: 'ring-success-200',
    dot: 'bg-success-500',
  },
}

export const FALLBACK_SPORT = {
  label: 'Otro',
  accent: 'bg-slate-400',
  border: 'border-slate-400',
  bg: 'bg-slate-50',
  bgStrong: 'bg-slate-400',
  text: 'text-slate-700',
  textSoft: 'text-slate-600',
  ring: 'ring-slate-200',
  dot: 'bg-slate-400',
}

export const sportMeta = (tipo) => SPORT_META[tipo] || FALLBACK_SPORT

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

// Determina si una tarifa aplica a un día de la semana (0=Dom..6=Sáb).
const tarifaMatchesDay = (diasRaw, dow) => {
  const dias = (diasRaw || '').toLowerCase()
  if (!dias) return true
  if (dias.includes('dom') && dow === 0) return true
  if (dias.includes('sab') && dow === 6) return true
  if (dias.includes('lun a dom')) return true
  if (dias.includes('finde') && isWeekend(dow)) return true
  if ((dias.includes('lun a vie') || dias.includes('lun-vie')) && isWeekday(dow)) return true
  if (dias.includes('lun a sab') && dow >= 1) return true
  if (dias.includes('feriado')) return false
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
  completada: { label: 'Completada', dot: 'bg-primitive-blue-500', text: 'text-primitive-blue-600' },
  cancelada: { label: 'Cancelada', dot: 'bg-slate-400', text: 'text-neutral-400' },
}

export const reservationLabel = (r) =>
  r.customer?.nombre || r.guestName || 'Sin nombre'

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
