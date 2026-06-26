import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/es'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.extend(localizedFormat)
dayjs.locale('es')

export const DEFAULT_TZ = 'America/Argentina/Buenos_Aires'

export { dayjs }

// Instante actual en UTC (para guardar en backend).
export const nowUtc = () => dayjs.utc()

// Convierte cualquier valor a ISO UTC para enviar al backend.
export const toUtcISO = (value) => dayjs(value).utc().toISOString()

// Formatea un instante UTC mostrándolo en la zona horaria del club.
export const formatInTz = (value, tz = DEFAULT_TZ, fmt = 'DD MMM YYYY HH:mm') => {
  if (!value) return ''
  return dayjs.utc(value).tz(tz).format(fmt)
}

// Formatea una fecha "de calendario" (sin hora) interpretada en UTC.
// Útil para feriados/días especiales que se guardan a medianoche UTC.
export const formatDateUTC = (value, fmt = 'DD MMM YYYY') => {
  if (!value) return ''
  return dayjs.utc(value).format(fmt)
}

// Formato YYYY-MM-DD (UTC) para <input type="date">.
export const toDateInputUTC = (value) => {
  if (!value) return ''
  return dayjs.utc(value).format('YYYY-MM-DD')
}

// Combina un día ("YYYY-MM-DD") y una hora ("HH:mm") interpretados en la zona
// del club y devuelve el instante en ISO UTC (para guardar en backend).
export const zonedToUtcISO = (dateKey, hhmm, tz = DEFAULT_TZ) =>
  dayjs.tz(`${dateKey} ${hhmm}`, 'YYYY-MM-DD HH:mm', tz).utc().toISOString()

export const formatCurrency = (amount, moneda = 'ARS', locale = 'es-AR') => {
  const value = Number(amount) || 0
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${moneda} ${value.toLocaleString(locale)}`
  }
}
