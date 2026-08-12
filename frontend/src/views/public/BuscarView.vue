<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import publicService from '@/services/publicService'
import { PUBLIC_SPORTS, sportMeta } from '@/utils/sports'
import { dayjs } from '@/utils/datetime'
import ClubCard from '@/components/public/ClubCard.vue'
import NameField from '@/components/public/search/NameField.vue'
import CityField from '@/components/public/search/CityField.vue'
import SportField from '@/components/public/search/SportField.vue'
import DateField from '@/components/public/search/DateField.vue'
import TimeField from '@/components/public/search/TimeField.vue'

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
const horaDesde = ref(typeof route.query.hora === 'string' ? route.query.hora : '')
const horaHasta = ref(typeof route.query.horaHasta === 'string' ? route.query.horaHasta : '')

const sortBy = ref('todos')

const clubs = ref([])
const loading = ref(false)
const error = ref('')

// Los deportes de la plataforma, no una lista suelta: antes ofrecía vóley y
// hockey, que ningún complejo tiene, y filtrar por ellos no daba resultados.
const sportChips = [
  { label: 'Todos', value: '' },
  ...PUBLIC_SPORTS.map((s) => ({ label: s.label, value: s.key })),
]

// Sólo los órdenes que hoy tienen con qué ordenar. "Cercanos" necesita
// geolocalización y "Mejor valorados" un rating que todavía no existe en el
// modelo: se veían activos y no cambiaban nada.
const sortChips = [
  { label: 'Todos', value: 'todos' },
  { label: 'Menor precio', value: 'precio' },
]

const sportLabel = computed(() => (tipo.value ? sportMeta(tipo.value).label : 'Todos'))

// Etiqueta legible de la franja elegida, para el resumen y el chip.
const FRANJA_LABELS = {
  '06:00|11:59': 'Mañana',
  '12:00|17:59': 'Tarde',
  '18:00|23:59': 'Noche',
}
const horaLabel = computed(() => {
  if (!horaDesde.value) return ''
  return FRANJA_LABELS[`${horaDesde.value}|${horaHasta.value}`] || `desde ${horaDesde.value}`
})

const fechaLabel = computed(() => {
  const d = dayjs(fecha.value)
  const dias = d.startOf('day').diff(dayjs().startOf('day'), 'day')
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  const texto = d.format('ddd D [de] MMM')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

const resultsMeta = computed(() => {
  const parts = [fechaLabel.value]
  if (horaLabel.value) parts.push(horaLabel.value)
  parts.push(sportLabel.value)
  if (ciudad.value) parts.push(ciudad.value)
  return parts.join(' · ')
})

// Chips de lo que está filtrando ahora mismo, cada uno con su cruz. Sin esto,
// una búsqueda vacía deja al jugador sin saber cuál de los cinco filtros la
// dejó así.
const activeFilters = computed(() => {
  const chips = []
  if (q.value.trim()) chips.push({ key: 'q', label: `"${q.value.trim()}"` })
  if (ciudad.value) chips.push({ key: 'ciudad', label: ciudad.value })
  if (tipo.value) chips.push({ key: 'tipo', label: sportLabel.value })
  if (horaDesde.value) chips.push({ key: 'hora', label: horaLabel.value })
  return chips
})

const hayFiltros = computed(() => activeFilters.value.length > 0)

const clearFilter = (key) => {
  if (key === 'q') q.value = ''
  if (key === 'ciudad') ciudad.value = ''
  if (key === 'tipo') tipo.value = ''
  if (key === 'hora') {
    horaDesde.value = ''
    horaHasta.value = ''
  }
}

// La fecha no se limpia: siempre hay un día en juego, y sin fecha el resumen
// quedaría hablando de una disponibilidad que no se está consultando.
const limpiarFiltros = () => {
  q.value = ''
  ciudad.value = ''
  tipo.value = ''
  horaDesde.value = ''
  horaHasta.value = ''
}

// Orden en cliente por precio ascendente. "Todos" respeta el orden del back
// (alfabético por nombre).
const sortedClubs = computed(() => {
  const list = [...clubs.value]
  if (sortBy.value === 'precio') {
    return list.sort((a, b) => (a.precioDesde ?? Infinity) - (b.precioDesde ?? Infinity))
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
      ciudad: ciudad.value || undefined,
      tipo: tipo.value || undefined,
      fecha: fecha.value,
      hora: horaDesde.value || undefined,
      horaHasta: horaHasta.value || undefined,
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
  if (ciudad.value) query.ciudad = ciudad.value
  if (tipo.value) query.tipo = tipo.value
  if (fecha.value) query.fecha = fecha.value
  if (horaDesde.value) query.hora = horaDesde.value
  if (horaHasta.value) query.horaHasta = horaHasta.value
  router.replace({ query })
}

const scheduleFetch = () => {
  clearTimeout(debounce)
  debounce = setTimeout(() => {
    syncUrl()
    fetchClubs()
  }, 350)
}

// El nombre se escribe letra por letra, así que va con debounce. El resto son
// selecciones puntuales: se aplican al toque.
watch(q, scheduleFetch)
watch([ciudad, tipo, fecha, horaDesde, horaHasta], () => {
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
    query: { fecha: fecha.value, ...(horaDesde.value ? { hora: horaDesde.value } : {}) },
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
            <i class="icon-[material-symbols--tune] text-brand-green-500"></i>
            <h2 class="text-lg font-bold text-ink-500">Filtros</h2>
          </div>

          <!--
            Los mismos campos del buscador de la home, apilados. Reusarlos evita
            que el mismo filtro se comporte distinto según desde dónde se llegue.
          -->
          <div class="mt-5 divide-y divide-black/[0.06] rounded-2xl border border-black/[0.06]">
            <div class="p-1"><NameField v-model="q" /></div>
            <div class="p-1"><CityField v-model="ciudad" /></div>
            <div class="p-1"><SportField v-model="tipo" /></div>
            <div class="p-1"><DateField v-model="fecha" /></div>
            <div class="p-1">
              <TimeField
                :desde="horaDesde"
                :hasta="horaHasta"
                @update:desde="horaDesde = $event"
                @update:hasta="horaHasta = $event"
              />
            </div>
          </div>

          <!-- Deporte también como chips: en la barra lateral hay lugar, y un
               toque es más rápido que abrir el selector. -->
          <div class="mt-5">
            <label class="text-xs font-bold tracking-wide text-stone-500 uppercase">Acceso rápido</label>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="s in sportChips"
                :key="s.value"
                type="button"
                class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer"
                :class="tipo === s.value
                  ? 'bg-brand-green-500 text-white'
                  : 'border border-black/[0.08] bg-white text-stone-600 hover:bg-stone-50'"
                @click="selectSport(s.value)"
              >
                {{ s.label }}
              </button>
            </div>
          </div>

          <button
            v-if="hayFiltros"
            type="button"
            class="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-black/[0.08] py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50 cursor-pointer"
            @click="limpiarFiltros"
          >
            <i class="icon-[material-symbols--refresh] text-sm"></i>
            Limpiar filtros
          </button>
        </div>
      </aside>

      <!-- Resultados -->
      <section>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-ink-500">
              {{ sortedClubs.length }} {{ sortedClubs.length === 1 ? 'resultado' : 'resultados' }}
            </h1>
            <p class="mt-1 text-sm text-stone-500">{{ resultsMeta }}</p>
          </div>

          <!-- Orden -->
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in sortChips"
              :key="s.value"
              type="button"
              class="rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
              :class="sortBy === s.value
                ? 'bg-brand-green-500 text-white'
                : 'border border-black/[0.08] bg-white text-stone-600 hover:bg-stone-50'"
              @click="sortBy = s.value"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- Filtros activos -->
        <div v-if="activeFilters.length" class="mt-4 flex flex-wrap items-center gap-2">
          <span
            v-for="f in activeFilters"
            :key="f.key"
            class="inline-flex items-center gap-1.5 rounded-full bg-brand-green-50 py-1 pl-3 pr-1.5 text-xs font-semibold text-brand-green-700"
          >
            {{ f.label }}
            <button
              type="button"
              class="flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-brand-green-100 cursor-pointer"
              :aria-label="`Quitar filtro ${f.label}`"
              @click="clearFilter(f.key)"
            >
              <i class="icon-[material-symbols--close] text-xs"></i>
            </button>
          </span>
          <button
            type="button"
            class="text-xs font-semibold text-stone-500 underline underline-offset-2 transition-colors hover:text-stone-700 cursor-pointer"
            @click="limpiarFiltros"
          >
            Limpiar todo
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
          <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-stone-300"></i>
          <p class="mt-4 text-sm text-stone-500">Buscando complejos...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="mt-6 rounded-2xl border border-error-100 bg-error-50 p-6 text-center text-sm text-error-600">
          {{ error }}
        </div>

        <!-- Empty -->
        <div v-else-if="!sortedClubs.length" class="flex flex-col items-center justify-center py-24 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <i class="icon-[material-symbols--search] text-2xl text-stone-300"></i>
          </div>
          <h3 class="mt-4 text-lg font-semibold text-ink-500">No encontramos complejos</h3>
          <p class="mt-2 max-w-sm text-sm text-stone-500">
            {{
              hayFiltros
                ? 'Probá con otra fecha o quitando alguno de los filtros.'
                : 'Todavía no hay complejos publicados para ese día.'
            }}
          </p>
          <button
            v-if="hayFiltros"
            type="button"
            class="mt-5 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer"
            @click="limpiarFiltros"
          >
            Limpiar filtros
          </button>
        </div>

        <!-- Grid -->
        <div v-else class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <ClubCard v-for="club in sortedClubs" :key="club._id" :club="club" @select="goToClub" />
        </div>
      </section>
    </div>
  </div>
</template>
