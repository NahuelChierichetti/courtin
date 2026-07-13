<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import publicService from '@/services/publicService'
import { dayjs } from '@/utils/datetime'
import SportIcon from '@/components/public/SportIcon.vue'
import ClubCard from '@/components/public/ClubCard.vue'

const router = useRouter()

// --- Buscador del hero (se mantienen fecha y hora respecto de la referencia) ---
const q = ref('')
const ubicacion = ref('')
const fecha = ref(dayjs().format('YYYY-MM-DD'))
const hora = ref('')

const sports = [
  { value: 'padel', label: 'Pádel' },
  { value: 'futbol', label: 'Fútbol' },
  { value: 'tenis', label: 'Tenis' },
  { value: 'basquet', label: 'Básquet' },
  { value: 'voley', label: 'Vóley' },
  { value: 'hockey', label: 'Hockey' },
  { value: '', label: 'Más' },
]

const buildQuery = (extra = {}) => {
  const query = {}
  if (q.value.trim()) query.q = q.value.trim()
  if (ubicacion.value.trim()) query.ciudad = ubicacion.value.trim()
  if (fecha.value) query.fecha = fecha.value
  if (hora.value) query.hora = hora.value
  return { ...query, ...extra }
}

const onSearch = () => router.push({ name: 'public-buscar', query: buildQuery() })

const goToSport = (value) =>
  router.push({ name: 'public-buscar', query: value ? { tipo: value } : {} })

// --- Complejos destacados ---
const featured = ref([])
const loading = ref(true)

const goToClub = (club) =>
  router.push({ name: 'public-club', params: { slug: club.slug }, query: { fecha: fecha.value } })

onMounted(async () => {
  try {
    const clubs = await publicService.searchClubs({})
    featured.value = clubs.slice(0, 6)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-8">
    <!-- Hero -->
    <section class="relative">
      <div class="relative overflow-hidden rounded-[28px] bg-primitive-dark-500 px-6 pt-12 pb-28 sm:px-12 sm:pt-16 sm:pb-32">
        <!-- Tenista (billboard de marca) a la derecha -->
        <img
          src="/images/hero-tenista.png"
          alt=""
          aria-hidden="true"
          class="pointer-events-none absolute right-0 top-0 hidden h-full w-[62%] object-cover object-left md:block"
          style="mask-image: linear-gradient(to right, transparent, #000 34%); -webkit-mask-image: linear-gradient(to right, transparent, #000 34%);"
        />
        <!-- Scrim para legibilidad del texto -->
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-r from-primitive-dark-500 via-primitive-dark-500/70 to-transparent"></div>

        <div class="relative max-w-xl">
          <p class="text-xs font-bold tracking-[0.22em] text-primitive-orange-400 uppercase">Reservá en segundos</p>
          <h1 class="mt-4 text-4xl font-bold leading-[1.1] text-white sm:text-5xl">
            Encontrá la cancha<br class="hidden sm:block" /> perfecta cerca tuyo
          </h1>
          <p class="mt-4 max-w-md text-base text-white/80">
            Buscá por deporte, ubicación, fecha y hora. Reservá y pagá tu turno al instante.
          </p>
        </div>
      </div>

      <!-- Buscador (flota sobre el borde inferior del banner) -->
      <form
        class="relative z-10 mx-auto -mt-16 flex w-[calc(100%-2rem)] max-w-5xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:-mt-20 lg:flex-row lg:items-stretch"
        @submit.prevent="onSearch"
      >
        <div class="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2">
          <i class="icon-[material-symbols--search] text-sm text-slate-400"></i>
          <input v-model="q" type="text" placeholder="¿Qué querés jugar?"
            class="h-8 w-full bg-transparent text-sm text-primitive-dark-500 outline-none placeholder:text-slate-400" />
        </div>
        <div class="hidden w-px bg-slate-100 lg:block"></div>
        <div class="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2">
          <i class="icon-[material-symbols--location-on] text-sm text-slate-400"></i>
          <input v-model="ubicacion" type="text" placeholder="Ubicación"
            class="h-8 w-full bg-transparent text-sm text-primitive-dark-500 outline-none placeholder:text-slate-400" />
        </div>
        <div class="hidden w-px bg-slate-100 lg:block"></div>
        <div class="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2">
          <i class="icon-[material-symbols--calendar-month] text-sm text-slate-400"></i>
          <input v-model="fecha" type="date" :min="dayjs().format('YYYY-MM-DD')"
            class="h-8 w-full bg-transparent text-sm text-primitive-dark-500 outline-none" />
        </div>
        <div class="hidden w-px bg-slate-100 lg:block"></div>
        <div class="flex flex-1 items-center gap-2.5 rounded-xl px-3 py-2">
          <i class="icon-[material-symbols--schedule] text-sm text-slate-400"></i>
          <input v-model="hora" type="time"
            class="h-8 w-full bg-transparent text-sm text-primitive-dark-500 outline-none" />
        </div>
        <button type="submit"
          class="flex items-center justify-center gap-2 rounded-full bg-primitive-orange-500 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer">
          Buscar <i class="icon-[material-symbols--arrow-forward] text-xs"></i>
        </button>
      </form>
    </section>

    <!-- Explorá por deporte -->
    <section class="mt-12">
      <h2 class="text-xl font-bold text-primitive-dark-500">Explorá por deporte</h2>
      <div class="mt-6 grid grid-cols-4 gap-3 sm:flex sm:flex-wrap sm:gap-6">
        <button
          v-for="s in sports"
          :key="s.label"
          type="button"
          class="group flex flex-col items-center gap-2.5 cursor-pointer"
          @click="goToSport(s.value)"
        >
          <span class="flex h-16 w-16 items-center justify-center rounded-full border border-black/[0.06] bg-white text-primitive-orange-500 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
            <SportIcon :sport="s.value || 'mas'" class="h-7 w-7" />
          </span>
          <span class="text-sm font-medium text-primitive-dark-500">{{ s.label }}</span>
        </button>
      </div>
    </section>

    <!-- Complejos destacados -->
    <section class="mt-12">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-primitive-dark-500">Complejos destacados</h2>
        <RouterLink :to="{ name: 'public-buscar' }" class="flex items-center gap-1.5 text-sm font-semibold text-primitive-orange-500 no-underline hover:text-primitive-orange-600">
          Ver todos <i class="icon-[material-symbols--arrow-forward] text-xs"></i>
        </RouterLink>
      </div>

      <div v-if="loading" class="mt-8 flex items-center justify-center py-16">
        <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-slate-300"></i>
      </div>

      <div v-else-if="!featured.length" class="mt-8 rounded-3xl border border-black/[0.06] bg-white py-16 text-center">
        <p class="text-sm text-slate-500">Todavía no hay complejos publicados.</p>
      </div>

      <div v-else class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ClubCard v-for="club in featured" :key="club._id" :club="club" @select="goToClub" />
      </div>
    </section>
  </div>
</template>
