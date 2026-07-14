<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'
import statsService from '@/services/statsService'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'
import { sportMeta } from '@/utils/turnos'
import { metodoLabel } from '@/utils/cash'
import AreaLineChart from '@/components/reportes/AreaLineChart.vue'
import DonutChart from '@/components/reportes/DonutChart.vue'

const { currentClubId, currentClub } = useAuth()

const tz = computed(() => currentClub.value?.timezone || DEFAULT_TZ)
const moneda = computed(() => currentClub.value?.moneda || 'ARS')
const money = (n) => formatCurrency(n, moneda.value)
const moneyShort = (n) => {
  if (n >= 1000000) return '$' + Math.round(n / 100000) / 10 + 'M'
  if (n >= 1000) return '$' + Math.round(n / 1000) + 'k'
  return '$' + n
}

const period = ref('mes')
const periods = [
  { label: 'Este mes', value: 'mes' },
  { label: 'Mes pasado', value: 'mespasado' },
  { label: '90 días', value: '90dias' },
]

const deporte = ref('')
const deporteChips = [
  { label: 'Todos', value: '' },
  { label: 'Pádel', value: 'padel' },
  { label: 'Tenis', value: 'tenis' },
  { label: 'Fútbol', value: 'futbol' },
]

// Rango personalizado (por defecto, el mes en curso).
const customDesde = ref(dayjs().startOf('month').format('YYYY-MM-DD'))
const customHasta = ref(dayjs().format('YYYY-MM-DD'))
const onCustomDate = () => { period.value = 'custom' }

// Rango de un preset.
const presetRange = (value) => {
  const now = dayjs().tz(tz.value)
  if (value === 'mespasado') {
    const start = now.subtract(1, 'month').startOf('month')
    return { desde: start, hasta: start.endOf('month') }
  }
  if (value === '90dias') return { desde: now.subtract(89, 'day').startOf('day'), hasta: now.endOf('day') }
  return { desde: now.startOf('month'), hasta: now.endOf('day') }
}

const range = computed(() => {
  if (period.value === 'custom') {
    return {
      desde: dayjs.tz(customDesde.value, 'YYYY-MM-DD', tz.value).startOf('day'),
      hasta: dayjs.tz(customHasta.value, 'YYYY-MM-DD', tz.value).endOf('day'),
    }
  }
  return presetRange(period.value)
})

// Elegir un preset sincroniza los inputs de fecha (sin marcarlos como custom).
const selectPreset = (value) => {
  const r = presetRange(value)
  customDesde.value = r.desde.format('YYYY-MM-DD')
  customHasta.value = r.hasta.format('YYYY-MM-DD')
  period.value = value
}

const data = ref(null)
const loading = ref(false)

const fetchReports = async () => {
  if (!currentClubId.value) {
    data.value = null
    return
  }
  loading.value = true
  try {
    const { desde, hasta } = range.value
    data.value = await statsService.getReports(currentClubId.value, {
      desde: desde.utc().toISOString(),
      hasta: hasta.utc().toISOString(),
      deporte: deporte.value || undefined,
    })
  } catch (err) {
    console.error(err)
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(fetchReports)
watch([currentClubId, period, customDesde, customHasta, deporte], fetchReports)

const kpis = computed(() => data.value?.kpis || { ingresos: 0, reservas: 0, ocupacion: 0, ticketPromedio: 0, clientesNuevos: 0 })

// Ingresos por día → barras verticales.
const ingresosPorDia = computed(() => data.value?.ingresosPorDia || [])
const maxDia = computed(() => Math.max(1, ...ingresosPorDia.value.map((d) => d.monto)))
const diaLabelStep = computed(() => Math.max(1, Math.ceil(ingresosPorDia.value.length / 8)))
const totalIngresosDia = computed(() => ingresosPorDia.value.reduce((a, d) => a + d.monto, 0))

const reservasPorDeporte = computed(() => data.value?.reservasPorDeporte || [])

// Paleta categórica de deportes (validada: CVD ΔE 27, con etiquetas directas).
const SPORT_HEX = { padel: '#1565e6', tenis: '#ff6a00', futbol: '#12b76a' }
const sportColor = (t) => SPORT_HEX[t] || '#94a3b8'
const linePoints = computed(() => ingresosPorDia.value.map((d) => ({ label: dayjs(d.dia).format('DD/MM'), value: d.monto })))
const deporteSegments = computed(() =>
  reservasPorDeporte.value.map((d) => ({ label: sportMeta(d.tipo).label, value: d.count, color: sportColor(d.tipo) })),
)

const ingresosPorMetodo = computed(() => data.value?.ingresosPorMetodo || [])
const METODO_HEX = { efectivo: '#12b76a', mercadopago: '#1565e6', tarjeta: '#ff6a00', transferencia: '#7c3aed', otro: '#94a3b8' }
const metodoSegments = computed(() =>
  ingresosPorMetodo.value.map((d) => ({ label: metodoLabel(d.metodo), value: d.monto, color: METODO_HEX[d.metodo] || '#94a3b8' })),
)

const topCanchas = computed(() => data.value?.topCanchas || [])
const topClientes = computed(() => data.value?.topClientes || [])

const initials = (n) => (n || '?').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
const fmtDia = (d) => dayjs(d).format('DD')

const deporteLabel = computed(() => deporteChips.find((c) => c.value === deporte.value)?.label || 'Todos')
const printSubtitle = computed(() => {
  const { desde, hasta } = range.value
  return `${desde.format('DD/MM/YYYY')} – ${hasta.format('DD/MM/YYYY')} · ${deporteLabel.value}`
})
const exportPdf = () => window.print()

// --- Exportar CSV ---
const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const exportCsv = () => {
  const d = data.value
  if (!d) return
  const { desde, hasta } = range.value
  const rows = [
    ['Reporte', currentClub.value?.nombre || ''],
    ['Rango', desde.format('YYYY-MM-DD'), hasta.format('YYYY-MM-DD')],
    [],
    ['Resumen'],
    ['Ingresos', d.kpis.ingresos],
    ['Reservas', d.kpis.reservas],
    ['Ocupación %', d.kpis.ocupacion],
    ['Ticket promedio', d.kpis.ticketPromedio],
    ['Clientes nuevos', d.kpis.clientesNuevos],
    [],
    ['Ingresos por día', 'Fecha', 'Monto'],
    ...d.ingresosPorDia.map((x) => ['', x.dia, x.monto]),
    [],
    ['Reservas por deporte', 'Deporte', 'Reservas'],
    ...d.reservasPorDeporte.map((x) => ['', sportMeta(x.tipo).label, x.count]),
    [],
    ['Ingresos por método', 'Método', 'Monto'],
    ...d.ingresosPorMetodo.map((x) => ['', metodoLabel(x.metodo), x.monto]),
    [],
    ['Canchas más reservadas', 'Cancha', 'Reservas', 'Ingresos'],
    ...d.topCanchas.map((x) => ['', x.nombre, x.reservas, x.ingresos]),
    [],
    ['Mejores clientes', 'Cliente', 'Reservas', 'Gastado'],
    ...d.topClientes.map((x) => ['', x.nombre, x.reservas, x.gastado]),
  ]
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte-${desde.format('YYYYMMDD')}-${hasta.format('YYYYMMDD')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-primitive-dark-500">Reportes</h1>
        <p class="mt-1 text-sm text-slate-500 print:hidden">Métricas reales de ingresos, reservas y ocupación.</p>
        <p class="mt-1 hidden text-sm text-slate-500 print:block">{{ currentClub?.nombre }} · {{ printSubtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 print:hidden">
        <!-- Rango personalizado -->
        <div class="flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white px-3 py-1.5 shadow-sm">
          <input v-model="customDesde" type="date" :max="customHasta" class="bg-transparent text-xs text-primitive-dark-500 outline-none [color-scheme:light]" @change="onCustomDate" />
          <i class="icon-[material-symbols--arrow-forward] text-xs text-slate-300"></i>
          <input v-model="customHasta" type="date" :min="customDesde" class="bg-transparent text-xs text-primitive-dark-500 outline-none [color-scheme:light]" @change="onCustomDate" />
        </div>
        <!-- Presets -->
        <div class="flex overflow-hidden rounded-full border border-black/[0.06] bg-white shadow-sm">
          <button
            v-for="p in periods"
            :key="p.value"
            class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
            :class="period === p.value ? 'bg-primitive-dark-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
            @click="selectPreset(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
        <!-- Exportar -->
        <button
          class="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          :disabled="!data"
          @click="exportCsv"
        >
          <i class="icon-[material-symbols--download] text-base text-primitive-orange-500"></i> CSV
        </button>
        <button
          class="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer disabled:opacity-50"
          :disabled="!data"
          @click="exportPdf"
        >
          <i class="icon-[material-symbols--picture-as-pdf] text-base text-primitive-orange-500"></i> PDF
        </button>
      </div>
    </div>

    <!-- Filtro por deporte -->
    <div v-if="currentClubId" class="flex flex-wrap items-center gap-2 print:hidden">
      <span class="mr-1 text-sm font-medium text-slate-500">Deporte:</span>
      <button
        v-for="c in deporteChips"
        :key="c.value"
        class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer"
        :class="deporte === c.value ? 'bg-primitive-orange-500 text-white' : 'border border-black/[0.06] bg-white text-slate-600 hover:bg-slate-50'"
        @click="deporte = c.value"
      >
        {{ c.label }}
      </button>
    </div>

    <!-- No club -->
    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="icon-[material-symbols--apartment] text-2xl text-neutral-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-primitive-dark-500">Sin club seleccionado</h3>
    </div>

    <template v-else>
      <!-- KPIs -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 text-success-600"><i class="icon-[material-symbols--payments] text-lg"></i></span>
          <p class="mt-3 text-xs font-medium text-slate-500">Ingresos</p>
          <p class="mt-0.5 text-2xl font-bold font-secondary text-success-600">{{ money(kpis.ingresos) }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primitive-blue-50 text-primitive-blue-500"><i class="icon-[material-symbols--calendar-month] text-lg"></i></span>
          <p class="mt-3 text-xs font-medium text-slate-500">Reservas</p>
          <p class="mt-0.5 text-2xl font-bold font-secondary text-primitive-dark-500">{{ kpis.reservas }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primitive-orange-50 text-primitive-orange-500"><i class="icon-[material-symbols--pie-chart] text-lg"></i></span>
          <p class="mt-3 text-xs font-medium text-slate-500">Ocupación</p>
          <p class="mt-0.5 text-2xl font-bold font-secondary text-primitive-dark-500">{{ kpis.ocupacion }}%</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-primitive-orange-50 text-primitive-orange-500"><i class="icon-[material-symbols--receipt-long] text-lg"></i></span>
          <p class="mt-3 text-xs font-medium text-slate-500">Ticket promedio</p>
          <p class="mt-0.5 text-2xl font-bold font-secondary text-primitive-dark-500">{{ money(kpis.ticketPromedio) }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-500"><i class="icon-[material-symbols--person-add] text-lg"></i></span>
          <p class="mt-3 text-xs font-medium text-slate-500">Clientes nuevos</p>
          <p class="mt-0.5 text-2xl font-bold font-secondary text-primitive-dark-500">{{ kpis.clientesNuevos }}</p>
        </div>
      </div>

      <!-- Ingresos por día -->
      <div class="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-primitive-dark-500">Ingresos por día</h2>
          <span class="text-sm text-slate-500">Total: <span class="font-semibold text-slate-700">{{ money(totalIngresosDia) }}</span></span>
        </div>
        <div v-if="loading" class="flex items-center justify-center py-16"><i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-slate-300"></i></div>
        <div v-else-if="!ingresosPorDia.length" class="py-12 text-center text-sm text-slate-400">Sin datos en el período.</div>
        <div v-else class="mt-4">
          <AreaLineChart :points="linePoints" :format="money" :label-step="diaLabelStep" />
        </div>
      </div>

      <!-- Deporte + Método -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div v-if="!deporte" class="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 class="text-base font-semibold text-primitive-dark-500">Reservas por deporte</h2>
          <div v-if="!reservasPorDeporte.length" class="py-8 text-center text-sm text-slate-400">Sin reservas.</div>
          <div v-else class="mt-5">
            <DonutChart :segments="deporteSegments" center-label="reservas" />
          </div>
        </div>

        <div class="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 class="text-base font-semibold text-primitive-dark-500">Ingresos por método</h2>
          <div v-if="!ingresosPorMetodo.length" class="py-8 text-center text-sm text-slate-400">Sin ingresos.</div>
          <div v-else class="mt-5">
            <DonutChart :segments="metodoSegments" center-label="ingresos" :format="money" :center-format="moneyShort" />
          </div>
        </div>
      </div>

      <!-- Top canchas + Top clientes -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 class="text-base font-semibold text-primitive-dark-500">Canchas más reservadas</h2>
          <div v-if="!topCanchas.length" class="py-8 text-center text-sm text-slate-400">Sin datos.</div>
          <div v-else class="mt-4 space-y-1">
            <div v-for="(c, i) in topCanchas" :key="i" class="flex items-center gap-3 py-2">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{{ i + 1 }}</span>
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="sportMeta(c.tipo).bg"><span class="h-2 w-2 rounded-full" :class="sportMeta(c.tipo).dot"></span></span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-primitive-dark-500">{{ c.nombre }}</p>
                <p class="text-xs text-neutral-400">{{ c.reservas }} reservas</p>
              </div>
              <span class="text-sm font-semibold font-secondary text-slate-700">{{ money(c.ingresos) }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 class="text-base font-semibold text-primitive-dark-500">Mejores clientes</h2>
          <div v-if="!topClientes.length" class="py-8 text-center text-sm text-slate-400">Sin datos.</div>
          <div v-else class="mt-4 space-y-1">
            <div v-for="(c, i) in topClientes" :key="i" class="flex items-center gap-3 py-2">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{{ i + 1 }}</span>
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primitive-orange-100 text-xs font-bold text-primitive-orange-600">{{ initials(c.nombre) }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-primitive-dark-500">{{ c.nombre }}</p>
                <p class="text-xs text-neutral-400">{{ c.reservas }} reservas</p>
              </div>
              <span class="text-sm font-semibold font-secondary text-success-600">{{ money(c.gastado) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
