<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Canchas</h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ activeCourtsCount }} canchas activas &middot; {{ deporteCount }} deportes
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex overflow-hidden rounded-lg border border-slate-200">
          <button
            v-for="filter in deporteFilters"
            :key="filter.value"
            class="px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
            :class="
              activeFilter === filter.value
                ? 'bg-primitive-dark-500 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="activeFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>
        <Button
          label="Nueva cancha"
          size="small"
          @click="openNewCourt"
        />
      </div>
    </div>

    <!-- No club selected -->
    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="pi pi-building text-2xl text-slate-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">Sin club seleccionado</h3>
      <p class="mt-2 text-sm text-slate-500">
        Seleccioná un club desde el selector en el encabezado para ver las canchas.
      </p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="pi pi-spin pi-spinner text-3xl text-slate-400"></i>
      <p class="mt-4 text-sm text-slate-500">Cargando canchas...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-error-50">
        <i class="pi pi-exclamation-triangle text-2xl text-error-500"></i>
      </div>
      <p class="mt-4 text-sm text-slate-500">{{ error }}</p>
      <Button label="Reintentar" icon="pi pi-refresh" severity="secondary" size="small" class="mt-4" @click="fetchCourts" />
    </div>

    <!-- Empty state -->
    <div v-else-if="filteredCourts.length === 0 && !loading" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="pi pi-objects-column text-2xl text-slate-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">
        {{ activeFilter === 'todas' ? 'No hay canchas' : 'No hay canchas de ' + deporteLabels[activeFilter] }}
      </h3>
      <p class="mt-2 text-sm text-slate-500">
        {{ activeFilter === 'todas' ? 'Creá tu primera cancha para empezar.' : 'Probá con otro filtro o creá una nueva.' }}
      </p>
      <Button
        v-if="activeFilter === 'todas'"
        label="Nueva cancha"
        size="small"
        class="mt-4"
        @click="openNewCourt"
      />
    </div>

    <!-- Court cards grid -->
    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="court in filteredCourts"
        :key="court._id"
        class="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
        :class="{ 'opacity-50': court.estado === 'inactiva' }"
      >
        <!-- Court illustration -->
        <div class="relative h-40 flex items-center justify-center overflow-hidden" :class="deporteColors[court.tipo].bg">
          <!-- Padel court -->
          <svg v-if="court.tipo === 'padel'" class="h-28 w-36" viewBox="0 0 180 140" fill="none">
            <rect x="10" y="10" width="160" height="120" rx="2" stroke="#334155" stroke-width="2" fill="none" />
            <line x1="90" y1="10" x2="90" y2="130" stroke="#334155" stroke-width="2" />
            <rect x="35" y="10" width="110" height="30" rx="1" stroke="#475569" stroke-width="1.5" fill="none" />
            <rect x="35" y="100" width="110" height="30" rx="1" stroke="#475569" stroke-width="1.5" fill="none" />
            <line x1="10" y1="70" x2="170" y2="70" stroke="#475569" stroke-width="1" stroke-dasharray="4 3" />
          </svg>
          <!-- Tennis court -->
          <svg v-else-if="court.tipo === 'tenis'" class="h-28 w-36" viewBox="0 0 180 140" fill="none">
            <rect x="10" y="10" width="160" height="120" rx="2" stroke="#334155" stroke-width="2" fill="none" />
            <line x1="90" y1="10" x2="90" y2="130" stroke="#334155" stroke-width="2" />
            <rect x="40" y="10" width="100" height="35" rx="1" stroke="#475569" stroke-width="1.5" fill="none" />
            <rect x="40" y="95" width="100" height="35" rx="1" stroke="#475569" stroke-width="1.5" fill="none" />
            <rect x="55" y="10" width="70" height="35" rx="1" stroke="#475569" stroke-width="1" fill="none" />
            <rect x="55" y="95" width="70" height="35" rx="1" stroke="#475569" stroke-width="1" fill="none" />
            <line x1="10" y1="70" x2="170" y2="70" stroke="#475569" stroke-width="1.5" />
          </svg>
          <!-- Football court -->
          <svg v-else-if="court.tipo === 'futbol'" class="h-28 w-36" viewBox="0 0 180 140" fill="none">
            <rect x="10" y="10" width="160" height="120" rx="2" stroke="#334155" stroke-width="2" fill="none" />
            <line x1="90" y1="10" x2="90" y2="130" stroke="#334155" stroke-width="2" />
            <circle cx="90" cy="70" r="20" stroke="#475569" stroke-width="1.5" fill="none" />
            <rect x="10" y="35" width="30" height="70" rx="1" stroke="#475569" stroke-width="1.5" fill="none" />
            <rect x="140" y="35" width="30" height="70" rx="1" stroke="#475569" stroke-width="1.5" fill="none" />
            <rect x="10" y="50" width="15" height="40" rx="1" stroke="#475569" stroke-width="1" fill="none" />
            <rect x="155" y="50" width="15" height="40" rx="1" stroke="#475569" stroke-width="1" fill="none" />
          </svg>

          <!-- Outdoor badge -->
          <div
            v-if="!court.cubierta"
            class="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-sm"
          >
            <i class="pi pi-sun text-[10px] text-amber-300"></i>
            <span class="text-[10px] font-semibold tracking-wider text-white/80 uppercase">Al aire</span>
          </div>
        </div>

        <!-- Court info -->
        <div class="p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-slate-900">{{ court.nombre }}</h3>
            <span
              v-if="deporteColors[court.tipo]"
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="[deporteColors[court.tipo].bg, deporteColors[court.tipo].text]"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="deporteColors[court.tipo].dot"></span>
              {{ deporteLabels[court.tipo] || court.tipo }}
            </span>
          </div>

          <div class="mt-2 flex items-center gap-3 text-xs text-slate-500">
            <span v-if="court.superficie" class="flex items-center gap-1">
              <i class="pi pi-th-large text-[10px]"></i>
              {{ court.superficie }}
            </span>
            <span class="flex items-center gap-1">
              <i class="pi pi-cloud text-[10px]"></i>
              {{ court.cubierta ? 'Cubierta' : 'Descubierta' }}
            </span>
            <span v-if="court.jugadores" class="flex items-center gap-1">
              <i class="pi pi-users text-[10px]"></i>
              F {{ court.jugadores }}
            </span>
          </div>

          <div class="mt-4 flex items-end justify-between">
            <div>
              <p class="text-xl font-bold font-secondary text-slate-900">
                {{ formatPrice(getBasePrice(court)) }}
              </p>
              <p class="text-xs text-slate-400">por hora &middot; tarifa base</p>
            </div>
            <div class="flex items-center gap-1">
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                @click="openEditCourt(court)"
              >
                <i class="pi pi-pencil text-sm"></i>
              </button>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <i class="pi pi-ellipsis-h text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Drawer -->
    <CourtDrawer
      :visible="showDrawer"
      :court="editingCourt"
      :saving="saving"
      :deactivating="deactivating"
      @close="showDrawer = false"
      @save="handleSave"
      @deactivate="handleDeactivate"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import CourtDrawer from '@/components/canchas/CourtDrawer.vue'
import courtService from '@/services/courtService'
import { useAuth } from '@/composables/useAuth'
import { formatCurrency } from '@/utils/datetime'

const { currentClubId, currentClub } = useAuth()
const toast = useToast()

watch(currentClubId, (newId) => {
  if (newId) fetchCourts()
  else courts.value = []
})

const showDrawer = ref(false)
const editingCourt = ref(null)
const activeFilter = ref('todas')
const courts = ref([])
const loading = ref(false)
const error = ref(null)

const deporteFilters = [
  { label: 'Todas', value: 'todas' },
  { label: 'Padel', value: 'padel' },
  { label: 'Tenis', value: 'tenis' },
  { label: 'Futbol', value: 'futbol' },
]

const filteredCourts = computed(() => {
  if (activeFilter.value === 'todas') return courts.value
  return courts.value.filter((c) => c.tipo === activeFilter.value)
})

const deporteCount = computed(() => {
  const tipos = new Set(courts.value.map((c) => c.tipo))
  return tipos.size
})

const activeCourtsCount = computed(() => {
  return courts.value.filter((c) => c.estado === 'activa').length
})

const deporteColors = {
  padel: { bg: 'bg-primitive-blue-100', text: 'text-primitive-blue-600', dot: 'bg-primitive-blue-500' },
  tenis: { bg: 'bg-primitive-orange-100', text: 'text-primitive-orange-600', dot: 'bg-primitive-orange-500' },
  futbol: { bg: 'bg-success-100', text: 'text-success-600', dot: 'bg-success-500' },
}

const deporteLabels = {
  padel: 'Padel',
  tenis: 'Tenis',
  futbol: 'Futbol',
}

const getBasePrice = (court) => {
  if (!court.tarifas || court.tarifas.length === 0) return 0
  return Math.min(...court.tarifas.map((t) => t.precio))
}

const formatPrice = (price) => {
  return formatCurrency(price, currentClub.value?.moneda || 'ARS')
}

const fetchCourts = async () => {
  if (!currentClubId.value) return
  loading.value = true
  error.value = null
  try {
    courts.value = await courtService.getCourts(currentClubId.value)
  } catch (err) {
    error.value = 'Error al cargar las canchas'
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las canchas.', life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(fetchCourts)

const openNewCourt = () => {
  editingCourt.value = null
  showDrawer.value = true
}

const openEditCourt = (court) => {
  editingCourt.value = { ...court, tarifas: court.tarifas.map((t) => ({ ...t })) }
  showDrawer.value = true
}

const saving = ref(false)
const deactivating = ref(false)

const handleSave = async (courtData) => {
  if (!currentClubId.value) return
  const editing = !!courtData._id
  saving.value = true
  try {
    if (editing) {
      await courtService.updateCourt(courtData._id, courtData, currentClubId.value)
    } else {
      await courtService.createCourt(courtData, currentClubId.value)
    }
    showDrawer.value = false
    await fetchCourts()
    toast.add({
      severity: 'success',
      summary: editing ? 'Cancha actualizada' : 'Cancha creada',
      detail: `"${courtData.nombre}" se guardó correctamente.`,
      life: 3000,
    })
  } catch (err) {
    console.error('Error al guardar cancha:', err)
    const detail = err.response?.data?.message || 'No se pudo guardar la cancha.'
    toast.add({ severity: 'error', summary: 'Error al guardar', detail, life: 5000 })
  } finally {
    saving.value = false
  }
}

const handleDeactivate = async (courtId) => {
  if (!currentClubId.value) return
  const court = courts.value.find((c) => c._id === courtId)
  if (!court) return
  const newEstado = court.estado === 'activa' ? 'inactiva' : 'activa'
  deactivating.value = true
  try {
    await courtService.updateCourt(courtId, { estado: newEstado }, currentClubId.value)
    showDrawer.value = false
    await fetchCourts()
    toast.add({
      severity: 'success',
      summary: newEstado === 'activa' ? 'Cancha activada' : 'Cancha desactivada',
      detail: `"${court.nombre}" ahora está ${newEstado}.`,
      life: 3000,
    })
  } catch (err) {
    console.error('Error al cambiar estado:', err)
    const detail = err.response?.data?.message || 'No se pudo cambiar el estado de la cancha.'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  } finally {
    deactivating.value = false
  }
}
</script>