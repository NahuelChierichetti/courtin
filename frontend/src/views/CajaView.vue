<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import cashService from '@/services/cashService'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'
import { categoriaMeta, metodoLabel } from '@/utils/cash'
import CashMovementDrawer from '@/components/caja/CashMovementDrawer.vue'

const { currentClubId, currentClub } = useAuth()
const toast = useToast()

const tz = computed(() => currentClub.value?.timezone || DEFAULT_TZ)
const moneda = computed(() => currentClub.value?.moneda || 'ARS')

const movimientos = ref([])
const resumen = ref({ ingresos: 0, egresos: 0, neto: 0, count: 0, porCategoria: {}, porMetodo: {} })
const loading = ref(false)

const selectedPeriod = ref('hoy')
const periods = [
  { label: 'Hoy', value: 'hoy' },
  { label: '7 días', value: '7dias' },
  { label: 'Este mes', value: 'mes' },
]

const tipoFilter = ref('') // '' | 'ingreso' | 'egreso'
const tipoChips = [
  { label: 'Todos', value: '' },
  { label: 'Ingresos', value: 'ingreso' },
  { label: 'Egresos', value: 'egreso' },
]

const range = computed(() => {
  const now = dayjs().tz(tz.value)
  if (selectedPeriod.value === '7dias') return { desde: now.subtract(6, 'day').startOf('day'), hasta: now.endOf('day') }
  if (selectedPeriod.value === 'mes') return { desde: now.startOf('month'), hasta: now.endOf('day') }
  return { desde: now.startOf('day'), hasta: now.endOf('day') }
})

const periodSubtitle = computed(() => {
  const { desde, hasta } = range.value
  if (selectedPeriod.value === 'hoy') return `Hoy · ${desde.format('DD MMM')}`
  return `${desde.format('DD MMM')} – ${hasta.format('DD MMM')}`
})

const fetchMovements = async () => {
  if (!currentClubId.value) {
    movimientos.value = []
    return
  }
  loading.value = true
  try {
    const { desde, hasta } = range.value
    const data = await cashService.getMovements(currentClubId.value, {
      desde: desde.utc().toISOString(),
      hasta: hasta.utc().toISOString(),
    })
    movimientos.value = data.movimientos
    resumen.value = data.resumen
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los movimientos.', life: 4000 })
    movimientos.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchMovements)
watch([currentClubId, selectedPeriod], fetchMovements)

// Lista mostrada (filtro por tipo en cliente; las tiles reflejan todo el período).
const visibleMovements = computed(() =>
  tipoFilter.value ? movimientos.value.filter((m) => m.tipo === tipoFilter.value) : movimientos.value,
)

// Desglose de ingresos por categoría (barras).
const categoriaBreakdown = computed(() => {
  const entries = Object.entries(resumen.value.porCategoria || {})
  const max = Math.max(1, ...entries.map(([, v]) => v))
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([cat, monto]) => ({ cat, monto, pct: Math.round((monto / max) * 100) }))
})
const metodoBreakdown = computed(() => {
  const entries = Object.entries(resumen.value.porMetodo || {})
  const max = Math.max(1, ...entries.map(([, v]) => v))
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([metodo, monto]) => ({ metodo, monto, pct: Math.round((monto / max) * 100) }))
})

const fmtFecha = (d) => {
  const l = dayjs.utc(d).tz(tz.value)
  return { dia: l.format('DD MMM'), hora: l.format('HH:mm') }
}
const money = (n) => formatCurrency(n, moneda.value)

// --- Drawer ---
const drawerOpen = ref(false)
const saving = ref(false)

const onSave = async (payload) => {
  if (!currentClubId.value) return
  saving.value = true
  try {
    await cashService.createMovement(currentClubId.value, payload)
    drawerOpen.value = false
    await fetchMovements()
    toast.add({ severity: 'success', summary: 'Movimiento registrado', detail: 'La caja se actualizó.', life: 3000 })
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudo registrar el movimiento.'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    saving.value = false
  }
}

const deletingId = ref(null)
const onDelete = async (m) => {
  if (m.origen === 'online') return
  deletingId.value = m._id
  try {
    await cashService.deleteMovement(currentClubId.value, m._id)
    await fetchMovements()
    toast.add({ severity: 'success', summary: 'Movimiento eliminado', life: 2500 })
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudo eliminar.'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 4000 })
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-ink-500">Control de caja</h1>
        <p class="mt-1 text-sm text-stone-500">Ingresos y egresos del complejo · {{ periodSubtitle }}</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex overflow-hidden rounded-full border border-black/[0.06] bg-white shadow-sm">
          <button
            v-for="p in periods"
            :key="p.value"
            class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
            :class="selectedPeriod === p.value ? 'bg-brand-purple-500 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'"
            @click="selectedPeriod = p.value"
          >
            {{ p.label }}
          </button>
        </div>
        <button
          class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-4 py-2.5 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer"
          @click="drawerOpen = true"
        >
          <i class="icon-[material-symbols--add] text-base"></i> Registrar movimiento
        </button>
      </div>
    </div>

    <!-- No club -->
    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--apartment] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-ink-500">Sin club seleccionado</h3>
      <p class="!mt-2 text-sm text-stone-500">Seleccioná un club desde el encabezado para ver la caja.</p>
    </div>

    <template v-else>
      <!-- Tiles -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-success-50 text-success-600">
              <i class="icon-[material-symbols--south-west] text-xl"></i>
            </span>
          </div>
          <p class="mt-4 text-sm font-medium text-stone-500">Ingresos</p>
          <p class="mt-1 text-2xl font-bold font-secondary text-success-600">{{ money(resumen.ingresos) }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-error-50 text-error-600">
              <i class="icon-[material-symbols--north-east] text-xl"></i>
            </span>
          </div>
          <p class="mt-4 text-sm font-medium text-stone-500">Egresos</p>
          <p class="mt-1 text-2xl font-bold font-secondary text-error-600">{{ money(resumen.egresos) }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-500">
              <i class="icon-[material-symbols--account-balance-wallet] text-xl"></i>
            </span>
          </div>
          <p class="mt-4 text-sm font-medium text-stone-500">Balance neto</p>
          <p class="mt-1 text-2xl font-bold font-secondary" :class="resumen.neto >= 0 ? 'text-ink-500' : 'text-error-600'">{{ money(resumen.neto) }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-purple-50 text-brand-purple-500">
              <i class="icon-[material-symbols--receipt-long] text-xl"></i>
            </span>
          </div>
          <p class="mt-4 text-sm font-medium text-stone-500">Movimientos</p>
          <p class="mt-1 text-2xl font-bold font-secondary text-ink-500">{{ resumen.count }}</p>
        </div>
      </div>

      <!-- Breakdowns -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 class="text-base font-semibold text-ink-500">Ingresos por categoría</h2>
          <div v-if="!categoriaBreakdown.length" class="py-6 text-center text-sm text-stone-400">Sin ingresos en el período.</div>
          <div v-else class="mt-4 space-y-3">
            <div v-for="row in categoriaBreakdown" :key="row.cat" class="flex items-center gap-3">
              <span class="flex w-36 items-center gap-2 text-sm text-stone-600">
                <i :class="categoriaMeta(row.cat).icon" class="text-sm text-stone-400"></i>
                <span class="truncate">{{ categoriaMeta(row.cat).label }}</span>
              </span>
              <div class="relative h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div class="absolute inset-y-0 left-0 rounded-full bg-success-500" :style="{ width: row.pct + '%' }"></div>
              </div>
              <span class="w-24 text-right text-sm font-semibold font-secondary text-stone-700">{{ money(row.monto) }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 class="text-base font-semibold text-ink-500">Ingresos por método</h2>
          <div v-if="!metodoBreakdown.length" class="py-6 text-center text-sm text-stone-400">Sin ingresos en el período.</div>
          <div v-else class="mt-4 space-y-3">
            <div v-for="row in metodoBreakdown" :key="row.metodo" class="flex items-center gap-3">
              <span class="w-36 truncate text-sm text-stone-600">{{ metodoLabel(row.metodo) }}</span>
              <div class="relative h-2.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                <div class="absolute inset-y-0 left-0 rounded-full bg-brand-green-500" :style="{ width: row.pct + '%' }"></div>
              </div>
              <span class="w-24 text-right text-sm font-semibold font-secondary text-stone-700">{{ money(row.monto) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Movements -->
      <div class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-6 py-4">
          <h2 class="text-base font-semibold text-ink-500">Movimientos</h2>
          <div class="flex overflow-hidden rounded-full border border-black/[0.06]">
            <button
              v-for="t in tipoChips"
              :key="t.value"
              class="px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              :class="tipoFilter === t.value ? 'bg-brand-purple-500 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'"
              @click="tipoFilter = t.value"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
          <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i>
        </div>

        <!-- Empty -->
        <div v-else-if="!visibleMovements.length" class="flex flex-col items-center justify-center py-16 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
            <i class="icon-[material-symbols--point-of-sale] text-xl text-stone-400"></i>
          </div>
          <h3 class="mt-4 text-sm font-semibold text-ink-500">Sin movimientos</h3>
          <p class="mt-1 text-xs text-stone-500">Registrá ingresos y egresos para llevar el control de caja.</p>
        </div>

        <!-- List -->
        <div v-else class="divide-y divide-black/[0.05]">
          <div v-for="m in visibleMovements" :key="m._id" class="group flex items-center gap-4 px-6 py-3.5">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="m.tipo === 'ingreso' ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600'"
            >
              <i :class="categoriaMeta(m.categoria).icon" class="text-base"></i>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium text-ink-500">
                  {{ m.concepto || categoriaMeta(m.categoria).label }}
                </p>
                <span v-if="m.origen === 'online'" class="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-purple-50 px-2 py-0.5 text-[10px] font-semibold text-brand-purple-600">
                  <i class="icon-[material-symbols--bolt] text-[10px]"></i> Online
                </span>
              </div>
              <p class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-400">
                <span>{{ categoriaMeta(m.categoria).label }}</span>
                <span>·</span>
                <span>{{ metodoLabel(m.metodoPago) }}</span>
                <span>·</span>
                <span>{{ fmtFecha(m.fecha).dia }} {{ fmtFecha(m.fecha).hora }}</span>
              </p>
            </div>
            <span
              class="shrink-0 text-sm font-bold font-secondary"
              :class="m.tipo === 'ingreso' ? 'text-success-600' : 'text-error-600'"
            >
              {{ m.tipo === 'ingreso' ? '+' : '−' }} {{ money(m.monto) }}
            </span>
            <button
              v-if="m.origen !== 'online'"
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-300 opacity-0 transition-all hover:bg-error-50 hover:text-error-500 cursor-pointer group-hover:opacity-100 disabled:opacity-50"
              :disabled="deletingId === m._id"
              title="Eliminar"
              @click="onDelete(m)"
            >
              <i :class="deletingId === m._id ? 'icon-[material-symbols--progress-activity] animate-spin' : 'icon-[material-symbols--delete]'" class="text-sm"></i>
            </button>
            <span v-else class="h-8 w-8 shrink-0"></span>
          </div>
        </div>
      </div>
    </template>

    <CashMovementDrawer :visible="drawerOpen" :saving="saving" @close="drawerOpen = false" @save="onSave" />
  </div>
</template>
