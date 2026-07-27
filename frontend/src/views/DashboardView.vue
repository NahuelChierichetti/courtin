<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import reservationService from '@/services/reservationService'
import statsService from '@/services/statsService'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'
import { ESTADO_META, reservationLabel } from '@/utils/turnos'

const { currentClubId, currentClub } = useAuth()
const router = useRouter()

const tz = computed(() => currentClub.value?.timezone || DEFAULT_TZ)
const moneda = computed(() => currentClub.value?.moneda || 'ARS')
const money = (n) => formatCurrency(n, moneda.value)
const nowLabel = computed(() => dayjs().tz(tz.value).format('HH:mm'))

const selectedPeriod = ref('hoy')
const periods = [
  { label: 'Hoy', value: 'hoy' },
  { label: '7 días', value: '7dias' },
  { label: 'Mes', value: 'mes' },
]

const todayFormatted = computed(() =>
  new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
)

// --- Datos reales del dashboard ---
const dashboard = ref(null)
const loadingDash = ref(false)

const fetchDashboard = async () => {
  if (!currentClubId.value) {
    dashboard.value = null
    return
  }
  loadingDash.value = true
  try {
    dashboard.value = await statsService.getDashboard(currentClubId.value, selectedPeriod.value)
  } catch (err) {
    console.error(err)
    dashboard.value = null
  } finally {
    loadingDash.value = false
  }
}

onMounted(fetchDashboard)
watch([currentClubId, selectedPeriod], fetchDashboard)

const statColorMap = {
  purple: { bg: 'bg-brand-purple-50', icon: 'text-brand-purple-500' },
  green: { bg: 'bg-brand-green-50', icon: 'text-brand-green-500' },
  lime: { bg: 'bg-brand-lime-100', icon: 'text-brand-lime-800' },
  neutral: { bg: 'bg-ink-100', icon: 'text-ink-500' },
}

const statTiles = computed(() => {
  const s = dashboard.value?.stats
  if (!s) return []
  return [
    { title: 'Reservas', value: s.reservas.value, trendPct: s.reservas.trendPct, icon: 'icon-[material-symbols--calendar-month]', color: 'purple' },
    { title: 'Ingresos', value: money(s.ingresos.value), trendPct: s.ingresos.trendPct, icon: 'icon-[material-symbols--attach-money]', color: 'green' },
    { title: 'Ocupación', value: `${s.ocupacion.value}%`, trendPct: null, icon: 'icon-[material-symbols--pie-chart]', color: 'lime' },
    { title: 'Clientes nuevos', value: s.clientesNuevos.value, trendPct: null, icon: 'icon-[material-symbols--person-add]', color: 'neutral' },
  ]
})

const ocupacionPorCancha = computed(() => dashboard.value?.ocupacionPorCancha || [])
const heatmap = computed(() => dashboard.value?.heatmap || { horas: [], dias: [], data: [] })
const actividad = computed(() => dashboard.value?.actividad || [])

const getCourtOccupationColor = (p) => {
  if (p >= 85) return 'bg-brand-green-700'
  if (p >= 70) return 'bg-brand-green-600'
  if (p >= 55) return 'bg-brand-green-500'
  if (p >= 40) return 'bg-brand-green-400'
  if (p >= 25) return 'bg-brand-green-300'
  if (p >= 10) return 'bg-brand-green-200'
  return 'bg-brand-green-100'
}
const getHeatmapColor = (v) => {
  if (v >= 90) return 'bg-brand-green-500'
  if (v >= 70) return 'bg-brand-green-400'
  if (v >= 50) return 'bg-brand-green-300'
  if (v >= 30) return 'bg-brand-green-200'
  if (v >= 10) return 'bg-brand-green-100'
  return 'bg-stone-100'
}

const ACT_META = {
  reserva: { icon: 'icon-[material-symbols--event-available]', color: 'text-brand-green-500 bg-brand-green-50' },
  cancelacion: { icon: 'icon-[material-symbols--cancel]', color: 'text-warning-600 bg-warning-50' },
  pago: { icon: 'icon-[material-symbols--check-circle]', color: 'text-success-500 bg-success-50' },
  egreso: { icon: 'icon-[material-symbols--payments]', color: 'text-error-500 bg-error-50' },
  cliente: { icon: 'icon-[material-symbols--person-add]', color: 'text-brand-purple-500 bg-brand-purple-50' },
}
const actMeta = (t) => ACT_META[t] || ACT_META.reserva

const hace = (f) => {
  const mins = dayjs().diff(dayjs(f), 'minute')
  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

// --- Próximas reservas (datos reales) ---
const upcomingRaw = ref([])
const loadingUpcoming = ref(false)

const getInitials = (name) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?'

const upcomingReservations = computed(() =>
  upcomingRaw.value.map((r) => {
    const start = dayjs.utc(r.inicio).tz(tz.value)
    const end = dayjs.utc(r.fin).tz(tz.value)
    const name = reservationLabel(r)
    const meta = ESTADO_META[r.estado] || ESTADO_META.pendiente
    return {
      id: r._id,
      time: start.format('HH:mm'),
      timeEnd: end.format('HH:mm'),
      name,
      initials: getInitials(name),
      court: r.court?.nombre || 'Cancha',
      estadoLabel: meta.label,
      estadoDot: meta.dot,
      estadoText: meta.text,
    }
  }),
)

const fetchUpcoming = async () => {
  if (!currentClubId.value) {
    upcomingRaw.value = []
    return
  }
  loadingUpcoming.value = true
  try {
    upcomingRaw.value = await reservationService.getUpcomingReservations(currentClubId.value, { limit: 6 })
  } catch (err) {
    console.error(err)
    upcomingRaw.value = []
  } finally {
    loadingUpcoming.value = false
  }
}

const goToTurnos = () => router.push({ name: 'turnos' })
onMounted(fetchUpcoming)
watch(currentClubId, fetchUpcoming)
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-ink-500">Dashboard</h1>
        <p class="mt-1 text-xs text-stone-500 first-letter:uppercase">{{ todayFormatted }}</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex overflow-hidden rounded-full border border-black/[0.06] bg-white shadow-sm">
          <button
            v-for="period in periods"
            :key="period.value"
            class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
            :class="selectedPeriod === period.value ? 'bg-brand-purple-500 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'"
            @click="selectedPeriod = period.value"
          >
            {{ period.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div v-for="stat in statTiles" :key="stat.title" class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="flex h-11 w-11 items-center justify-center rounded-xl" :class="statColorMap[stat.color].bg">
            <i :class="[stat.icon, statColorMap[stat.color].icon]" class="text-xl"></i>
          </span>
          <span
            v-if="stat.trendPct !== null && stat.trendPct !== undefined"
            class="rounded-full px-2 py-0.5 text-xs font-semibold"
            :class="stat.trendPct >= 0 ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600'"
          >
            {{ stat.trendPct >= 0 ? '+' : '' }}{{ stat.trendPct }}%
          </span>
        </div>
        <p class="mt-4 text-sm font-medium text-stone-500">{{ stat.title }}</p>
        <p class="mt-1 text-3xl font-bold font-secondary text-ink-500">{{ stat.value }}</p>
      </div>
      <!-- Skeleton mientras carga -->
      <template v-if="!statTiles.length">
        <div v-for="n in 4" :key="n" class="h-[132px] animate-pulse rounded-2xl border border-black/[0.06] bg-white shadow-sm"></div>
      </template>
    </div>

    <!-- Middle row -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Próximas reservas -->
      <div class="col-span-1 min-h-[400px] rounded-2xl border border-black/[0.06] bg-white shadow-sm lg:col-span-2">
        <div class="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-ink-500">Próximas reservas</h2>
            <p class="text-xs text-stone-400">Próximos turnos desde las {{ nowLabel }} hs</p>
          </div>
          <button class="flex items-center gap-1 text-sm font-medium text-brand-green-500 hover:text-brand-green-600 cursor-pointer" @click="goToTurnos">
            Ver todas
          </button>
        </div>

        <div class="px-6">
          <div class="grid grid-cols-[80px_1fr_120px_110px_32px] items-center gap-6 border-b border-stone-100 py-3 text-xs font-semibold tracking-wide text-stone-400 uppercase">
            <span>Hora</span><span>Cliente</span><span>Cancha</span><span>Estado</span><span></span>
          </div>

          <div v-if="loadingUpcoming" class="flex min-h-[300px] flex-col items-center justify-center text-center">
            <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-400"></i>
          </div>

          <div v-else-if="!upcomingReservations.length" class="flex min-h-[300px] flex-col items-center justify-center text-center">
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
              <i class="icon-[material-symbols--calendar-month] text-xl text-stone-400"></i>
            </div>
            <h3 class="mt-4 text-sm font-semibold text-ink-500">No hay próximas reservas</h3>
            <p class="!mt-1 text-xs text-stone-500">Las reservas que cargues aparecerán acá.</p>
            <button class="mt-4 text-sm font-medium text-brand-green-500 hover:text-brand-green-600 cursor-pointer" @click="goToTurnos">
              Ir al calendario de turnos
            </button>
          </div>

          <template v-else>
            <div
              v-for="reservation in upcomingReservations"
              :key="reservation.id"
              class="grid grid-cols-[80px_1fr_120px_110px_32px] items-center gap-6 border-b border-stone-50 py-4 last:border-b-0"
            >
              <div class="flex items-center gap-1 text-xs text-stone-500">
                {{ reservation.time }} – {{ reservation.timeEnd }}
              </div>
              <div class="flex items-center gap-3">
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green-50 text-xs font-semibold font-secondary text-brand-green-600">
                  {{ reservation.initials }}
                </div>
                <span class="text-sm font-medium text-stone-800">{{ reservation.name }}</span>
              </div>
              <div>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-brand-purple-50 px-2.5 py-1 text-xs font-medium font-secondary text-brand-purple-700">
                  <span class="h-1.5 w-1.5 rounded-full bg-brand-purple-500"></span>{{ reservation.court }}
                </span>
              </div>
              <div>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-2.5 py-1 text-xs font-medium font-secondary" :class="reservation.estadoText">
                  <span class="h-1.5 w-1.5 rounded-full" :class="reservation.estadoDot"></span>{{ reservation.estadoLabel }}
                </span>
              </div>
              <button class="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 transition-colors hover:bg-stone-50 hover:text-stone-500 cursor-pointer" @click="goToTurnos">
                <i class="icon-[material-symbols--chevron-right] text-xs"></i>
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Ocupación por cancha -->
      <div class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-ink-500">Ocupación por cancha</h2>
            <p class="text-xs text-stone-400">Hoy</p>
          </div>
        </div>
        <div v-if="!ocupacionPorCancha.length" class="px-6 py-10 text-center text-sm text-stone-400">Sin canchas activas.</div>
        <div v-else class="mt-4 space-y-3 px-6 pb-2">
          <div v-for="court in ocupacionPorCancha" :key="court.nombre" class="flex items-center gap-3">
            <div class="flex w-24 items-center gap-2">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="getCourtOccupationColor(court.pct)"></span>
              <span class="truncate text-xs font-medium font-secondary text-stone-700">{{ court.nombre }}</span>
            </div>
            <div class="relative h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div class="absolute inset-y-0 left-0 rounded-full transition-all" :class="getCourtOccupationColor(court.pct)" :style="{ width: court.pct + '%' }"></div>
            </div>
            <span class="w-10 text-right text-xs font-semibold font-secondary text-stone-700">{{ court.pct }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <!-- Mapa de calor -->
      <div class="col-span-1 rounded-2xl border border-black/[0.06] bg-white shadow-sm lg:col-span-2">
        <div class="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-ink-500">Mapa de calor — Esta semana</h2>
            <p class="text-xs text-stone-400">Ocupación por día y franja horaria</p>
          </div>
        </div>
        <div class="overflow-x-auto px-6 py-4 pb-6">
          <div class="min-w-[500px]">
            <div class="my-2 grid" :style="{ gridTemplateColumns: '48px repeat(7, 1fr)', gap: '4px' }">
              <div></div>
              <div v-for="day in heatmap.dias" :key="day" class="text-center text-xs font-medium text-stone-500">{{ day }}</div>
            </div>
            <div v-for="(row, rowIndex) in heatmap.data" :key="rowIndex" class="mb-1 grid" :style="{ gridTemplateColumns: '48px repeat(7, 1fr)', gap: '4px' }">
              <div class="flex items-center text-xs text-stone-400">{{ heatmap.horas[rowIndex] }}</div>
              <div
                v-for="(cell, colIndex) in row"
                :key="colIndex"
                class="h-8 rounded-md transition-colors"
                :class="getHeatmapColor(cell)"
                :title="`${heatmap.dias[colIndex]} ${heatmap.horas[rowIndex]} — ${cell}%`"
              ></div>
            </div>
            <div class="mt-3 flex items-center justify-between">
              <span class="text-xs text-stone-400">0%</span>
              <div class="flex gap-1">
                <div class="h-3 w-8 rounded bg-stone-100"></div>
                <div class="h-3 w-8 rounded bg-brand-green-100"></div>
                <div class="h-3 w-8 rounded bg-brand-green-200"></div>
                <div class="h-3 w-8 rounded bg-brand-green-300"></div>
                <div class="h-3 w-8 rounded bg-brand-green-400"></div>
                <div class="h-3 w-8 rounded bg-brand-green-500"></div>
              </div>
              <span class="text-xs text-stone-400">100%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actividad reciente -->
      <div class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div class="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-ink-500">Actividad reciente</h2>
            <p class="text-xs text-stone-400">Últimos eventos del complejo</p>
          </div>
        </div>
        <div v-if="!actividad.length" class="px-6 py-10 text-center text-sm text-stone-400">Sin actividad reciente.</div>
        <div v-else class="divide-y divide-stone-50 px-6">
          <div v-for="(a, index) in actividad" :key="index" class="flex items-center gap-3 py-3.5">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" :class="actMeta(a.tipo).color">
              <i :class="actMeta(a.tipo).icon" class="text-sm"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-stone-700">{{ a.texto }}</p>
              <p class="mt-0.5 text-xs text-stone-400">{{ hace(a.fecha) }}</p>
            </div>
            <span v-if="a.monto" class="shrink-0 text-sm font-bold font-secondary" :class="a.monto >= 0 ? 'text-success-600' : 'text-error-600'">
              {{ a.monto >= 0 ? '+' : '−' }} {{ money(Math.abs(a.monto)) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
