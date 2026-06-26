<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <!-- Date nav -->
        <div class="flex items-center rounded-lg border border-slate-200 bg-white">
          <button
            class="flex h-9 w-9 items-center justify-center rounded-l-lg text-slate-500 transition-colors hover:bg-slate-50 cursor-pointer"
            @click="shiftDate(-1)"
          >
            <i class="pi pi-chevron-left text-xs"></i>
          </button>
          <span class="min-w-[180px] px-3 text-center text-sm font-semibold text-slate-900">
            {{ dateLabel }}
          </span>
          <button
            class="flex h-9 w-9 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:bg-slate-50 cursor-pointer"
            @click="shiftDate(1)"
          >
            <i class="pi pi-chevron-right text-xs"></i>
          </button>
        </div>

        <button
          class="h-9 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
          @click="goToday"
        >
          Hoy
        </button>

        <!-- Day / Week toggle -->
        <div class="flex overflow-hidden rounded-lg border border-slate-200">
          <button
            v-for="opt in viewOptions"
            :key="opt.value"
            class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
            :class="viewMode === opt.value ? 'bg-primitive-dark-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
            @click="setViewMode(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Court filter -->
        <div class="relative" @click.stop>
          <button
            class="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
            @click="courtMenuOpen = !courtMenuOpen"
          >
            <i class="pi pi-filter text-xs text-neutral-400"></i>
            {{ selectedCourt ? selectedCourt.nombre : 'Todas las canchas' }}
            <i class="pi pi-chevron-down text-[10px] text-neutral-400"></i>
          </button>
          <div
            v-if="courtMenuOpen"
            class="absolute left-0 top-full z-30 mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            <button
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
              :class="!selectedCourtId ? 'text-primitive-orange-600' : 'text-slate-700'"
              :disabled="viewMode === 'week'"
              @click="selectCourt(null)"
            >
              <span class="flex-1">Todas las canchas</span>
              <i v-if="!selectedCourtId" class="pi pi-check text-xs text-primitive-orange-500"></i>
            </button>
            <button
              v-for="c in courts"
              :key="c._id"
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-slate-50 cursor-pointer"
              :class="selectedCourtId === c._id ? 'text-primitive-orange-600' : 'text-slate-700'"
              @click="selectCourt(c._id)"
            >
              <span class="h-2 w-2 shrink-0 rounded-sm" :class="sportMeta(c.tipo).bgStrong" />
              <span class="flex-1 truncate">{{ c.nombre }}</span>
              <i v-if="selectedCourtId === c._id" class="pi pi-check text-xs text-primitive-orange-500"></i>
            </button>
          </div>
        </div>

        <!-- Sport legend / filter -->
        <div class="flex items-center gap-1.5">
          <button
            v-for="s in sportChips"
            :key="s.value"
            class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            :class="sportFilter === s.value
              ? 'border-slate-300 bg-slate-100 text-slate-900'
              : 'border-transparent text-slate-500 hover:bg-slate-50'"
            @click="toggleSport(s.value)"
          >
            <span v-if="s.dot" class="h-2 w-2 rounded-full" :class="s.dot" />
            {{ s.label }}
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Exportar a CSV"
          :disabled="!calendarItems.length"
          @click="exportCsv"
        >
          <i class="pi pi-download text-sm"></i>
        </button>
        <Button label="Nuevo turno" size="small" @click="openNew" />
      </div>
    </div>

    <!-- Summary strip -->
    <div v-if="currentClubId && courts.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs text-neutral-400">Turnos {{ viewMode === 'day' ? 'del día' : 'de la semana' }}</p>
        <p class="mt-0.5 text-xl font-bold font-secondary text-slate-900">{{ stats.total }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs text-neutral-400">Confirmados</p>
        <p class="mt-0.5 text-xl font-bold font-secondary text-success-600">{{ stats.confirmados }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs text-neutral-400">Pendientes</p>
        <p class="mt-0.5 text-xl font-bold font-secondary text-warning-600">{{ stats.pendientes }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs text-neutral-400">Ingresos estimados</p>
        <p class="mt-0.5 text-xl font-bold font-secondary text-slate-900">{{ formatCurrency(stats.ingresos, currency) }}</p>
      </div>
    </div>

    <!-- States -->
    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="pi pi-building text-2xl text-neutral-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">Sin club seleccionado</h3>
      <p class="!mt-2 text-sm text-slate-500">Seleccioná un club desde el encabezado para ver los turnos.</p>
    </div>

    <div v-else-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="pi pi-spin pi-spinner text-3xl text-neutral-400"></i>
      <p class="mt-4 text-sm text-slate-500">Cargando turnos...</p>
    </div>

    <div v-else-if="courts.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="pi pi-objects-column text-2xl text-neutral-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">No hay canchas</h3>
      <p class="!mt-2 text-sm text-slate-500">Creá canchas para empezar a cargar turnos.</p>
    </div>

    <div v-else-if="columns.length === 0" class="flex flex-col items-center justify-center py-24 text-center">
      <p class="text-sm text-slate-500">No hay canchas que coincidan con el filtro.</p>
    </div>

    <!-- Calendar -->
    <ReservationCalendar
      v-else
      :mode="viewMode"
      :columns="columns"
      :reservations="calendarItems"
      :day-start-min="dayStartMin"
      :day-end-min="dayEndMin"
      :now-min="nowMinOfDay"
      :today-key="todayStr"
      :view-date-key="viewMode === 'day' ? currentDate : null"
      :open-ranges="openRanges"
      :currency="currency"
      @create="onCreate"
      @edit="onEdit"
      @move="onMove"
    />

    <!-- Drawer -->
    <ReservationDrawer
      :visible="drawerOpen"
      :reservation="drawerReservation"
      :courts="courts"
      :currency="currency"
      :horarios="horarios"
      :timezone="tz"
      :saving="saving"
      :cancelling="cancelling"
      :server-error="saveError"
      @close="drawerOpen = false"
      @save="handleSave"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import ReservationCalendar from '@/components/turnos/ReservationCalendar.vue'
import ReservationDrawer from '@/components/turnos/ReservationDrawer.vue'
import courtService from '@/services/courtService'
import scheduleService from '@/services/scheduleService'
import reservationService from '@/services/reservationService'
import { useAuth } from '@/composables/useAuth'
import { dayjs, formatCurrency, DEFAULT_TZ, zonedToUtcISO } from '@/utils/datetime'
import {
  sportMeta,
  minutesToTime,
  openRangeForDate,
} from '@/utils/turnos'

const { currentClubId, currentClub } = useAuth()
const toast = useToast()

const courts = ref([])
const horarios = ref(null)
const reservations = ref([])
const loading = ref(false)

const viewMode = ref('day')
const currentDate = ref(dayjs().format('YYYY-MM-DD'))
const selectedCourtId = ref(null)
const sportFilter = ref('todas')
const courtMenuOpen = ref(false)

const viewOptions = [
  { label: 'Día', value: 'day' },
  { label: 'Semana', value: 'week' },
]

const sportChips = [
  { label: 'Todas', value: 'todas', dot: null },
  { label: 'Pádel', value: 'padel', dot: 'bg-primitive-blue-500' },
  { label: 'Tenis', value: 'tenis', dot: 'bg-primitive-orange-500' },
  { label: 'Fútbol', value: 'futbol', dot: 'bg-success-500' },
]

const tz = computed(() => currentClub.value?.timezone || DEFAULT_TZ)
const currency = computed(() => currentClub.value?.moneda || 'ARS')
const selectedCourt = computed(() => courts.value.find((c) => c._id === selectedCourtId.value) || null)

// --- Rango horario del calendario ---
// El calendario siempre muestra las 24hs; las horas fuera del horario de
// atención se sombrean por columna (ver `openRanges`).
const dayStartMin = 0
const dayEndMin = 24 * 60

// --- Días visibles ---
const weekStart = computed(() => dayjs(currentDate.value).startOf('week'))

const visibleDays = computed(() => {
  if (viewMode.value === 'day') return [currentDate.value]
  return Array.from({ length: 7 }, (_, i) => weekStart.value.add(i, 'day').format('YYYY-MM-DD'))
})

const dateLabel = computed(() => {
  if (viewMode.value === 'day') {
    const l = dayjs(currentDate.value).format('ddd DD [de] MMMM, YYYY')
    return l.charAt(0).toUpperCase() + l.slice(1)
  }
  const start = weekStart.value
  const end = start.add(6, 'day')
  return `${start.format('DD MMM')} – ${end.format('DD MMM')}`
})

// --- Columnas ---
const filteredCourts = computed(() => {
  let list = courts.value.filter((c) => c.estado === 'activa')
  if (selectedCourtId.value) return list.filter((c) => c._id === selectedCourtId.value)
  if (sportFilter.value !== 'todas') list = list.filter((c) => c.tipo === sportFilter.value)
  return list
})

const columns = computed(() => {
  if (viewMode.value === 'day') {
    return filteredCourts.value.map((c) => ({
      key: c._id,
      label: c.nombre,
      sublabel: [c.superficie, c.cubierta ? 'Cubierta' : 'Descubierta'].filter(Boolean).join(' · '),
      tipo: c.tipo,
    }))
  }
  // Semana: columnas por día, una sola cancha.
  return visibleDays.value.map((d) => {
    const label = dayjs(d).format('ddd DD')
    return {
      key: d,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      sublabel: dayjs(d).format('MMMM'),
      tipo: selectedCourt.value?.tipo,
    }
  })
})

// Rango abierto por columna (para sombrear las horas cerradas).
// En vista diaria todas las columnas comparten la fecha actual; en semanal
// cada columna es un día distinto.
const openRanges = computed(() => {
  const map = {}
  for (const col of columns.value) {
    const dateKey = viewMode.value === 'day' ? currentDate.value : col.key
    map[col.key] = openRangeForDate(horarios.value, dateKey)
  }
  return map
})

// --- Reservas enriquecidas para el calendario ---
const courtsById = computed(() => Object.fromEntries(courts.value.map((c) => [c._id, c])))

const calendarItems = computed(() => {
  return reservations.value
    .map((r) => {
      const courtId = r.court?._id || r.court
      const court = courtsById.value[courtId]
      // Instantes UTC convertidos a la zona horaria del club.
      const start = dayjs.utc(r.inicio).tz(tz.value)
      const end = dayjs.utc(r.fin).tz(tz.value)
      const dayKey = start.format('YYYY-MM-DD')
      const startMin = start.hour() * 60 + start.minute()
      const columnKey = viewMode.value === 'day' ? courtId : dayKey
      return {
        ...r,
        columnKey,
        _fechaKey: dayKey,
        startMin,
        endMin: startMin + end.diff(start, 'minute'),
        tipo: court?.tipo,
      }
    })
    .filter((r) => columns.value.some((c) => c.key === r.columnKey))
})

// --- Indicador de hora actual ---
const nowTick = ref(dayjs())
let nowInterval = null

const todayStr = computed(() => {
  nowTick.value
  return dayjs().tz(tz.value).format('YYYY-MM-DD')
})

// Minuto del día actual en la tz del club (siempre disponible para derivar
// pasado / en curso y posicionar la línea de hora).
const nowMinOfDay = computed(() => {
  nowTick.value
  const n = dayjs().tz(tz.value)
  return n.hour() * 60 + n.minute()
})

// --- Stats ---
const stats = computed(() => {
  const items = calendarItems.value.filter((r) => r.estado !== 'cancelada')
  return {
    total: items.length,
    confirmados: items.filter((r) => r.estado === 'confirmada' || r.estado === 'completada').length,
    pendientes: items.filter((r) => r.estado === 'pendiente').length,
    ingresos: items.reduce((sum, r) => sum + (r.precioFinal || 0), 0),
  }
})

// --- Carga de datos ---
const fetchCourtsAndHorarios = async () => {
  if (!currentClubId.value) return
  try {
    const [c, h] = await Promise.all([
      courtService.getCourts(currentClubId.value),
      scheduleService.getHorarios(currentClubId.value).catch(() => null),
    ])
    courts.value = c
    horarios.value = h
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las canchas.', life: 4000 })
  }
}

const fetchReservations = async () => {
  if (!currentClubId.value || courts.value.length === 0) {
    reservations.value = []
    return
  }
  loading.value = true
  try {
    const courtId = viewMode.value === 'week' ? selectedCourtId.value : undefined
    // Ventana visible como rango de instantes UTC (desde el inicio del primer
    // día hasta el inicio del día siguiente al último), en la tz del club.
    const days = visibleDays.value
    const desde = zonedToUtcISO(days[0], '00:00', tz.value)
    const hasta = dayjs
      .tz(`${days[days.length - 1]} 00:00`, 'YYYY-MM-DD HH:mm', tz.value)
      .add(1, 'day')
      .utc()
      .toISOString()
    reservations.value = await reservationService.getReservations(currentClubId.value, {
      desde,
      hasta,
      courtId,
    })
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los turnos.', life: 4000 })
  } finally {
    loading.value = false
  }
}

const reload = async () => {
  await fetchCourtsAndHorarios()
  await fetchReservations()
}

onMounted(() => {
  reload()
  nowInterval = setInterval(() => (nowTick.value = dayjs()), 60 * 1000)
  document.addEventListener('click', closeCourtMenu)
})

onUnmounted(() => {
  if (nowInterval) clearInterval(nowInterval)
  document.removeEventListener('click', closeCourtMenu)
})

const closeCourtMenu = () => {
  courtMenuOpen.value = false
}

watch(currentClubId, (id) => {
  if (id) reload()
  else {
    courts.value = []
    reservations.value = []
  }
})

watch([currentDate, viewMode, selectedCourtId], () => fetchReservations())

// --- Navegación ---
const shiftDate = (dir) => {
  const unit = viewMode.value === 'day' ? 'day' : 'week'
  currentDate.value = dayjs(currentDate.value).add(dir, unit).format('YYYY-MM-DD')
}

const goToday = () => {
  currentDate.value = dayjs().format('YYYY-MM-DD')
}

const setViewMode = (mode) => {
  if (mode === 'week' && !selectedCourtId.value) {
    // La vista semanal necesita una cancha concreta.
    selectedCourtId.value = filteredCourts.value[0]?._id || courts.value[0]?._id || null
  }
  viewMode.value = mode
}

const selectCourt = (id) => {
  if (id === null && viewMode.value === 'week') return
  selectedCourtId.value = id
  courtMenuOpen.value = false
}

const toggleSport = (value) => {
  sportFilter.value = value
}

// --- Drawer ---
const drawerOpen = ref(false)
const drawerReservation = ref(null)
const saving = ref(false)
const cancelling = ref(false)
// Error del backend a mostrar dentro del drawer.
const saveError = ref('')

const openDrawer = (reservation) => {
  saveError.value = ''
  drawerReservation.value = reservation
  drawerOpen.value = true
}

const openNew = () => {
  openDrawer({
    courtId: selectedCourtId.value || filteredCourts.value[0]?._id || courts.value[0]?._id || '',
    fecha: currentDate.value,
  })
}

const onCreate = ({ columnKey, startMin }) => {
  const courtId = viewMode.value === 'day' ? columnKey : selectedCourtId.value
  const fecha = viewMode.value === 'day' ? currentDate.value : columnKey
  // El backend valida el horario al guardar.
  openDrawer({ courtId, fecha, horaInicio: minutesToTime(startMin) })
}

const onEdit = (r) => {
  openDrawer(r)
}

const onMove = async ({ reservation, columnKey, startMin }) => {
  const dur = reservation.endMin - reservation.startMin
  const courtId = viewMode.value === 'day' ? columnKey : selectedCourtId.value
  const fecha = viewMode.value === 'day' ? currentDate.value : columnKey

  // Nuevo inicio/fin como instantes UTC, calculados en la tz del club.
  const startDj = dayjs.tz(`${fecha} ${minutesToTime(startMin)}`, 'YYYY-MM-DD HH:mm', tz.value)
  const inicio = startDj.utc().toISOString()
  const fin = startDj.add(dur, 'minute').utc().toISOString()

  // El backend valida las reglas; acá actualizamos optimista y revertimos si rechaza.
  const idx = reservations.value.findIndex((r) => r._id === reservation._id)
  const prev = idx !== -1 ? { ...reservations.value[idx] } : null
  if (idx !== -1) {
    reservations.value[idx] = {
      ...reservations.value[idx],
      inicio,
      fin,
      court: courtsById.value[courtId] || reservations.value[idx].court,
    }
  }

  try {
    await reservationService.updateReservation(currentClubId.value, reservation._id, { courtId, inicio, fin })
    toast.add({
      severity: 'success',
      summary: 'Turno movido',
      detail: `${reservation.guestName || 'Turno'} → ${minutesToTime(startMin)}`,
      life: 2500,
    })
    await fetchReservations()
  } catch (err) {
    if (prev && idx !== -1) reservations.value[idx] = prev
    const detail = err.response?.data?.message || 'No se pudo mover el turno.'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 })
  }
}

const handleSave = async (payload) => {
  if (!currentClubId.value) return
  saving.value = true
  saveError.value = ''
  const editing = !!payload._id
  try {
    if (editing) {
      await reservationService.updateReservation(currentClubId.value, payload._id, payload)
    } else {
      await reservationService.createReservation(currentClubId.value, payload)
    }
    drawerOpen.value = false
    await fetchReservations()
    const ini = dayjs.utc(payload.inicio).tz(tz.value).format('HH:mm')
    const f = dayjs.utc(payload.fin).tz(tz.value).format('HH:mm')
    toast.add({
      severity: 'success',
      summary: editing ? 'Turno actualizado' : 'Turno creado',
      detail: `${payload.guestName} · ${ini}–${f}`,
      life: 3000,
    })
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudo guardar el turno.'
    // El backend es la fuente de verdad de la validación: mostramos su mensaje.
    saveError.value = detail
    toast.add({ severity: 'error', summary: 'Error al guardar', detail, life: 5000 })
  } finally {
    saving.value = false
  }
}

const handleCancel = async (id) => {
  if (!currentClubId.value) return
  cancelling.value = true
  try {
    await reservationService.cancelReservation(currentClubId.value, id)
    drawerOpen.value = false
    await fetchReservations()
    toast.add({ severity: 'success', summary: 'Turno cancelado', detail: 'La reserva fue cancelada.', life: 3000 })
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudo cancelar el turno.'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    cancelling.value = false
  }
}

// --- Exportar CSV ---
const exportCsv = () => {
  const rows = [['Fecha', 'Cancha', 'Cliente', 'Telefono', 'Desde', 'Hasta', 'Estado', 'Precio']]
  for (const r of calendarItems.value) {
    const court = courtsById.value[r.court?._id || r.court]
    const start = dayjs.utc(r.inicio).tz(tz.value)
    const end = dayjs.utc(r.fin).tz(tz.value)
    rows.push([
      start.format('YYYY-MM-DD'),
      court?.nombre || '',
      r.customer?.nombre || r.guestName || '',
      r.guestPhone || '',
      start.format('HH:mm'),
      end.format('HH:mm'),
      r.estado,
      r.precioFinal ?? '',
    ])
  }
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `turnos-${viewMode.value === 'day' ? currentDate.value : weekStart.value.format('YYYY-MM-DD')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
