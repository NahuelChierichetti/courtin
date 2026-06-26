<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import Button from 'primevue/button'
import reservationService from '@/services/reservationService'
import { dayjs, DEFAULT_TZ } from '@/utils/datetime'
import { ESTADO_META, reservationLabel } from '@/utils/turnos'

const { user, currentClubId, currentClub } = useAuth()
const router = useRouter()

const tz = computed(() => currentClub.value?.timezone || DEFAULT_TZ)
const nowLabel = computed(() => dayjs().tz(tz.value).format('HH:mm'))

const selectedPeriod = ref('hoy')

const periods = [
  { label: 'Hoy', value: 'hoy' },
  { label: '7 días', value: '7dias' },
  { label: 'Mes', value: 'mes' },
]

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
})

const todayFormatted = computed(() => {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const stats = [
  {
    title: 'Reservas hoy',
    value: '46',
    trend: '+8 vs ayer',
    trendUp: true,
    icon: 'pi pi-calendar',
    color: 'blue',
  },
  {
    title: 'Ingresos del día',
    value: '$ 612.450',
    trend: '+24%',
    trendUp: true,
    subtitle: 'vs $493k mismo día semana anterior',
    icon: 'pi pi-dollar',
    color: 'green',
  },
  {
    title: 'Ocupación',
    value: '35%',
    trend: '+12 pts',
    trendUp: true,
    subtitle: '45 turnos / 128 disponibles',
    icon: 'pi pi-chart-pie',
    color: 'orange',
  },
  {
    title: 'Clientes nuevos',
    value: '7',
    trend: '-2 vs ayer',
    trendUp: false,
    subtitle: 'Esta semana: 23',
    icon: 'pi pi-user-plus',
    color: 'purple',
  },
]

const statColorMap = {
  blue: {
    bg: 'bg-primitive-blue-50',
    icon: 'text-primitive-blue-500',
  },
  green: {
    bg: 'bg-success-50',
    icon: 'text-success-500',
  },
  orange: {
    bg: 'bg-primitive-orange-50',
    icon: 'text-primitive-orange-500',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'text-purple-500',
  },
}

// --- Próximas reservas (datos reales del club activo) ---
const upcomingRaw = ref([])
const loadingUpcoming = ref(false)

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?'

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
    upcomingRaw.value = await reservationService.getUpcomingReservations(currentClubId.value, {
      limit: 6,
    })
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

const courtOccupation = [
  { name: 'Cancha 1', percentage: 80, color: 'bg-primitive-orange-700' },
  { name: 'Cancha 2', percentage: 60, color: 'bg-primitive-orange-500' },
  { name: 'Cancha 3', percentage: 50, color: 'bg-primitive-orange-400' },
  { name: 'Cancha 4', percentage: 50, color: 'bg-primitive-orange-300' },
  { name: 'Cancha 5', percentage: 50, color: 'bg-primitive-orange-200' },
  { name: 'Cancha 6', percentage: 40, color: 'bg-success-500' },
  { name: 'Cancha 7', percentage: 33, color: 'bg-success-500' },
  { name: 'Cancha 8', percentage: 60, color: 'bg-primitive-blue-500' },
]

const getCourtOccupationColor = (percentage) => {
  if (percentage >= 85) return 'bg-primitive-orange-700'
  if (percentage >= 70) return 'bg-primitive-orange-600'
  if (percentage >= 55) return 'bg-primitive-orange-500'
  if (percentage >= 40) return 'bg-primitive-orange-400'
  if (percentage >= 25) return 'bg-primitive-orange-300'
  if (percentage >= 10) return 'bg-primitive-orange-200'
  return 'bg-primitive-orange-100'
}

const courtDotColors = {
  'bg-primitive-blue-500': 'bg-primitive-blue-500',
  'bg-primitive-orange-400': 'bg-primitive-orange-400',
  'bg-success-500': 'bg-success-500',
}

const heatmapDays = ['Lun 18', 'Mar 19', 'Mié 20', 'Jue 21', 'Vie 22', 'Sáb 23', 'Dom 24']
const heatmapHours = ['08h', '10h', '12h', '14h', '16h', '18h', '20h', '22h']
const heatmapData = [
  [80, 70, 90, 60, 80, 90, 50],
  [70, 80, 80, 70, 60, 80, 40],
  [40, 50, 50, 60, 50, 70, 30],
  [90, 100, 80, 70, 90, 60, 50],
  [100, 90, 90, 80, 100, 70, 60],
  [80, 90, 70, 60, 80, 90, 50],
  [90, 100, 80, 90, 70, 80, 60],
  [70, 80, 60, 50, 60, 50, 30],
]

const getHeatmapColor = (value) => {
  if (value >= 90) return 'bg-primitive-orange-500'
  if (value >= 70) return 'bg-primitive-orange-400'
  if (value >= 50) return 'bg-primitive-orange-300'
  if (value >= 30) return 'bg-primitive-orange-200'
  return 'bg-primitive-orange-100'
}

const recentActivity = [
  {
    icon: 'pi pi-check-circle',
    iconColor: 'text-success-500 bg-success-50',
    text: 'Federico Méndez pagó <strong>$18.000</strong> por reserva Cancha 1',
    time: 'hace 4 min',
  },
  {
    icon: 'pi pi-calendar-plus',
    iconColor: 'text-primitive-blue-500 bg-primitive-blue-50',
    text: 'Joaquín Aguirre reservó <strong>Cancha 1</strong> mañana 19:30',
    time: 'hace 12 min',
  },
  {
    icon: 'pi pi-times-circle',
    iconColor: 'text-primitive-orange-500 bg-primitive-orange-50',
    text: 'Agustina Ríos canceló <strong>Cancha 2</strong> hoy 13:00',
    time: 'hace 28 min',
  },
  {
    icon: 'pi pi-money-bill',
    iconColor: 'text-error-500 bg-error-50',
    text: 'Egreso registrado · <strong>Insumos kiosco</strong> -$32.400',
    time: 'hace 1 h',
  },
  {
    icon: 'pi pi-star',
    iconColor: 'text-warning-500 bg-warning-50',
    text: 'Sofía López dejó una reseña <strong>★★★★★</strong>',
    time: 'hace 3 h',
  },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p class="mt-1 text-xs text-slate-500 first-letter:uppercase">
          {{ todayFormatted }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex overflow-hidden rounded-lg border border-slate-200">
          <button
            v-for="period in periods"
            :key="period.value"
            class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
            :class="
              selectedPeriod === period.value
                ? 'bg-primitive-dark-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="selectedPeriod = period.value"
          >
            {{ period.label }}
          </button>
        </div>
        <Button label="Exportar" icon="pi pi-download" severity="secondary" class="cursor-pointer !bg-white !border !border-slate-300 !text-neutral-400" size="small" />
      </div>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-4 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.title"
        class="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <div class="flex items-start justify-between">
          <div class="flex flex-col gap-2">
            <p class="text-sm font-medium text-slate-700">{{ stat.title }}</p>
            <p class="text-3xl font-bold font-secondary text-primitive-dark-500">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Middle row -->
    <div class="grid grid-cols-3 gap-4">
      <!-- Próximas reservas -->
      <div class="col-span-2 rounded-2xl border border-slate-200 bg-white min-h-[400px]">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Próximas reservas</h2>
            <p class="text-xs text-neutral-400">Próximos turnos desde las {{ nowLabel }} hs</p>
          </div>
          <button
            class="flex items-center gap-1 text-sm font-medium text-primitive-orange-500 hover:text-primitive-orange-600 cursor-pointer"
            @click="goToTurnos"
          >
            Ver todas
          </button>
        </div>

        <div class="px-6">
          <div class="grid grid-cols-[80px_1fr_120px_110px_32px] items-center gap-6 border-b border-slate-100 py-3 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            <span>Hora</span>
            <span>Cliente</span>
            <span>Cancha</span>
            <span>Estado</span>
            <span></span>
          </div>

          <!-- Loading -->
          <div v-if="loadingUpcoming" class="flex min-h-[400px] flex-col items-center justify-center text-center">
            <i class="pi pi-spin pi-spinner text-2xl text-neutral-400"></i>
            <p class="mt-3 text-sm text-slate-500">Cargando reservas...</p>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="!upcomingReservations.length"
            class="flex min-h-[400px] flex-col items-center justify-center text-center"
          >
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <i class="pi pi-calendar text-xl text-neutral-400"></i>
            </div>
            <h3 class="mt-4 text-sm font-semibold text-slate-900">No hay próximas reservas</h3>
            <p class="!mt-1 text-xs text-slate-500">Las reservas que cargues aparecerán acá.</p>
            <button
              class="mt-4 text-sm font-medium text-primitive-orange-500 hover:text-primitive-orange-600 cursor-pointer"
              @click="goToTurnos"
            >
              Ir al calendario de turnos
            </button>
          </div>

          <!-- List -->
          <template v-else>
            <div
              v-for="reservation in upcomingReservations"
              :key="reservation.id"
              class="grid grid-cols-[80px_1fr_120px_110px_32px] items-center gap-6 border-b border-slate-50 py-4 last:border-b-0"
            >
              <div class="flex items-center gap-1">
                <p class="text-xs text-slate-500">{{ reservation.time }}</p>
                <p class="text-xs text-slate-500">–</p>
                <p class="text-xs text-slate-500">{{ reservation.timeEnd }}</p>
              </div>
              <div class="flex items-center gap-3">
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold font-secondary bg-orange-50 text-orange-500"
                >
                  {{ reservation.initials }}
                </div>
                <span class="text-sm font-medium text-slate-800">{{ reservation.name }}</span>
              </div>
              <div>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium font-secondary text-orange-700">
                  <span class="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                  {{ reservation.court }}
                </span>
              </div>
              <div>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium font-secondary" :class="reservation.estadoText">
                  <span class="h-1.5 w-1.5 rounded-full" :class="reservation.estadoDot"></span>
                  {{ reservation.estadoLabel }}
                </span>
              </div>
              <button class="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-500 cursor-pointer" @click="goToTurnos">
                <i class="pi pi-chevron-right text-xs"></i>
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Ocupación por cancha -->
      <div class="rounded-2xl border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Ocupación por cancha</h2>
            <p class="text-xs text-neutral-400">Hoy · 08:00 a 23:00</p>
          </div>
        </div>
        <div class="mt-4 space-y-3 px-6">
          <div v-for="court in courtOccupation" :key="court.name" class="flex items-center gap-3">
            <div class="flex w-20 items-center gap-2">
              <span class="h-2 w-2 shrink-0 rounded-full" :class="getCourtOccupationColor(court.percentage)"></span>
              <span class="text-xs font-medium font-secondary text-slate-700">{{ court.name }}</span>
            </div>
            <div class="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all"
                :class="getCourtOccupationColor(court.percentage)"
                :style="{ width: court.percentage + '%' }"
              ></div>
            </div>
            <span class="w-10 text-right text-xs font-semibold font-secondary text-slate-700">{{ court.percentage }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom row -->
    <div class="grid grid-cols-3 gap-4">
      <!-- Mapa de calor -->
      <div class="col-span-2 rounded-2xl border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Mapa de calor — Esta semana</h2>
            <p class="text-xs text-neutral-400">Ocupación por día y franja horaria</p>
          </div>
          <span class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium font-secondary text-slate-700">
            85 % ocupación
          </span>
        </div>
        <div class="overflow-x-auto px-6 py-4 pb-6">
          <div class="min-w-[500px]">
            <!-- Day headers -->
            <div class="my-2 grid" :style="{ gridTemplateColumns: '48px repeat(7, 1fr)', gap: '4px' }">
              <div></div>
              <div
                v-for="day in heatmapDays"
                :key="day"
                class="text-center text-xs font-medium text-slate-500"
              >
                {{ day }}
              </div>
            </div>
            <!-- Heatmap rows -->
            <div
              v-for="(row, rowIndex) in heatmapData"
              :key="rowIndex"
              class="mb-1 grid"
              :style="{ gridTemplateColumns: '48px repeat(7, 1fr)', gap: '4px' }"
            >
              <div class="flex items-center text-xs text-neutral-400">{{ heatmapHours[rowIndex] }}</div>
              <div
                v-for="(cell, colIndex) in row"
                :key="colIndex"
                class="h-8 rounded-md transition-colors"
                :class="getHeatmapColor(cell)"
                :title="`${heatmapDays[colIndex]} ${heatmapHours[rowIndex]} — ${cell}%`"
              ></div>
            </div>
            <!-- Legend -->
            <div class="mt-3 flex items-center justify-between">
              <span class="text-xs text-neutral-400">0%</span>
              <div class="flex gap-1">
                <div class="h-3 w-8 rounded bg-primitive-orange-100"></div>
                <div class="h-3 w-8 rounded bg-primitive-orange-200"></div>
                <div class="h-3 w-8 rounded bg-primitive-orange-300"></div>
                <div class="h-3 w-8 rounded bg-primitive-orange-400"></div>
                <div class="h-3 w-8 rounded bg-primitive-orange-500"></div>
              </div>
              <span class="text-xs text-neutral-400">100%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Actividad reciente -->
      <div class="rounded-2xl border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Actividad reciente</h2>
            <p class="text-xs text-neutral-400">Eventos que han ocurrido en el último día</p>
          </div>
          <button class="text-sm font-medium text-primitive-orange-500 hover:text-primitive-orange-600">
            Ver todo
          </button>
        </div>
        <div class="divide-y divide-slate-50 px-6">
          <div
            v-for="(activity, index) in recentActivity"
            :key="index"
            class="flex gap-3 py-4"
          >
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              :class="activity.iconColor"
            >
              <i :class="activity.icon" class="text-sm"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-slate-700" v-html="activity.text"></p>
              <p class="mt-0.5 text-xs text-neutral-400">{{ activity.time }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
