<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import publicService from '@/services/publicService'
import { useAuth } from '@/composables/useAuth'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'
import { sportMeta, timeToMinutes } from '@/utils/turnos'
import BookingModal from '@/components/public/BookingModal.vue'

const route = useRoute()
const { isAuthenticated, user } = useAuth()

const slug = route.params.slug

const club = ref(null)
const courts = ref([])
const loading = ref(true)
const error = ref('')

// La fecha puede venir preseleccionada desde el buscador (?fecha=YYYY-MM-DD).
const queryFecha = route.query.fecha
const currentDate = ref(
  typeof queryFecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(queryFecha) && queryFecha >= dayjs().format('YYYY-MM-DD')
    ? queryFecha
    : dayjs().format('YYYY-MM-DD'),
)

// Disponibilidad de TODAS las canchas del club para la fecha (una fila por cancha).
const clubAvailability = ref(null)
const loadingSlots = ref(false)

// El turno seleccionado y a qué cancha pertenece (se elige clickeando un bloque).
const selectedCourtId = ref(null)
const selectedSlot = ref(null)

// Filtro por deporte (solo se muestra si el club tiene más de un tipo de cancha).
const selectedSport = ref('all')
const sportMenuOpen = ref(false)

const pickSport = (value) => {
  selectedSport.value = value
  sportMenuOpen.value = false
}

const WEEKDAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

// Granularidad del eje de tiempo del timeline (min por columna).
const AXIS_STEP = 30

const moneda = computed(() => club.value?.moneda || 'ARS')
const selectedCourt = computed(() => courts.value.find((c) => c._id === selectedCourtId.value) || null)

const formatDur = (min) => {
  if (!min) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}` : `${h}h`
}

const hoursLabel = computed(() => {
  const h = club.value?.horarios?.semanal
  if (!h) return ''
  const d = h[WEEKDAY_KEYS[dayjs().day()]]
  if (!d || d.abierto === false) return 'Cerrado hoy'
  return `${d.horaInicio} - ${d.horaFin}`
})

// Próximos 14 días como pills.
const dayPills = computed(() =>
  Array.from({ length: 14 }, (_, i) => {
    const d = dayjs().add(i, 'day')
    return {
      key: d.format('YYYY-MM-DD'),
      dow: i === 0 ? 'HOY' : d.format('ddd').toUpperCase(),
      day: d.format('DD'),
      month: d.format('MMM'),
    }
  }),
)

const selectedDateLabel = computed(() => {
  const isToday = currentDate.value === dayjs().format('YYYY-MM-DD')
  if (isToday) return `Hoy ${dayjs(currentDate.value).format('DD MMM')}`
  const l = dayjs(currentDate.value).format('ddd DD MMM')
  return l.charAt(0).toUpperCase() + l.slice(1)
})

// Deportes disponibles en el club (para el filtro del timeline).
const sports = computed(() => [...new Set(courts.value.map((c) => c.tipo))])

// Filas del timeline según el filtro de deporte activo.
const visibleRows = computed(() => {
  const rows = clubAvailability.value || []
  if (selectedSport.value === 'all') return rows
  return rows.filter((r) => r.court.tipo === selectedSport.value)
})

// ¿Alguna cancha (del filtro actual) abierta este día?
const anyOpen = computed(() => visibleRows.value.some((r) => r.abierto))

// Eje de tiempo del timeline: se calcula a partir del rango horario que cubren
// los turnos de las canchas abiertas visibles (redondeado a horas enteras).
const timeline = computed(() => {
  const rows = visibleRows.value
  if (!rows || !rows.length) return null

  let min = Infinity
  let max = -Infinity
  for (const r of rows) {
    if (!r.abierto) continue
    for (const s of r.slots) {
      const a = timeToMinutes(s.horaInicio)
      const b = timeToMinutes(s.horaFin)
      if (a < min) min = a
      if (b > max) max = b
    }
  }
  if (!Number.isFinite(min)) return null

  const startMin = Math.floor(min / 60) * 60
  const endMin = Math.ceil(max / 60) * 60
  const cols = (endMin - startMin) / AXIS_STEP

  const hours = []
  for (let h = startMin; h < endMin; h += 60) {
    hours.push({ label: String(h / 60).padStart(2, '0'), col: 2 + (h - startMin) / AXIS_STEP })
  }
  return { startMin, endMin, cols, hours }
})

const gridStyle = computed(() =>
  timeline.value
    ? { gridTemplateColumns: `132px repeat(${timeline.value.cols}, minmax(46px, 1fr))` }
    : {},
)

// Posición de un turno en el eje (columna de inicio + cantidad de columnas).
const slotStyle = (slot) => {
  const t = timeline.value
  if (!t) return {}
  const startMin = timeToMinutes(slot.horaInicio)
  const finMin = timeToMinutes(slot.horaFin)
  const startCol = 2 + (startMin - t.startMin) / AXIS_STEP
  const span = Math.max(1, (finMin - startMin) / AXIS_STEP)
  return { gridColumn: `${startCol} / span ${span}` }
}

const isSlotSelected = (court, slot) =>
  selectedCourtId.value === court._id && selectedSlot.value?.inicio === slot.inicio

const selectSlot = (court, slot) => {
  if (!slot.disponible) return
  selectedCourtId.value = court._id
  selectedSlot.value = slot
}

const fetchClub = async () => {
  loading.value = true
  error.value = ''
  try {
    const { club: c, courts: cs } = await publicService.getClub(slug)
    club.value = c
    courts.value = cs
  } catch (err) {
    console.error(err)
    error.value = err.response?.status === 404 ? 'Este club no existe o no está disponible.' : 'No se pudo cargar el club.'
  } finally {
    loading.value = false
  }
}

const fetchAvailability = async () => {
  selectedSlot.value = null
  selectedCourtId.value = null
  if (!courts.value.length) {
    clubAvailability.value = null
    return
  }
  loadingSlots.value = true
  try {
    const { courts: rows } = await publicService.getClubAvailability(slug, currentDate.value)
    clubAvailability.value = rows
  } catch (err) {
    console.error(err)
    clubAvailability.value = null
  } finally {
    loadingSlots.value = false
  }
}

// Al cambiar el filtro de deporte, si el turno elegido ya no se ve, se limpia.
watch(selectedSport, () => {
  if (selectedSport.value !== 'all' && selectedCourt.value?.tipo !== selectedSport.value) {
    selectedSlot.value = null
    selectedCourtId.value = null
  }
})

watch(currentDate, fetchAvailability)
onMounted(async () => {
  await fetchClub()
  if (courts.value.length) fetchAvailability()
})

// --- Booking modal ---
const bookingOpen = ref(false)
const prefill = computed(() => ({
  nombre: isAuthenticated.value ? user.value?.nombre || '' : '',
  email: isAuthenticated.value ? user.value?.email || '' : '',
}))

const openBooking = () => {
  if (selectedSlot.value) bookingOpen.value = true
}

const onConfirmed = () => fetchAvailability()
const onCloseModal = () => {
  bookingOpen.value = false
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="pi pi-spin pi-spinner text-3xl text-neutral-400"></i>
      <p class="mt-4 text-sm text-slate-500">Cargando club...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="pi pi-exclamation-triangle text-2xl text-neutral-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">{{ error }}</h3>
      <RouterLink :to="{ name: 'public-buscar' }" class="!mt-3 text-sm font-medium text-primitive-orange-500 no-underline">
        ← Volver a la búsqueda
      </RouterLink>
    </div>

    <div v-else class="space-y-5">
      <RouterLink :to="{ name: 'public-buscar' }" class="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 no-underline hover:text-slate-700">
        <i class="pi pi-arrow-left text-xs"></i> Volver a resultados
      </RouterLink>

      <!-- Club banner -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primitive-dark-500 to-primitive-blue-500 p-6 sm:p-8">
        <div class="absolute inset-6 rounded-lg border border-white/10">
          <div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/10"></div>
          <div class="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10"></div>
        </div>
        <div class="relative">
          <div v-if="courts.length" class="flex flex-wrap gap-1.5">
            <span v-for="d in [...new Set(courts.map((c) => c.tipo))]" :key="d" class="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
              <span class="h-1.5 w-1.5 rounded-full" :class="sportMeta(d).dot"></span>{{ sportMeta(d).label }}
            </span>
          </div>
          <h1 class="mt-3 text-3xl font-bold text-white">{{ club.nombre }}</h1>
          <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-white/80">
            <span v-if="club.direccion || club.ciudad" class="inline-flex items-center gap-1.5">
              <i class="pi pi-map-marker text-xs"></i>{{ [club.direccion, club.ciudad].filter(Boolean).join(', ') }}
            </span>
            <span v-if="hoursLabel" class="inline-flex items-center gap-1.5"><i class="pi pi-clock text-xs"></i>{{ hoursLabel }}</span>
            <span v-if="club.telefono" class="inline-flex items-center gap-1.5"><i class="pi pi-phone text-xs"></i>{{ club.telefono }}</span>
          </div>
        </div>
      </div>

      <!-- No courts -->
      <div v-if="!courts.length" class="rounded-2xl border border-slate-200 bg-white p-10 text-center">
        <p class="text-sm text-slate-500">Este club todavía no tiene canchas disponibles para reservar online.</p>
      </div>

      <!-- Two columns -->
      <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <!-- Left: día + timeline -->
        <div class="min-w-0 space-y-6">
          <!-- Step 1: día -->
          <div>
            <h2 class="mb-3 text-base font-semibold text-slate-900"><span class="text-slate-400">1 ·</span> Elegí el día</h2>
            <div class="flex gap-2 overflow-x-auto pb-1">
              <button
                v-for="d in dayPills"
                :key="d.key"
                class="flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5 transition-colors cursor-pointer"
                :class="currentDate === d.key ? 'border-primitive-dark-500 bg-primitive-dark-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                @click="currentDate = d.key"
              >
                <span class="text-[10px] font-semibold" :class="currentDate === d.key ? 'text-white/70' : 'text-neutral-400'">{{ d.dow }}</span>
                <span class="text-lg font-bold font-secondary leading-tight">{{ d.day }}</span>
                <span class="text-[10px]" :class="currentDate === d.key ? 'text-white/70' : 'text-neutral-400'">{{ d.month }}</span>
              </button>
            </div>
          </div>

          <!-- Step 2: turno (timeline) -->
          <div>
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-base font-semibold text-slate-900"><span class="text-slate-400">2 ·</span> Elegí tu turno</h2>
              <span class="text-xs text-neutral-400">{{ selectedDateLabel }}</span>
            </div>

            <!-- Filtro por deporte (solo con más de un deporte) -->
            <div v-if="sports.length > 1" class="relative mb-3 inline-block">
              <button
                type="button"
                class="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2 pl-2 pr-3 text-left transition-colors hover:bg-slate-50 cursor-pointer"
                @click="sportMenuOpen = !sportMenuOpen"
              >
                <span
                  class="flex h-8 w-8 items-center justify-center rounded-lg"
                  :class="selectedSport === 'all' ? 'bg-slate-100' : sportMeta(selectedSport).bg"
                >
                  <span
                    class="h-3 w-3 rounded-full"
                    :class="selectedSport === 'all' ? 'bg-gradient-to-br from-primitive-dark-500 to-primitive-blue-500' : sportMeta(selectedSport).dot"
                  ></span>
                </span>
                <span class="min-w-[64px]">
                  <span class="block text-[10px] leading-none text-neutral-400">Deporte</span>
                  <span class="block text-sm font-semibold leading-tight text-slate-800">
                    {{ selectedSport === 'all' ? 'Todos' : sportMeta(selectedSport).label }}
                  </span>
                </span>
                <i class="pi pi-chevron-down text-[10px] text-slate-400 transition-transform" :class="{ 'rotate-180': sportMenuOpen }"></i>
              </button>

              <!-- Menú -->
              <template v-if="sportMenuOpen">
                <div class="fixed inset-0 z-10" @click="sportMenuOpen = false"></div>
                <div class="absolute left-0 top-full z-20 mt-1.5 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  <button
                    type="button"
                    class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors cursor-pointer"
                    :class="selectedSport === 'all' ? 'bg-primitive-orange-50 text-primitive-orange-700' : 'text-slate-700 hover:bg-slate-50'"
                    @click="pickSport('all')"
                  >
                    <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100">
                      <span class="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-primitive-dark-500 to-primitive-blue-500"></span>
                    </span>
                    <span class="flex-1 font-medium">Todos los deportes</span>
                    <i v-if="selectedSport === 'all'" class="pi pi-check text-xs text-primitive-orange-500"></i>
                  </button>
                  <button
                    v-for="s in sports"
                    :key="s"
                    type="button"
                    class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors cursor-pointer"
                    :class="selectedSport === s ? 'bg-primitive-orange-50 text-primitive-orange-700' : 'text-slate-700 hover:bg-slate-50'"
                    @click="pickSport(s)"
                  >
                    <span class="flex h-7 w-7 items-center justify-center rounded-lg" :class="sportMeta(s).bg">
                      <span class="h-2.5 w-2.5 rounded-full" :class="sportMeta(s).dot"></span>
                    </span>
                    <span class="flex-1 font-medium">{{ sportMeta(s).label }}</span>
                    <i v-if="selectedSport === s" class="pi pi-check text-xs text-primitive-orange-500"></i>
                  </button>
                </div>
              </template>
            </div>

            <div v-if="loadingSlots" class="flex items-center justify-center py-16">
              <i class="pi pi-spin pi-spinner text-2xl text-neutral-400"></i>
            </div>

            <div v-else-if="!anyOpen" class="rounded-xl bg-slate-50 py-12 text-center text-sm text-slate-500">
              {{ selectedSport === 'all'
                ? 'El complejo está cerrado este día.'
                : `No hay canchas de ${sportMeta(selectedSport).label} disponibles este día.` }}
            </div>

            <div v-else class="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
              <div class="overflow-x-auto">
                <div class="min-w-[640px]">
                  <!-- Encabezado de horas -->
                  <div class="grid" :style="gridStyle">
                    <div></div>
                    <div
                      v-for="h in timeline.hours"
                      :key="h.label"
                      class="pb-1 text-[11px] font-medium text-neutral-400"
                      :style="{ gridColumn: `${h.col} / span 2` }"
                    >
                      {{ h.label }}
                    </div>
                  </div>

                  <!-- Una fila por cancha -->
                  <div
                    v-for="row in visibleRows"
                    :key="row.court._id"
                    class="grid items-center border-t border-slate-100"
                    :style="gridStyle"
                  >
                    <!-- Etiqueta de la cancha -->
                    <div class="py-2 pr-3" style="grid-column: 1">
                      <p class="truncate text-xs font-semibold text-slate-800">{{ row.court.nombre }}</p>
                      <p class="mt-0.5 flex items-center gap-1 text-[10px] text-neutral-400">
                        <span class="h-1.5 w-1.5 rounded-full" :class="sportMeta(row.court.tipo).dot"></span>
                        {{ formatDur(row.court.duracionTurno) }}
                      </p>
                    </div>

                    <!-- Líneas guía verticales por columna -->
                    <div
                      v-for="n in timeline.cols"
                      :key="'g' + n"
                      class="h-full border-l border-slate-50"
                      :style="{ gridColumn: n + 1, gridRow: 1 }"
                    ></div>

                    <!-- Cancha cerrada este día -->
                    <div
                      v-if="!row.abierto"
                      class="my-1 flex h-9 items-center justify-center rounded-md bg-slate-50 text-[11px] font-medium text-slate-400"
                      :style="{ gridColumn: `2 / span ${timeline.cols}`, gridRow: 1 }"
                    >
                      {{ row.nombre ? `Cerrado · ${row.nombre}` : 'Cerrado' }}
                    </div>

                    <!-- Turnos -->
                    <template v-else>
                      <button
                        v-for="slot in row.slots"
                        :key="slot.inicio"
                        :disabled="!slot.disponible"
                        :style="{ ...slotStyle(slot), gridRow: 1 }"
                        class="my-1 flex h-9 flex-col items-center justify-center rounded-md border px-1 text-center leading-none transition-colors"
                        :class="isSlotSelected(row.court, slot)
                          ? 'border-primitive-orange-500 bg-primitive-orange-500 text-white shadow-sm cursor-pointer'
                          : slot.disponible
                            ? 'border-slate-200 bg-white text-slate-700 hover:border-primitive-orange-400 hover:bg-primitive-orange-50 cursor-pointer'
                            : slot.motivo === 'reservado'
                              ? 'border-transparent bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'border-transparent bg-slate-50 text-slate-300 cursor-not-allowed'"
                        @click="selectSlot(row.court, slot)"
                      >
                        <template v-if="slot.disponible || isSlotSelected(row.court, slot)">
                          <span class="text-[11px] font-semibold">{{ slot.horaInicio }}</span>
                        </template>
                        <template v-else-if="slot.motivo === 'reservado'">
                          <i class="pi pi-lock text-[10px]"></i>
                        </template>
                      </button>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Legend -->
              <div class="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded border border-slate-200 bg-white"></span>Disponible</span>
                <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-primitive-orange-500"></span>Tu selección</span>
                <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-slate-200"></span>No disponible</span>
              </div>
            </div>
          </div>

          <!-- Servicios -->
          <div v-if="club.servicios && club.servicios.length">
            <h2 class="mb-3 text-base font-semibold text-slate-900">Servicios del complejo</h2>
            <div class="flex flex-wrap gap-2">
              <span v-for="s in club.servicios" :key="s" class="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                <i class="pi pi-check text-[10px] text-success-500"></i>{{ s }}
              </span>
            </div>
          </div>
        </div>

        <!-- Right: summary -->
        <div class="lg:sticky lg:top-20 lg:self-start">
          <div class="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 class="text-base font-semibold text-slate-900">Tu reserva</h3>
            <p class="text-xs text-neutral-400">{{ club.nombre }}</p>

            <div class="mt-4 space-y-2.5 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Cancha</span>
                <span class="font-medium text-slate-800">{{ selectedCourt?.nombre || '—' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Día</span>
                <span class="font-medium text-slate-800">{{ selectedDateLabel }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Horario</span>
                <span class="font-medium text-slate-800">{{ selectedSlot ? `${selectedSlot.horaInicio} - ${selectedSlot.horaFin}` : '—' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Duración</span>
                <span class="font-medium text-slate-800">{{ formatDur(selectedCourt?.duracionTurno) }}</span>
              </div>
            </div>

            <div class="my-4 border-t border-slate-100"></div>

            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Precio cancha</span>
                <span class="font-medium text-slate-800">{{ selectedSlot ? formatCurrency(selectedSlot.precio, moneda) : '—' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Cargo de servicio</span>
                <span class="font-medium text-slate-800">{{ formatCurrency(0, moneda) }}</span>
              </div>
            </div>

            <div class="my-4 border-t border-slate-100"></div>

            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-slate-700">Total</span>
              <span class="text-2xl font-bold font-secondary text-slate-900">{{ selectedSlot ? formatCurrency(selectedSlot.precio, moneda) : formatCurrency(0, moneda) }}</span>
            </div>

            <button
              class="mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-primitive-orange-500 text-sm font-semibold text-white transition-colors hover:bg-primitive-orange-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              :disabled="!selectedSlot"
              @click="openBooking"
            >
              Reservar ahora <i class="pi pi-arrow-right text-xs"></i>
            </button>
            <p class="mt-2 text-center text-[11px] text-neutral-400">Elegí el día y tocá un turno libre para continuar.</p>
          </div>
        </div>
      </div>
    </div>

    <BookingModal
      :visible="bookingOpen"
      :slug="slug"
      :club="club"
      :court="selectedCourt"
      :date="currentDate"
      :slot="selectedSlot"
      :moneda="moneda"
      :prefill="prefill"
      @close="onCloseModal"
      @confirmed="onConfirmed"
    />
  </div>
</template>
