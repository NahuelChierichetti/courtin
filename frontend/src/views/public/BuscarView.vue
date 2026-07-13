<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import publicService from '@/services/publicService'
import { sportMeta } from '@/utils/turnos'
import { dayjs } from '@/utils/datetime'
import ClubCard from '@/components/public/ClubCard.vue'

const route = useRoute()
const router = useRouter()

// --- Filtros (se inicializan desde la query del home / navbar) ---
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const ciudad = ref(typeof route.query.ciudad === 'string' ? route.query.ciudad : '')
const tipo = ref(typeof route.query.tipo === 'string' ? route.query.tipo : '')
const fecha = ref(
  typeof route.query.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(route.query.fecha)
    ? route.query.fecha
    : dayjs().format('YYYY-MM-DD'),
)
const hora = ref(typeof route.query.hora === 'string' ? route.query.hora : '')

const sortBy = ref('todos')

const clubs = ref([])
const loading = ref(false)
const error = ref('')

const sportChips = [
  { label: 'Todos', value: '' },
  { label: 'Pádel', value: 'padel' },
  { label: 'Fútbol', value: 'futbol' },
  { label: 'Tenis', value: 'tenis' },
  { label: 'Básquet', value: 'basquet' },
  { label: 'Vóley', value: 'voley' },
  { label: 'Hockey', value: 'hockey' },
]

const sortChips = [
  { label: 'Todos', value: 'todos' },
  { label: 'Cercanos', value: 'cercanos' },
  { label: 'Mejor valorados', value: 'valorados' },
  { label: 'Menor precio', value: 'precio' },
]

const sportLabel = computed(() => sportChips.find((s) => s.value === tipo.value)?.label || 'Todos')

const resultsMeta = computed(() => {
  const parts = [fecha.value]
  if (hora.value) parts.push(`desde ${hora.value}`)
  parts.push(sportLabel.value)
  return parts.join(' · ')
})

// Orden en cliente: precio asc y (si hubiera) rating desc. El resto respeta el orden del back.
const sortedClubs = computed(() => {
  const list = [...clubs.value]
  if (sortBy.value === 'precio') {
    return list.sort((a, b) => (a.precioDesde ?? Infinity) - (b.precioDesde ?? Infinity))
  }
  if (sortBy.value === 'valorados') {
    return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  }
  return list
})

let debounce
const fetchClubs = async () => {
  loading.value = true
  error.value = ''
  try {
    clubs.value = await publicService.searchClubs({
      q: q.value.trim() || undefined,
      ciudad: ciudad.value.trim() || undefined,
      tipo: tipo.value || undefined,
      fecha: fecha.value,
      hora: hora.value || undefined,
    })
  } catch (err) {
    console.error(err)
    error.value = 'No se pudieron cargar los complejos. Probá de nuevo.'
    clubs.value = []
  } finally {
    loading.value = false
  }
}

// Sincroniza los filtros con la URL (para poder compartir/volver).
const syncUrl = () => {
  const query = {}
  if (q.value.trim()) query.q = q.value.trim()
  if (ciudad.value.trim()) query.ciudad = ciudad.value.trim()
  if (tipo.value) query.tipo = tipo.value
  if (fecha.value) query.fecha = fecha.value
  if (hora.value) query.hora = hora.value
  router.replace({ query })
}

const scheduleFetch = () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    syncUrl()
    fetchClubs()
  }, 350)
}

// Texto/ubicación: con debounce. Deporte/fecha/hora: inmediato.
watch([q, ciudad], scheduleFetch)
watch([tipo, fecha, hora], () => {
  clearTimeout(debounce)
  syncUrl()
  fetchClubs()
})

const selectSport = (value) => {
  tipo.value = value
}

const goToClub = (club) =>
  router.push({
    name: 'public-club',
    params: { slug: club.slug },
    query: { fecha: fecha.value, ...(hora.value ? { hora: hora.value } : {}) },
  })

onMounted(fetchClubs)
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8">
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
      <!-- Sidebar filtros -->
      <aside class="lg:sticky lg:top-24 lg:self-start">
        <div class="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <div class="flex items-center gap-2.5">
            <i class="icon-[material-symbols--tune] text-primitive-orange-500"></i>
            <h2 class="text-lg font-bold text-primitive-dark-500">Filtros</h2>
          </div>

          <!-- ¿Qué buscás? -->
          <div class="mt-6">
            <label class="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <i class="icon-[material-symbols--search] text-[11px] text-primitive-orange-500"></i> ¿Qué buscás?
            </label>
            <input v-model="q" type="text" placeholder="Cancha o complejo"
              class="mt-2 h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-400" />
          </div>

          <!-- Ubicación -->
          <div class="mt-5">
            <label class="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <i class="icon-[material-symbols--location-on] text-[11px] text-primitive-orange-500"></i> Ubicación
            </label>
            <input v-model="ciudad" type="text" placeholder="Barrio o ciudad"
              class="mt-2 h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-400" />
          </div>

          <!-- Fecha + Hora -->
          <div class="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label class="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                <i class="icon-[material-symbols--calendar-month] text-[11px] text-primitive-orange-500"></i> Fecha
              </label>
              <input v-model="fecha" type="date" :min="dayjs().format('YYYY-MM-DD')"
                class="mt-2 h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-primitive-dark-500 outline-none focus:border-primitive-orange-400" />
            </div>
            <div>
              <label class="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
                <i class="icon-[material-symbols--schedule] text-[11px] text-primitive-orange-500"></i> Hora
              </label>
              <input v-model="hora" type="time"
                class="mt-2 h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-primitive-dark-500 outline-none focus:border-primitive-orange-400" />
            </div>
          </div>

          <!-- Deporte -->
          <div class="mt-5">
            <label class="text-xs font-bold tracking-wide text-slate-500 uppercase">Deporte</label>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="s in sportChips"
                :key="s.value"
                type="button"
                class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer"
                :class="tipo === s.value
                  ? 'bg-primitive-orange-500 text-white'
                  : 'border border-black/[0.08] bg-white text-slate-600 hover:bg-slate-50'"
                @click="selectSport(s.value)"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- Resultados -->
      <section>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-primitive-dark-500">
              {{ sortedClubs.length }} {{ sortedClubs.length === 1 ? 'resultado' : 'resultados' }}
            </h1>
            <p class="mt-1 text-sm text-slate-500">{{ resultsMeta }}</p>
          </div>

          <!-- Orden -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in sortChips"
              :key="s.value"
              type="button"
              class="rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              :class="sortBy === s.value
                ? 'bg-primitive-orange-500 text-white'
                : 'border border-black/[0.08] bg-white text-slate-600 hover:bg-slate-50'"
              @click="sortBy = s.value"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
          <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-slate-300"></i>
          <p class="mt-4 text-sm text-slate-500">Buscando complejos...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="mt-6 rounded-2xl border border-error-100 bg-error-50 p-6 text-center text-sm text-error-600">
          {{ error }}
        </div>

        <!-- Empty -->
        <div v-else-if="!sortedClubs.length" class="flex flex-col items-center justify-center py-24 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <i class="icon-[material-symbols--search] text-2xl text-slate-300"></i>
          </div>
          <h3 class="mt-4 text-lg font-semibold text-primitive-dark-500">No encontramos complejos</h3>
          <p class="mt-2 text-sm text-slate-500">Probá ajustar la zona, el deporte o la hora.</p>
        </div>

        <!-- Grid -->
        <div v-else class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <ClubCard v-for="club in sortedClubs" :key="club._id" :club="club" @select="goToClub" />
        </div>
      </section>
    </div>
  </div>
</template>
