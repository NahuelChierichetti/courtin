<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import publicService from '@/services/publicService'
import { useAuth } from '@/composables/useAuth'
import { dayjs, formatCurrency } from '@/utils/datetime'
import { sportMeta, suggestedPrice } from '@/utils/turnos'
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

const clubAvailability = ref(null)
const loadingSlots = ref(false)

const selectedCourtId = ref(null)
const selectedSlot = ref(null)

const showAllServices = ref(false)

const WEEKDAY_KEYS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

const moneda = computed(() => club.value?.moneda || 'ARS')

const primarySport = computed(() => courts.value[0]?.tipo || null)
const sports = computed(() => [...new Set(courts.value.map((c) => c.tipo))])
const superficies = computed(() => [...new Set(courts.value.map((c) => c.superficie).filter(Boolean))])
const indoorCount = computed(() => courts.value.filter((c) => c.cubierta).length)
const outdoorCount = computed(() => courts.value.filter((c) => !c.cubierta).length)

// --- Horario del club para hoy (estado abierto / cierre) ---
const todayConfig = computed(() => {
  const sem = club.value?.horarios?.semanal
  if (!sem) return null
  return sem[WEEKDAY_KEYS[dayjs().day()]] || null
})
const isOpenNow = computed(() => {
  const d = todayConfig.value
  if (!d || d.abierto === false) return false
  const now = dayjs().format('HH:mm')
  return now >= d.horaInicio && now <= d.horaFin
})

// --- Galería ---
const gallery = computed(() => club.value?.fotos || [])
const mainPhoto = computed(() => gallery.value[0] || null)
const thumbs = computed(() => gallery.value.slice(1, 5))
const extraCount = computed(() => Math.max(0, gallery.value.length - 5))

// --- Instalaciones (servicios) ---
const SERVICE_ICONS = {
  wifi: 'icon-[material-symbols--wifi]',
  camaras: 'icon-[material-symbols--videocam]',
  seguridad: 'icon-[material-symbols--videocam]',
  estacionamiento: 'icon-[material-symbols--directions-car]',
  vestuarios: 'icon-[material-symbols--group]',
  vestuario: 'icon-[material-symbols--group]',
  iluminacion: 'icon-[material-symbols--lightbulb]',
  buffet: 'icon-[material-symbols--shopping-bag]',
  bar: 'icon-[material-symbols--shopping-bag]',
  cafeteria: 'icon-[material-symbols--shopping-bag]',
  duchas: 'icon-[material-symbols--group]',
}
const serviceIcon = (s) => {
  const key = (s || '').toLowerCase()
  const match = Object.keys(SERVICE_ICONS).find((k) => key.includes(k))
  return match ? SERVICE_ICONS[match] : 'icon-[material-symbols--check-circle]'
}
const visibleServices = computed(() => {
  const list = club.value?.servicios || []
  return showAllServices.value ? list : list.slice(0, 6)
})

// --- Reserva (panel derecho, estilo chips) ---
const selectedRow = computed(() =>
  (clubAvailability.value || []).find((r) => r.court._id === selectedCourtId.value) || null,
)
const selectedCourt = computed(() => selectedRow.value?.court || null)
const availableSlots = computed(() => (selectedRow.value?.abierto ? selectedRow.value.slots : []))
const turnosLibres = computed(() => availableSlots.value.filter((s) => s.disponible).length)
const turnosTotal = computed(() => availableSlots.value.length)

const perHour = computed(() => {
  const court = selectedCourt.value
  if (!court) return null
  const hora = selectedSlot.value?.horaInicio || availableSlots.value.find((s) => s.disponible)?.horaInicio || '12:00'
  return suggestedPrice(court, dayjs(currentDate.value).day(), hora)
})

const formatDur = (min) => {
  if (!min) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}` : `${h}h`
}

const dayPills = computed(() =>
  Array.from({ length: 10 }, (_, i) => {
    const d = dayjs().add(i, 'day')
    return {
      key: d.format('YYYY-MM-DD'),
      dow: i === 0 ? 'HOY' : d.format('ddd').toUpperCase(),
      day: d.format('DD'),
    }
  }),
)

const selectCourt = (id) => {
  selectedCourtId.value = id
  selectedSlot.value = null
}
const selectSlot = (slot) => {
  if (!slot.disponible) return
  selectedSlot.value = slot
}
const isSlotSelected = (slot) => selectedSlot.value?.inicio === slot.inicio

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
  if (!courts.value.length) {
    clubAvailability.value = null
    return
  }
  loadingSlots.value = true
  try {
    const { courts: rows } = await publicService.getClubAvailability(slug, currentDate.value)
    clubAvailability.value = rows
    // Selección por defecto: primera cancha abierta, o la primera.
    const preferred = rows.find((r) => r.court._id === selectedCourtId.value)
    if (!preferred) {
      selectedCourtId.value = (rows.find((r) => r.abierto) || rows[0])?.court._id || null
    }
  } catch (err) {
    console.error(err)
    clubAvailability.value = null
  } finally {
    loadingSlots.value = false
  }
}

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
  <div class="mx-auto w-full max-w-7xl px-4 py-8">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-slate-300"></i>
      <p class="mt-4 text-sm text-slate-500">Cargando complejo...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
        <i class="icon-[material-symbols--warning] text-2xl text-slate-300"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-primitive-dark-500">{{ error }}</h3>
      <RouterLink :to="{ name: 'public-buscar' }" class="mt-3 text-sm font-semibold text-primitive-orange-500 no-underline">
        ← Volver a la búsqueda
      </RouterLink>
    </div>

    <div v-else class="space-y-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm text-slate-400">
        <RouterLink :to="{ name: 'public-home' }" class="no-underline text-slate-400 hover:text-slate-600">Inicio</RouterLink>
        <span>/</span>
        <RouterLink
          :to="{ name: 'public-buscar', query: primarySport ? { tipo: primarySport } : {} }"
          class="no-underline text-slate-400 hover:text-slate-600"
        >
          {{ primarySport ? sportMeta(primarySport).label : 'Complejos' }}
        </RouterLink>
        <span>/</span>
        <span class="font-medium text-primitive-dark-500">{{ club.nombre }}</span>
      </nav>

      <!-- Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-primitive-dark-500 sm:text-4xl">{{ club.nombre }}</h1>
          <div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-500">
            <span v-if="club.direccion || club.ciudad" class="inline-flex items-center gap-1.5">
              <i class="icon-[material-symbols--location-on] text-xs"></i>{{ [club.direccion, club.ciudad].filter(Boolean).join(', ') }}
            </span>
            <span v-if="todayConfig && todayConfig.abierto !== false" class="inline-flex items-center gap-1.5">
              <i class="icon-[material-symbols--schedule] text-xs"></i>
              <span :class="isOpenNow ? 'font-semibold text-success-600' : 'text-slate-500'">
                {{ isOpenNow ? 'Abierto' : 'Cerrado' }}
              </span>
              · Cierra {{ todayConfig.horaFin }}
            </span>
          </div>
        </div>
        <div v-if="club.rating" class="text-right">
          <p class="flex items-center justify-end gap-1.5 text-2xl font-bold text-success-600">
            <i class="icon-[material-symbols--star] text-lg"></i>{{ Number(club.rating).toFixed(2) }}
          </p>
          <p v-if="club.reseñas" class="text-sm text-slate-400">{{ club.reseñas }} reseñas</p>
        </div>
      </div>

      <!-- Galería -->
      <div>
        <div class="relative h-[280px] w-full overflow-hidden rounded-3xl sm:h-[420px]">
          <img v-if="mainPhoto" :src="mainPhoto" :alt="club.nombre" class="h-full w-full object-cover" />
          <div v-else class="relative h-full w-full bg-gradient-to-br from-primitive-dark-500 to-primitive-blue-500">
            <div class="absolute inset-8 rounded-xl border border-white/15">
              <div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/15"></div>
              <div class="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/15"></div>
              <div class="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"></div>
            </div>
          </div>
        </div>
        <div v-if="thumbs.length" class="mt-3 grid grid-cols-4 gap-3">
          <div v-for="(t, i) in thumbs" :key="i" class="relative h-24 overflow-hidden rounded-2xl sm:h-28">
            <img :src="t" :alt="`${club.nombre} ${i + 2}`" class="h-full w-full object-cover" />
            <div v-if="i === thumbs.length - 1 && extraCount" class="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
              + más ({{ extraCount }})
            </div>
          </div>
        </div>
      </div>

      <!-- Dos columnas -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <!-- Izquierda -->
        <div class="min-w-0 space-y-10">
          <!-- Sobre este complejo -->
          <section v-if="club.descripcion">
            <h2 class="text-xl font-bold text-primitive-dark-500">Sobre este complejo</h2>
            <p class="mt-3 text-[15px] leading-relaxed text-slate-500">{{ club.descripcion }}</p>
          </section>

          <!-- Instalaciones -->
          <section v-if="club.servicios && club.servicios.length">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold text-primitive-dark-500">Instalaciones</h2>
              <button
                v-if="club.servicios.length > 6"
                type="button"
                class="text-sm font-semibold text-primitive-orange-500 hover:text-primitive-orange-600 cursor-pointer"
                @click="showAllServices = !showAllServices"
              >
                {{ showAllServices ? 'Ver menos' : 'Ver todas' }}
              </button>
            </div>
            <div class="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="s in visibleServices" :key="s" class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-primitive-orange-50 text-primitive-orange-500">
                  <i :class="serviceIcon(s)" class="text-sm"></i>
                </span>
                <span class="text-sm font-medium text-slate-600">{{ s }}</span>
              </div>
            </div>
          </section>

          <!-- Lo que ofrece -->
          <section>
            <h2 class="text-xl font-bold text-primitive-dark-500">Lo que ofrece</h2>
            <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="rounded-2xl border border-black/[0.06] bg-white p-5">
                <i class="icon-[material-symbols--grid-view] text-primitive-orange-500"></i>
                <p class="mt-3 text-lg font-bold text-primitive-dark-500">{{ courts.length }} canchas</p>
                <p class="mt-0.5 text-sm text-slate-400">{{ indoorCount }} indoor · {{ outdoorCount }} outdoor</p>
              </div>
              <div class="rounded-2xl border border-black/[0.06] bg-white p-5">
                <i class="icon-[material-symbols--map] text-primitive-orange-500"></i>
                <p class="mt-3 text-lg font-bold text-primitive-dark-500">{{ superficies.length }} superficies</p>
                <p class="mt-0.5 text-sm text-slate-400">{{ superficies.join(', ') || 'Sin especificar' }}</p>
              </div>
              <div class="rounded-2xl border border-black/[0.06] bg-white p-5">
                <i class="icon-[material-symbols--bolt] text-primitive-orange-500"></i>
                <p class="mt-3 text-lg font-bold text-primitive-dark-500">Reserva online</p>
                <p class="mt-0.5 text-sm text-slate-400">Disponibilidad en tiempo real</p>
              </div>
            </div>
          </section>

          <!-- Deportes disponibles -->
          <section v-if="sports.length">
            <h2 class="text-xl font-bold text-primitive-dark-500">Deportes disponibles</h2>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="s in sports"
                :key="s"
                class="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium"
                :class="[sportMeta(s).bg, sportMeta(s).text]"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="sportMeta(s).dot"></span>{{ sportMeta(s).label }}
              </span>
            </div>
          </section>
        </div>

        <!-- Derecha: panel de reserva -->
        <div class="lg:sticky lg:top-24 lg:self-start">
          <div class="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <h3 class="text-xl font-bold text-primitive-dark-500">Reservá esta cancha</h3>
            <p class="mt-1 text-sm text-slate-400">Elegí cancha y horario</p>

            <template v-if="!courts.length">
              <p class="mt-6 rounded-2xl bg-slate-50 py-8 text-center text-sm text-slate-500">
                Este complejo todavía no tiene canchas para reservar online.
              </p>
            </template>

            <template v-else>
              <!-- Día -->
              <p class="mt-6 text-xs font-bold tracking-wide text-slate-500 uppercase">Día</p>
              <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  v-for="d in dayPills"
                  :key="d.key"
                  type="button"
                  class="flex w-12 shrink-0 flex-col items-center rounded-full border py-2 transition-colors cursor-pointer"
                  :class="currentDate === d.key
                    ? 'border-primitive-orange-500 bg-primitive-orange-500 text-white'
                    : 'border-black/[0.08] bg-white text-slate-600 hover:bg-slate-50'"
                  @click="currentDate = d.key"
                >
                  <span class="text-[10px] font-semibold" :class="currentDate === d.key ? 'text-white/75' : 'text-slate-400'">{{ d.dow }}</span>
                  <span class="text-base font-bold leading-tight">{{ d.day }}</span>
                </button>
              </div>

              <!-- Seleccioná cancha -->
              <p class="mt-6 text-xs font-bold tracking-wide text-slate-500 uppercase">Seleccioná cancha</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="c in courts"
                  :key="c._id"
                  type="button"
                  class="flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
                  :class="selectedCourtId === c._id
                    ? 'border-primitive-orange-500 bg-primitive-orange-50 text-primitive-orange-700'
                    : 'border-black/[0.08] bg-white text-slate-600 hover:bg-slate-50'"
                  @click="selectCourt(c._id)"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="sportMeta(c.tipo).dot"></span>{{ c.nombre }}
                </button>
              </div>

              <!-- Horario disponible -->
              <div class="mt-6 flex items-center justify-between">
                <p class="text-xs font-bold tracking-wide text-slate-500 uppercase">Horario disponible</p>
                <span v-if="turnosTotal" class="text-xs font-semibold text-success-600">{{ turnosLibres }}/{{ turnosTotal }} turnos libres</span>
              </div>

              <div v-if="loadingSlots" class="flex items-center justify-center py-10">
                <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-slate-300"></i>
              </div>

              <div v-else-if="!selectedRow?.abierto || !availableSlots.length" class="mt-3 rounded-2xl bg-slate-50 py-8 text-center text-sm text-slate-500">
                No hay turnos disponibles este día.
              </div>

              <div v-else class="mt-3 grid grid-cols-3 gap-2">
                <button
                  v-for="slot in availableSlots"
                  :key="slot.inicio"
                  type="button"
                  :disabled="!slot.disponible"
                  class="flex items-center justify-center gap-1 rounded-full border py-2.5 text-sm font-semibold transition-colors"
                  :class="isSlotSelected(slot)
                    ? 'border-primitive-orange-500 bg-primitive-orange-500 text-white cursor-pointer'
                    : slot.disponible
                      ? 'border-black/[0.08] bg-white text-primitive-dark-500 hover:border-primitive-orange-400 hover:bg-primitive-orange-50 cursor-pointer'
                      : 'border-transparent bg-slate-100 text-slate-300 cursor-not-allowed'"
                  @click="selectSlot(slot)"
                >
                  <i class="icon-[material-symbols--schedule] text-[11px]" :class="isSlotSelected(slot) ? 'text-white' : 'text-slate-400'"></i>
                  {{ slot.horaInicio }}
                </button>
              </div>

              <!-- Precio + CTA -->
              <div class="my-5 border-t border-black/[0.06]"></div>

              <div class="flex items-end justify-between">
                <div>
                  <p v-if="perHour" class="text-2xl font-bold text-primitive-orange-500">
                    {{ formatCurrency(perHour, moneda) }}<span class="text-sm font-medium text-slate-400"> /hora</span>
                  </p>
                  <p v-else class="text-lg font-bold text-slate-300">— /hora</p>
                </div>
                <p v-if="selectedSlot" class="text-right text-sm text-slate-500">
                  {{ selectedSlot.horaInicio }}–{{ selectedSlot.horaFin }}<br />
                  <span class="font-semibold text-primitive-dark-500">{{ formatCurrency(selectedSlot.precio, moneda) }}</span>
                </p>
              </div>

              <button
                type="button"
                class="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primitive-orange-500 text-sm font-semibold text-white transition-colors hover:bg-primitive-orange-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                :disabled="!selectedSlot"
                @click="openBooking"
              >
                Reservar cancha <i class="icon-[material-symbols--arrow-forward] text-xs"></i>
              </button>
              <p class="mt-2 text-center text-xs text-slate-400">Elegí un horario libre para continuar.</p>
            </template>
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
