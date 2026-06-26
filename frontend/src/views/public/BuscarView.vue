<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import publicService from '@/services/publicService'
import { sportMeta } from '@/utils/turnos'
import { dayjs, formatCurrency } from '@/utils/datetime'

const router = useRouter()

const clubs = ref([])
const loading = ref(false)
const error = ref('')

const cities = ref([])
const ciudad = ref('')
const tipo = ref('')
const cuando = ref(dayjs().format('YYYY-MM-DD'))

const fetchCities = async () => {
  try {
    cities.value = await publicService.getCities()
  } catch (err) {
    console.error(err)
  }
}

const sportChips = [
  { label: 'Todos', value: '' },
  { label: 'Pádel', value: 'padel' },
  { label: 'Fútbol', value: 'futbol' },
  { label: 'Tenis', value: 'tenis' },
  { label: 'Básquet', value: 'basquet' },
]

const sportLabel = computed(() => sportChips.find((s) => s.value === tipo.value)?.label || 'Todos')

const fetchClubs = async () => {
  loading.value = true
  error.value = ''
  try {
    clubs.value = await publicService.searchClubs({
      ciudad: ciudad.value || undefined,
      tipo: tipo.value || undefined,
    })
  } catch (err) {
    console.error(err)
    error.value = 'No se pudieron cargar los clubes. Probá de nuevo.'
    clubs.value = []
  } finally {
    loading.value = false
  }
}

const onSubmit = () => fetchClubs()

const selectSport = (value) => {
  tipo.value = value
  fetchClubs()
}

const goToClub = (slug) =>
  router.push({ name: 'public-club', params: { slug }, query: { fecha: cuando.value } })

onMounted(() => {
  fetchCities()
  fetchClubs()
})
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden bg-gradient-to-br from-[#fdf1e7] via-white to-[#eef2fb]">
      <div class="mx-auto w-full max-w-6xl px-4 pt-14 pb-28">
        <h1 class="max-w-2xl text-4xl font-bold leading-tight text-primitive-dark-500 sm:text-5xl">
          Tu próximo partido empieza <span class="text-primitive-orange-500">acá.</span>
        </h1>
        <p class="mt-4 max-w-xl text-base text-slate-500">
          Encontrá y reservá canchas de pádel, tenis y fútbol cerca tuyo. Disponibilidad en tiempo real, pagás online.
        </p>
      </div>

      <!-- Search card (floats over hero edge) -->
      <div class="mx-auto -mt-16 w-full max-w-6xl px-4">
        <form
          class="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg sm:flex-row sm:items-end"
          @submit.prevent="onSubmit"
        >
          <div class="flex-1 px-2">
            <label class="mb-1 block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Ciudad</label>
            <div class="relative">
              <i class="pi pi-map-marker absolute left-0 top-1/2 -translate-y-1/2 text-sm text-neutral-400"></i>
              <select
                v-model="ciudad"
                class="h-9 w-full appearance-none border-0 bg-transparent pl-6 pr-6 text-sm text-slate-800 outline-none"
              >
                <option value="">Todas las ciudades</option>
                <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
              </select>
              <i class="pi pi-chevron-down pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-neutral-400"></i>
            </div>
          </div>
          <div class="hidden w-px self-stretch bg-slate-100 sm:block"></div>
          <div class="flex-1 px-2">
            <label class="mb-1 block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Deporte</label>
            <div class="relative">
              <select
                v-model="tipo"
                class="h-9 w-full appearance-none border-0 bg-transparent pr-6 text-sm text-slate-800 outline-none"
              >
                <option v-for="s in sportChips" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
              <i class="pi pi-chevron-down pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-xs text-neutral-400"></i>
            </div>
          </div>
          <div class="hidden w-px self-stretch bg-slate-100 sm:block"></div>
          <div class="flex-1 px-2">
            <label class="mb-1 block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Cuándo</label>
            <div class="relative">
              <i class="pi pi-calendar absolute left-0 top-1/2 -translate-y-1/2 text-sm text-neutral-400"></i>
              <input
                v-model="cuando"
                type="date"
                class="h-9 w-full border-0 bg-transparent pl-6 text-sm text-slate-800 outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            class="flex h-11 items-center justify-center gap-2 rounded-xl bg-primitive-orange-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer"
          >
            <i class="pi pi-search text-sm"></i> Buscar
          </button>
        </form>

        <!-- Quick filters -->
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-xs font-medium text-neutral-400">Popular</span>
          <button
            v-for="s in sportChips"
            :key="s.value"
            class="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            :class="tipo === s.value
              ? 'border-primitive-dark-500 bg-primitive-dark-500 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
            @click="selectSport(s.value)"
          >
            {{ s.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Results -->
    <div class="mx-auto w-full max-w-6xl px-4 py-10">
      <div class="flex items-end justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">
            {{ clubs.length }} {{ clubs.length === 1 ? 'complejo disponible' : 'complejos disponibles' }}
          </h2>
          <p class="mt-0.5 text-xs text-neutral-400">Filtrando por {{ sportLabel }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-center">
        <i class="pi pi-spin pi-spinner text-3xl text-neutral-400"></i>
        <p class="mt-4 text-sm text-slate-500">Buscando clubes...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="mt-6 rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-600">
        {{ error }}
      </div>

      <!-- Empty -->
      <div v-else-if="!clubs.length" class="flex flex-col items-center justify-center py-20 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <i class="pi pi-building text-2xl text-neutral-400"></i>
        </div>
        <h3 class="mt-4 text-lg font-semibold text-slate-900">No encontramos complejos</h3>
        <p class="!mt-2 text-sm text-slate-500">Probá ajustar la zona o el deporte.</p>
      </div>

      <!-- Grid -->
      <div v-else class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="club in clubs"
          :key="club._id"
          class="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-shadow hover:shadow-md cursor-pointer"
          @click="goToClub(club.slug)"
        >
          <!-- Cover -->
          <div class="relative h-40 w-full overflow-hidden">
            <img v-if="club.fotos && club.fotos.length" :src="club.fotos[0]" :alt="club.nombre" class="h-full w-full object-cover" />
            <div v-else class="relative h-full w-full bg-gradient-to-br from-primitive-dark-500 to-primitive-blue-500">
              <!-- court lines -->
              <div class="absolute inset-4 rounded-md border border-white/20">
                <div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/20"></div>
                <div class="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/20"></div>
                <div class="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20"></div>
              </div>
            </div>
            <div v-if="club.logo" class="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border-2 border-white bg-white shadow">
              <img :src="club.logo" :alt="club.nombre" class="h-full w-full object-cover" />
            </div>
          </div>

          <div class="flex flex-1 flex-col gap-2 p-4">
            <h3 class="text-base font-semibold text-slate-900">{{ club.nombre }}</h3>
            <p v-if="club.ciudad || club.direccion" class="flex items-center gap-1.5 text-xs text-slate-500">
              <i class="pi pi-map-marker text-[11px]"></i>
              {{ [club.direccion, club.ciudad].filter(Boolean).join(', ') }}
            </p>

            <!-- Sports -->
            <div v-if="club.deportes && club.deportes.length" class="mt-0.5 flex flex-wrap gap-1.5">
              <span
                v-for="d in club.deportes"
                :key="d"
                class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                :class="[sportMeta(d).bg, sportMeta(d).text]"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="sportMeta(d).dot"></span>
                {{ sportMeta(d).label }}
              </span>
            </div>

            <!-- Footer: price + CTA -->
            <div class="mt-auto flex items-center justify-between pt-3">
              <div v-if="club.precioDesde">
                <p class="text-[10px] text-neutral-400">desde</p>
                <p class="text-base font-bold font-secondary text-slate-900">{{ formatCurrency(club.precioDesde, club.moneda) }}<span class="text-xs font-normal text-neutral-400"> /hora</span></p>
              </div>
              <span v-else></span>
              <span class="rounded-lg bg-primitive-dark-500 px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-primitive-dark-700">
                Ver turnos
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
