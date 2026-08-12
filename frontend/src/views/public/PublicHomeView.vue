<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import publicService from '@/services/publicService'
import { dayjs } from '@/utils/datetime'
import SportIcon from '@/components/public/SportIcon.vue'
import { PUBLIC_SPORTS } from '@/utils/sports'
import ClubCard from '@/components/public/ClubCard.vue'
import NameField from '@/components/public/search/NameField.vue'
import CityField from '@/components/public/search/CityField.vue'
import SportField from '@/components/public/search/SportField.vue'
import DateField from '@/components/public/search/DateField.vue'
import TimeField from '@/components/public/search/TimeField.vue'

const router = useRouter()

// --- Buscador del hero ---
const q = ref('')
const ciudad = ref('')
const tipo = ref('')
const fecha = ref(dayjs().format('YYYY-MM-DD'))
const horaDesde = ref('')
const horaHasta = ref('')

// Los deportes que existen en la plataforma (utils/sports.js), más un acceso a
// la búsqueda sin filtrar. No se listan deportes a mano: los que no existían
// —vóley, hockey— llevaban a una búsqueda siempre vacía.
const sports = [
  ...PUBLIC_SPORTS.map((s) => ({ value: s.key, label: s.label })),
  { value: '', label: 'Más' },
]

const buildQuery = (extra = {}) => {
  const query = {}
  if (q.value.trim()) query.q = q.value.trim()
  if (ciudad.value) query.ciudad = ciudad.value
  if (tipo.value) query.tipo = tipo.value
  if (fecha.value) query.fecha = fecha.value
  if (horaDesde.value) query.hora = horaDesde.value
  if (horaHasta.value) query.horaHasta = horaHasta.value
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
      <div class="relative overflow-hidden rounded-[28px] bg-brand-green-800 px-6 pt-12 pb-28 sm:px-12 sm:pt-16 sm:pb-32">
        <!-- Tenista (billboard de marca) a la derecha -->
        <img
          src="/images/hero-tenista.png"
          alt=""
          aria-hidden="true"
          class="pointer-events-none absolute right-0 top-0 hidden h-full w-[62%] object-cover object-left mix-blend-luminosity md:block"
          style="mask-image: linear-gradient(to right, transparent, #000 34%); -webkit-mask-image: linear-gradient(to right, transparent, #000 34%);"
        />
        <!-- Scrim para legibilidad del texto -->
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-green-900 via-brand-green-900/70 to-transparent"></div>

        <div class="relative max-w-xl">
          <p class="text-xs font-bold tracking-[0.22em] text-brand-lime-500 uppercase">Reservá en segundos</p>
          <h1 class="mt-4 text-4xl font-bold leading-[1.1] text-white sm:text-5xl">
            Encontrá la cancha<br class="hidden sm:block" /> perfecta cerca tuyo
          </h1>
          <p class="mt-4 max-w-md text-base text-white/80">
            Buscá por deporte, ubicación, fecha y hora. Reservá y pagá tu turno al instante.
          </p>
        </div>
      </div>

      <!--
        Buscador (flota sobre el borde inferior del banner).

        Cada campo es un disparador completo: se abre desde cualquier punto, no
        hay que acertarle a un ícono. Ninguno es obligatorio — con "Buscar" a
        secas se ven todos los complejos.
      -->
      <form
        class="relative z-10 mx-auto -mt-16 grid w-[calc(100%-2rem)] max-w-5xl grid-cols-1 gap-1 rounded-2xl bg-white p-2 shadow-xl sm:grid-cols-2 sm:-mt-20 lg:flex lg:items-stretch"
        @submit.prevent="onSearch"
      >
        <div class="lg:flex-[1.2]"><NameField v-model="q" /></div>
        <div class="hidden w-px shrink-0 bg-stone-100 lg:block"></div>
        <div class="lg:flex-1"><CityField v-model="ciudad" /></div>
        <div class="hidden w-px shrink-0 bg-stone-100 lg:block"></div>
        <div class="lg:flex-1"><SportField v-model="tipo" /></div>
        <div class="hidden w-px shrink-0 bg-stone-100 lg:block"></div>
        <div class="lg:flex-1"><DateField v-model="fecha" /></div>
        <div class="hidden w-px shrink-0 bg-stone-100 lg:block"></div>
        <div class="lg:flex-1">
          <TimeField
            :desde="horaDesde"
            :hasta="horaHasta"
            align="right"
            @update:desde="horaDesde = $event"
            @update:hasta="horaHasta = $event"
          />
        </div>
        <button
          type="submit"
          class="mt-1 flex items-center justify-center gap-2 rounded-full bg-brand-lime-500 px-7 py-3 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer sm:col-span-2 lg:mt-0 lg:shrink-0"
        >
          Buscar <i class="icon-[material-symbols--arrow-forward] text-xs"></i>
        </button>
      </form>
    </section>

    <!-- Explorá por deporte -->
    <section class="mt-12">
      <h2 class="text-xl font-bold text-ink-500">Explorá por deporte</h2>
      <div class="mt-6 grid grid-cols-4 gap-3 sm:flex sm:flex-wrap sm:gap-6">
        <button
          v-for="s in sports"
          :key="s.label"
          type="button"
          class="group flex flex-col items-center gap-2.5 cursor-pointer"
          @click="goToSport(s.value)"
        >
          <span class="flex h-16 w-16 items-center justify-center rounded-full border border-black/[0.06] bg-white text-brand-green-500 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
            <SportIcon :sport="s.value || 'otro'" class="h-7 w-7" />
          </span>
          <span class="text-sm font-medium text-ink-500">{{ s.label }}</span>
        </button>
      </div>
    </section>

    <!-- Complejos destacados -->
    <section class="mt-12">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-ink-500">Complejos destacados</h2>
        <RouterLink :to="{ name: 'public-buscar' }" class="flex items-center gap-1.5 text-sm font-semibold text-brand-green-500 no-underline hover:text-brand-green-600">
          Ver todos <i class="icon-[material-symbols--arrow-forward] text-xs"></i>
        </RouterLink>
      </div>

      <div v-if="loading" class="mt-8 flex items-center justify-center py-16">
        <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-stone-300"></i>
      </div>

      <div v-else-if="!featured.length" class="mt-8 rounded-3xl border border-black/[0.06] bg-white py-16 text-center">
        <p class="text-sm text-stone-500">Todavía no hay complejos publicados.</p>
      </div>

      <div v-else class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ClubCard v-for="club in featured" :key="club._id" :club="club" @select="goToClub" />
      </div>
    </section>
  </div>
</template>
