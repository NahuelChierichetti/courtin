<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import clientService from '@/services/clientService'
import { dayjs, formatCurrency, formatInTz, DEFAULT_TZ } from '@/utils/datetime'
import ClientDetailDrawer from '@/components/clientes/ClientDetailDrawer.vue'

const { currentClubId, currentClub } = useAuth()
const toast = useToast()

const tz = computed(() => currentClub.value?.timezone || DEFAULT_TZ)
const moneda = computed(() => currentClub.value?.moneda || 'ARS')

const clients = ref([])
const resumen = ref({ total: 0, reservasTotales: 0, ingresosTotales: 0, recurrentes: 0 })
const loading = ref(false)

const search = ref('')
const sortBy = ref('recientes')
const sortChips = [
  { label: 'Recientes', value: 'recientes' },
  { label: 'Más reservas', value: 'reservas' },
  { label: 'Mayor gasto', value: 'gasto' },
]

const fetchClients = async () => {
  if (!currentClubId.value) {
    clients.value = []
    return
  }
  loading.value = true
  try {
    const data = await clientService.getClients(currentClubId.value)
    clients.value = data.clients
    resumen.value = data.resumen
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los clientes.', life: 4000 })
    clients.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchClients)
watch(currentClubId, fetchClients)

const nuevosMes = computed(() => {
  const start = dayjs().tz(tz.value).startOf('month')
  return clients.value.filter((c) => c.primeraReserva && dayjs.utc(c.primeraReserva).tz(tz.value).isAfter(start)).length
})

const visibleClients = computed(() => {
  let list = [...clients.value]
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (c) =>
        (c.nombre || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.telefono || '').toLowerCase().includes(q),
    )
  }
  if (sortBy.value === 'reservas') list.sort((a, b) => b.reservasCount - a.reservasCount)
  else if (sortBy.value === 'gasto') list.sort((a, b) => b.totalGastado - a.totalGastado)
  return list
})

const money = (n) => formatCurrency(n, moneda.value)
const fmtDate = (d) => (d ? formatInTz(d, tz.value, 'DD MMM YYYY') : '—')
const initials = (c) => {
  const n = c.nombre || c.email || '?'
  return n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
}

// --- Detalle ---
const drawerOpen = ref(false)
const selected = ref(null)
const openClient = (c) => {
  selected.value = c
  drawerOpen.value = true
}
const onUpdated = (updated) => {
  const i = clients.value.findIndex((c) => c._id === updated._id)
  if (i >= 0) clients.value[i] = { ...clients.value[i], ...updated }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-brand-green-900 sm:text-2xl">Clientes</h1>
        <p class="mt-1 text-sm text-stone-500">Se registran automáticamente al reservar (identificados por email).</p>
      </div>
    </div>

    <!-- No club -->
    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--apartment] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-brand-green-900">Sin club seleccionado</h3>
      <p class="!mt-2 text-sm text-stone-500">Seleccioná un club desde el encabezado para ver los clientes.</p>
    </div>

    <template v-else>
      <!-- Tiles -->
      <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 bg-brand-green-50 text-brand-green-500"><i class="icon-[material-symbols--group] text-xl"></i></span>
          <p class="mt-3 text-xs font-medium text-stone-500 sm:mt-4 sm:text-sm">Total clientes</p>
          <p class="mt-1 truncate text-xl font-bold font-secondary text-brand-green-900 sm:text-2xl">{{ resumen.total }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 bg-success-50 text-success-600"><i class="icon-[material-symbols--person-add] text-xl"></i></span>
          <p class="mt-3 text-xs font-medium text-stone-500 sm:mt-4 sm:text-sm">Nuevos este mes</p>
          <p class="mt-1 truncate text-xl font-bold font-secondary text-brand-green-900 sm:text-2xl">{{ nuevosMes }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 bg-brand-purple-50 text-brand-purple-500"><i class="icon-[material-symbols--repeat] text-xl"></i></span>
          <p class="mt-3 text-xs font-medium text-stone-500 sm:mt-4 sm:text-sm">Recurrentes</p>
          <p class="mt-1 truncate text-xl font-bold font-secondary text-brand-green-900 sm:text-2xl">{{ resumen.recurrentes }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 bg-brand-green-50 text-brand-green-500"><i class="icon-[material-symbols--calendar-month] text-xl"></i></span>
          <p class="mt-3 text-xs font-medium text-stone-500 sm:mt-4 sm:text-sm">Reservas totales</p>
          <p class="mt-1 truncate text-xl font-bold font-secondary text-brand-green-900 sm:text-2xl">{{ resumen.reservasTotales }}</p>
        </div>
      </div>

      <!-- Lista -->
      <div class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-4 sm:px-6">
          <div class="relative w-full max-w-xs">
            <i class="icon-[material-symbols--search] absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400"></i>
            <input
              v-model="search"
              type="text"
              placeholder="Buscar por nombre, email o teléfono"
              class="h-10 w-full rounded-full border border-black/[0.08] bg-white pl-10 pr-4 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
            />
          </div>
          <div class="flex shrink-0 overflow-hidden rounded-full border border-black/[0.06]">
            <button
              v-for="s in sortChips"
              :key="s.value"
              class="px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer sm:px-3.5"
              :class="sortBy === s.value ? 'bg-brand-purple-500 text-white' : 'bg-white text-stone-600 hover:bg-stone-50'"
              @click="sortBy = s.value"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-16">
          <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i>
        </div>

        <!-- Empty -->
        <div v-else-if="!visibleClients.length" class="flex flex-col items-center justify-center py-16 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
            <i class="icon-[material-symbols--group] text-xl text-stone-400"></i>
          </div>
          <h3 class="mt-4 text-sm font-semibold text-brand-green-900">{{ search ? 'Sin resultados' : 'Todavía no hay clientes' }}</h3>
          <p class="mt-1 text-xs text-stone-500">{{ search ? 'Probá con otro término.' : 'Se registran automáticamente cuando alguien reserva.' }}</p>
        </div>

        <!-- Rows -->
        <div v-else>
          <!-- Encabezado (desktop) -->
          <div class="hidden grid-cols-[1fr_110px_130px_130px] gap-4 border-b border-black/[0.05] px-4 py-2.5 text-xs font-semibold sm:px-6 tracking-wide text-stone-400 uppercase sm:grid">
            <span>Cliente</span>
            <span class="text-center">Reservas</span>
            <span class="text-right">Total gastado</span>
            <span class="text-right">Última reserva</span>
          </div>
          <div class="divide-y divide-black/[0.05]">
            <button
              v-for="c in visibleClients"
              :key="c._id"
              class="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-left sm:gap-4 sm:px-6 transition-colors hover:bg-stone-50 cursor-pointer sm:grid-cols-[1fr_110px_130px_130px]"
              @click="openClient(c)"
            >
              <div class="flex min-w-0 items-center gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green-100 text-xs font-bold text-brand-green-600">{{ initials(c) }}</span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-brand-green-900">{{ c.nombre || 'Sin nombre' }}</p>
                  <p class="truncate text-xs text-stone-400">{{ c.email }}</p>
                </div>
              </div>
              <span class="hidden text-center text-sm font-semibold font-secondary text-stone-700 sm:block">{{ c.reservasCount }}</span>
              <span class="hidden text-right text-sm font-semibold font-secondary text-stone-700 sm:block">{{ money(c.totalGastado) }}</span>
              <span class="hidden text-right text-xs text-stone-500 sm:block">{{ fmtDate(c.ultimaReserva) }}</span>
              <i class="icon-[material-symbols--chevron-right] text-stone-300 sm:hidden"></i>
            </button>
          </div>
        </div>
      </div>
    </template>

    <ClientDetailDrawer
      :visible="drawerOpen"
      :client-id="selected?._id"
      :initial-client="selected"
      @close="drawerOpen = false"
      @updated="onUpdated"
    />
  </div>
</template>
