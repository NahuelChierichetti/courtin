<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import publicService from '@/services/publicService'
import { useAuth } from '@/composables/useAuth'
import { dayjs, formatCurrency } from '@/utils/datetime'
import { sportMeta, suggestedPrice } from '@/utils/turnos'
import BookingModal from '@/components/public/BookingModal.vue'
import FavoriteButton from '@/components/public/FavoriteButton.vue'
import ClubMap from '@/components/common/ClubMap.vue'
import { direccionesUrl, mapQuery } from '@/utils/maps'

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

// --- Ubicación ---
// El mapa necesita coordenadas o, al menos, una dirección que Google pueda
// interpretar. Sin ninguna de las dos la sección entera no se muestra: un mapa
// del centro del país no le sirve a nadie.
const mapaArgs = computed(() => ({
  lat: club.value?.ubicacion?.lat ?? null,
  lng: club.value?.ubicacion?.lng ?? null,
  direccion: club.value?.direccion || '',
  ciudad: club.value?.ciudad || '',
  provincia: club.value?.provincia || '',
}))
const hasUbicacion = computed(() => !!club.value && !!mapQuery(mapaArgs.value))
const direccionCompleta = computed(() =>
  [club.value?.direccion, club.value?.ciudad, club.value?.provincia].filter(Boolean).join(', '),
)
const comoLlegarUrl = computed(() => direccionesUrl(mapaArgs.value))

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
  // Opcional en la cuenta, así que puede no estar; cuando está, evita que quien
  // ya reservó antes vuelva a tipear su teléfono en cada reserva.
  telefono: isAuthenticated.value ? user.value?.telefono || '' : '',
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
  <div class="mx-auto w-full max-w-shell px-4 py-8">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-stone-300"></i>
      <p class="mt-4 text-sm text-stone-500">Cargando complejo...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
        <i class="icon-[material-symbols--warning] text-2xl text-stone-300"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-brand-green-900">{{ error }}</h3>
      <RouterLink :to="{ name: 'public-home' }" class="mt-3 text-sm font-semibold text-brand-green-500 no-underline">
        ← Volver a la búsqueda
      </RouterLink>
    </div>

    <div v-else class="space-y-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm text-stone-400">
        <RouterLink :to="{ name: 'public-home' }" class="no-underline text-stone-400 hover:text-stone-600">Inicio</RouterLink>
        <span>/</span>
        <RouterLink
          :to="{ name: 'public-home', query: primarySport ? { tipo: primarySport } : {} }"
          class="no-underline text-stone-400 hover:text-stone-600"
        >
          {{ primarySport ? sportMeta(primarySport).label : 'Complejos' }}
        </RouterLink>
        <span>/</span>
        <span class="font-medium text-brand-green-900">{{ club.nombre }}</span>
      </nav>

      <!--
        Aviso de complejo de demostración. El club demo no sale en el buscador,
        pero su link es público: si alguien lo recibe reenviado tiene que saber,
        antes de elegir un turno, que ese complejo no existe.
      -->
      <div
        v-if="club.demo"
        class="flex items-start gap-3 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3.5"
      >
        <i class="icon-[material-symbols--info-outline] mt-0.5 shrink-0 text-warning-600"></i>
        <p class="text-sm leading-relaxed text-warning-700">
          <strong class="font-semibold">Complejo de demostración.</strong>
          Sirve para mostrar cómo funciona CourtIn: las canchas y los turnos son de mentira, así
          que no reserves acá esperando jugar.
          <RouterLink
            :to="{ name: 'public-home' }"
            class="font-medium text-warning-700 underline underline-offset-2"
            >Buscá complejos reales</RouterLink
          >.
        </p>
      </div>

      <!-- Header -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-brand-green-900 sm:text-4xl">{{ club.nombre }}</h1>
          <div class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-stone-500">
            <span v-if="club.direccion || club.ciudad" class="inline-flex items-center gap-1.5">
              <i class="icon-[material-symbols--location-on] text-xs"></i>{{ [club.direccion, club.ciudad].filter(Boolean).join(', ') }}
            </span>
            <span v-if="todayConfig && todayConfig.abierto !== false" class="inline-flex items-center gap-1.5">
              <i class="icon-[material-symbols--schedule] text-xs"></i>
              <span :class="isOpenNow ? 'font-semibold text-success-600' : 'text-stone-500'">
                {{ isOpenNow ? 'Abierto' : 'Cerrado' }}
              </span>
              · Cierra {{ todayConfig.horaFin }}
            </span>
          </div>
        </div>
        <div class="flex shrink-0 items-start gap-4">
          <div v-if="club.rating" class="text-right">
            <p class="flex items-center justify-end gap-1.5 text-2xl font-bold text-success-600">
              <i class="icon-[material-symbols--star] text-lg"></i>{{ Number(club.rating).toFixed(2) }}
            </p>
            <p v-if="club.reseñas" class="text-sm text-stone-400">{{ club.reseñas }} reseñas</p>
          </div>
          <FavoriteButton :club="club" variant="plain" />
        </div>
      </div>

      <!-- Galería -->
      <div>
        <div class="relative h-[280px] w-full overflow-hidden rounded-3xl sm:h-[420px]">
          <img v-if="mainPhoto" :src="mainPhoto" :alt="club.nombre" class="h-full w-full object-cover" />
          <div v-else class="relative h-full w-full bg-gradient-to-br from-ink-500 to-brand-purple-500">
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
            <h2 class="text-xl font-semibold text-brand-green-900">Sobre este complejo</h2>
            <p class="mt-3 text-[15px] leading-relaxed text-stone-500">{{ club.descripcion }}</p>
          </section>

          <!-- Deportes disponibles -->
          <section v-if="sports.length">
            <h2 class="text-xl font-semibold text-brand-green-900">Deportes disponibles</h2>
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

          <!-- Instalaciones -->
          <section v-if="club.servicios && club.servicios.length">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-brand-green-900">Instalaciones</h2>
              <button
                v-if="club.servicios.length > 6"
                type="button"
                class="text-sm font-semibold text-brand-green-500 hover:text-brand-green-600 cursor-pointer"
                @click="showAllServices = !showAllServices"
              >
                {{ showAllServices ? 'Ver menos' : 'Ver todas' }}
              </button>
            </div>
            <div class="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="s in visibleServices" :key="s" class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-500">
                  <i :class="serviceIcon(s)" class="text-sm"></i>
                </span>
                <span class="text-sm font-medium text-stone-600">{{ s }}</span>
              </div>
            </div>
          </section>

          <!-- Ubicación -->
          <section v-if="hasUbicacion">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="text-xl font-semibold text-brand-green-900">Ubicación</h2>
              <a
                :href="comoLlegarUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-green-500 no-underline hover:text-brand-green-600"
              >
                <i class="icon-[material-symbols--directions] text-base"></i>Cómo llegar
              </a>
            </div>
            <p v-if="direccionCompleta" class="mt-2 inline-flex items-start gap-1.5 text-[15px] text-stone-500">
              <i class="icon-[material-symbols--location-on] mt-0.5 shrink-0 text-sm text-stone-400"></i>
              {{ direccionCompleta }}
            </p>
            <ClubMap
              class="mt-4"
              :nombre="club.nombre"
              :lat="mapaArgs.lat"
              :lng="mapaArgs.lng"
              :direccion="mapaArgs.direccion"
              :ciudad="mapaArgs.ciudad"
              :provincia="mapaArgs.provincia"
              height-class="h-[300px] sm:h-[360px]"
            />
          </section>
        </div>

        <!-- Derecha: panel de reserva -->
        <div class="lg:sticky lg:top-24 lg:self-start">
          <div class="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <h3 class="text-xl font-bold text-brand-green-900">Reservá esta cancha</h3>
            <p class="text-sm text-stone-400">Elegí cancha y horario</p>

            <template v-if="!courts.length">
              <p class="mt-6 rounded-2xl bg-stone-50 py-8 text-center text-sm text-stone-500">
                Este complejo todavía no tiene canchas para reservar online.
              </p>
            </template>

            <template v-else>
              <!-- Día -->
              <div class="mt-4 flex gap-2 overflow-x-auto pb-1">
                <button
                  v-for="d in dayPills"
                  :key="d.key"
                  type="button"
                  class="flex w-12 shrink-0 flex-col items-center rounded-md border py-2 transition-colors cursor-pointer"
                  :class="currentDate === d.key
                    ? 'border-brand-green-500 bg-brand-green-500 text-white'
                    : 'border-black/[0.08] bg-white text-stone-600 hover:bg-stone-50'"
                  @click="currentDate = d.key"
                >
                  <span class="text-[10px] font-semibold" :class="currentDate === d.key ? 'text-white/75' : 'text-stone-400'">{{ d.dow }}</span>
                  <span class="text-base font-bold leading-tight">{{ d.day }}</span>
                </button>
              </div>

              <!-- Seleccioná cancha -->
              <p class="mt-6 text-xs font-bold tracking-wide text-stone-500 uppercase">Seleccioná cancha</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="c in courts"
                  :key="c._id"
                  type="button"
                  class="flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors cursor-pointer"
                  :class="selectedCourtId === c._id
                    ? 'border-brand-green-500 bg-brand-green-50 text-brand-green-700'
                    : 'border-black/[0.08] bg-white text-stone-600 hover:bg-stone-50'"
                  @click="selectCourt(c._id)"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="sportMeta(c.tipo).dot"></span>{{ c.nombre }}
                </button>
              </div>

              <!-- Horario disponible -->
              <div class="mt-6 flex items-center justify-between">
                <p class="text-xs font-bold tracking-wide text-stone-500 uppercase">Horario disponible</p>
                <span v-if="turnosTotal" class="text-xs font-semibold text-success-600">{{ turnosLibres }}/{{ turnosTotal }} turnos libres</span>
              </div>

              <div v-if="loadingSlots" class="flex items-center justify-center py-10">
                <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i>
              </div>

              <div v-else-if="!selectedRow?.abierto || !availableSlots.length" class="mt-3 rounded-2xl bg-stone-50 py-8 text-center text-sm text-stone-500">
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
                    ? 'border-brand-green-500 bg-brand-green-500 text-white cursor-pointer'
                    : slot.disponible
                      ? 'border-black/[0.08] bg-white text-brand-green-900 hover:border-brand-green-400 hover:bg-brand-green-50 cursor-pointer'
                      : 'border-transparent bg-stone-100 text-stone-300 cursor-not-allowed'"
                  @click="selectSlot(slot)"
                >
                  <i class="icon-[material-symbols--schedule] text-[11px]" :class="isSlotSelected(slot) ? 'text-white' : 'text-stone-400'"></i>
                  {{ slot.horaInicio }}
                </button>
              </div>

              <!-- Precio + CTA -->
              <div class="my-5 border-t border-black/[0.06]"></div>

              <div class="flex items-end justify-between">
                <div>
                  <p v-if="perHour" class="text-2xl font-bold text-brand-green-500">
                    {{ formatCurrency(perHour, moneda) }}<span class="text-sm font-medium text-stone-400"> /hora</span>
                  </p>
                  <p v-else class="text-lg font-bold text-stone-300">— /hora</p>
                </div>
                <p v-if="selectedSlot" class="text-right text-sm text-stone-500">
                  {{ selectedSlot.horaInicio }}–{{ selectedSlot.horaFin }}<br />
                  <span class="font-semibold text-brand-green-900">{{ formatCurrency(selectedSlot.precio, moneda) }}</span>
                </p>
              </div>

              <button
                type="button"
                class="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                :disabled="!selectedSlot"
                @click="openBooking"
              >
                Reservar cancha <i class="icon-[material-symbols--arrow-forward] text-xs"></i>
              </button>
              <p class="mt-2 text-center text-xs text-stone-400">Elegí un horario libre para continuar.</p>
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
