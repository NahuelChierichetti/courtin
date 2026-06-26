<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import publicService from '@/services/publicService'
import { useAuth } from '@/composables/useAuth'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'
import { sportMeta } from '@/utils/turnos'
import BookingModal from '@/components/public/BookingModal.vue'

const route = useRoute()
const { isAuthenticated, user } = useAuth()

const slug = route.params.slug

const club = ref(null)
const courts = ref([])
const loading = ref(true)
const error = ref('')

const selectedCourtId = ref(null)
// La fecha puede venir preseleccionada desde el buscador (?fecha=YYYY-MM-DD).
const queryFecha = route.query.fecha
const currentDate = ref(
  typeof queryFecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(queryFecha) && queryFecha >= dayjs().format('YYYY-MM-DD')
    ? queryFecha
    : dayjs().format('YYYY-MM-DD'),
)
const selectedDuration = ref(null)
const selectedSlot = ref(null)

const availability = ref(null)
const loadingSlots = ref(false)

const WEEKDAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

const tz = computed(() => club.value?.timezone || DEFAULT_TZ)
const moneda = computed(() => club.value?.moneda || 'ARS')
const selectedCourt = computed(() => courts.value.find((c) => c._id === selectedCourtId.value) || null)

const courtPrice = (c) => {
  const tarifas = c.tarifas || []
  const min = tarifas.reduce((m, t) => (typeof t.precio === 'number' ? Math.min(m, t.precio) : m), Infinity)
  return Number.isFinite(min) ? min : c.precio || 0
}

// Opciones de duración: las comunes + la duración típica de la cancha.
const durationOptions = computed(() => {
  const base = selectedCourt.value?.duracionTurno || 60
  return [...new Set([60, 90, 120, base])].sort((a, b) => a - b)
})

const formatDur = (min) => {
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

// Slots a mostrar: dentro de horario, sin los pasados / fuera de anticipación.
const visibleSlots = computed(() =>
  (availability.value?.slots || []).filter((s) => s.motivo !== 'pasado' && s.motivo !== 'fuera_de_anticipacion'),
)

const fetchClub = async () => {
  loading.value = true
  error.value = ''
  try {
    const { club: c, courts: cs } = await publicService.getClub(slug)
    club.value = c
    courts.value = cs
    selectedCourtId.value = cs[0]?._id || null
  } catch (err) {
    console.error(err)
    error.value = err.response?.status === 404 ? 'Este club no existe o no está disponible.' : 'No se pudo cargar el club.'
  } finally {
    loading.value = false
  }
}

const fetchAvailability = async () => {
  selectedSlot.value = null
  if (!selectedCourtId.value) {
    availability.value = null
    return
  }
  loadingSlots.value = true
  try {
    availability.value = await publicService.getAvailability(
      slug,
      selectedCourtId.value,
      currentDate.value,
      selectedDuration.value || undefined,
    )
  } catch (err) {
    console.error(err)
    availability.value = null
  } finally {
    loadingSlots.value = false
  }
}

const selectSlot = (slot) => {
  if (!slot.disponible) return
  selectedSlot.value = slot
}

const isSlotSelected = (slot) => selectedSlot.value?.inicio === slot.inicio

// Al cambiar de cancha, la duración vuelve a la típica de esa cancha.
watch(selectedCourtId, () => {
  selectedDuration.value = selectedCourt.value?.duracionTurno || 60
})
watch([selectedCourtId, currentDate, selectedDuration], fetchAvailability)
onMounted(fetchClub)

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
  selectedSlot.value = null
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
      <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        <!-- Left: steps -->
        <div class="space-y-6">
          <!-- Step 1: cancha -->
          <div>
            <h2 class="mb-3 text-base font-semibold text-slate-900"><span class="text-slate-400">1 ·</span> Elegí la cancha</h2>
            <div class="space-y-2">
              <button
                v-for="c in courts"
                :key="c._id"
                class="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer"
                :class="selectedCourtId === c._id ? 'border-primitive-orange-400 bg-primitive-orange-50' : 'border-slate-200 bg-white hover:bg-slate-50'"
                @click="selectedCourtId = c._id"
              >
                <div class="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primitive-dark-500 to-primitive-blue-500">
                  <div class="absolute inset-1.5 rounded border border-white/20"></div>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-slate-900">{{ c.nombre }}</p>
                  <div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span class="inline-flex items-center gap-1"><span class="h-1.5 w-1.5 rounded-full" :class="sportMeta(c.tipo).dot"></span>{{ sportMeta(c.tipo).label }}</span>
                    <span v-if="c.superficie">· {{ c.superficie }}</span>
                    <span>· {{ c.cubierta ? 'Cubierta' : 'Descubierta' }}</span>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold font-secondary text-slate-900">{{ formatCurrency(courtPrice(c), moneda) }}</p>
                  <p class="text-[10px] text-neutral-400">/hora</p>
                </div>
                <span class="flex h-5 w-5 items-center justify-center rounded-full border-2" :class="selectedCourtId === c._id ? 'border-primitive-orange-500' : 'border-slate-300'">
                  <span v-if="selectedCourtId === c._id" class="h-2.5 w-2.5 rounded-full bg-primitive-orange-500"></span>
                </span>
              </button>
            </div>
          </div>

          <!-- Step 2: día -->
          <div>
            <h2 class="mb-3 text-base font-semibold text-slate-900"><span class="text-slate-400">2 ·</span> Elegí el día</h2>
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

          <!-- Step 3: horario -->
          <div>
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-base font-semibold text-slate-900"><span class="text-slate-400">3 ·</span> Elegí el horario</h2>
              <div class="flex items-center gap-2">
                <span class="text-xs text-neutral-400">Duración</span>
                <div class="flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5">
                  <button
                    v-for="d in durationOptions"
                    :key="d"
                    class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer"
                    :class="selectedDuration === d ? 'bg-primitive-dark-500 text-white' : 'text-slate-600 hover:bg-slate-50'"
                    @click="selectedDuration = d"
                  >
                    {{ formatDur(d) }}
                  </button>
                </div>
              </div>
            </div>

            <div v-if="loadingSlots" class="flex items-center justify-center py-12">
              <i class="pi pi-spin pi-spinner text-2xl text-neutral-400"></i>
            </div>
            <div v-else-if="!availability || !availability.abierto" class="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">
              {{ availability && availability.nombre ? `Cerrado (${availability.nombre})` : 'El complejo está cerrado este día.' }}
            </div>
            <div v-else-if="!visibleSlots.length" class="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-500">
              No quedan horarios disponibles para esta fecha.
            </div>
            <div v-else>
              <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                <button
                  v-for="slot in visibleSlots"
                  :key="slot.inicio"
                  :disabled="!slot.disponible"
                  class="rounded-lg border py-2 text-sm font-medium transition-colors"
                  :class="isSlotSelected(slot)
                    ? 'border-primitive-orange-500 bg-primitive-orange-500 text-white'
                    : slot.disponible
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-primitive-orange-400 cursor-pointer'
                      : 'border-transparent bg-slate-100 text-slate-300 line-through cursor-not-allowed'"
                  @click="selectSlot(slot)"
                >
                  {{ slot.horaInicio }}
                </button>
              </div>
              <!-- Legend -->
              <div class="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded border border-slate-200 bg-white"></span>Disponible</span>
                <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-primitive-orange-500"></span>Seleccionado</span>
                <span class="inline-flex items-center gap-1.5"><span class="h-3 w-3 rounded bg-slate-100"></span>Ocupado</span>
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
                <span class="font-medium text-slate-800">{{ selectedDuration ? formatDur(selectedDuration) : '—' }}</span>
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
            <p class="mt-2 text-center text-[11px] text-neutral-400">Elegí cancha, día y horario para continuar.</p>
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
