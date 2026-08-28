<script setup>
import { reactive, ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import publicService from '@/services/publicService'
import { sportMeta } from '@/utils/sports'
import { dayjs } from '@/utils/datetime'
import ClubCard from '@/components/public/ClubCard.vue'
import NameField from '@/components/public/search/NameField.vue'
import CityField from '@/components/public/search/CityField.vue'
import SportField from '@/components/public/search/SportField.vue'
import DateField from '@/components/public/search/DateField.vue'
import TimeField from '@/components/public/search/TimeField.vue'

// Home y buscador son la misma página.
//
// Antes eran dos (`/` y `/buscar`) que corrían la misma query contra los mismos
// filtros y pintaban la misma card: la única diferencia era que el home cortaba
// en seis y no mandaba fecha, con lo cual un complejo cerrado hoy aparecía acá y
// desaparecía allá sin que nada lo explicara. Con un catálogo de este tamaño la
// segunda página no agregaba información, agregaba un click.
const route = useRoute()
const router = useRouter()

const str = (v) => (typeof v === 'string' ? v : '')

const leerQuery = (query) => ({
  q: str(query.q),
  ciudad: str(query.ciudad),
  tipo: str(query.tipo),
  // Sin fecha por defecto: acá se llega a descubrir, y que un complejo se caiga
  // de la lista porque justo hoy cierra es hostil. La disponibilidad recién
  // filtra cuando el jugador elige un día.
  fecha: /^\d{4}-\d{2}-\d{2}$/.test(str(query.fecha)) ? str(query.fecha) : '',
  horaDesde: str(query.hora),
  horaHasta: str(query.horaHasta),
})

const mismos = (a, b) =>
  a.q === b.q &&
  a.ciudad === b.ciudad &&
  a.tipo === b.tipo &&
  a.fecha === b.fecha &&
  a.horaDesde === b.horaDesde &&
  a.horaHasta === b.horaHasta

const inicial = leerQuery(route.query)

// Dos estados y no uno: `form` es lo que el jugador está armando, `aplicados` es
// lo que produjo los resultados que está viendo. La búsqueda no sale a cada
// tecla —una consulta por letra es inviable— sino con "Buscar" o Enter, así que
// entre medio los dos difieren y la pantalla tiene que seguir contando lo que
// realmente se buscó, no lo que hay tipeado a medias.
const form = reactive({ ...inicial })
const aplicados = ref({ ...inicial })

const sortBy = ref('todos')

const clubs = ref([])
const loading = ref(true)
const error = ref('')

// Sólo los órdenes que hoy tienen con qué ordenar. "Cercanos" necesita
// geolocalización y "Mejor valorados" un rating que todavía no existe en el
// modelo: se veían activos y no cambiaban nada.
const sortChips = [
  { label: 'Todos', value: 'todos' },
  { label: 'Menor precio', value: 'precio' },
]

const labelDeporte = (tipo) => (tipo ? sportMeta(tipo).label : 'Todos')

// Etiqueta legible de la franja elegida, para el resumen y el chip.
const FRANJA_LABELS = {
  '06:00|11:59': 'Mañana',
  '12:00|17:59': 'Tarde',
  '18:00|23:59': 'Noche',
}
const labelHora = ({ horaDesde, horaHasta }) => {
  if (!horaDesde) return ''
  return FRANJA_LABELS[`${horaDesde}|${horaHasta}`] || `desde ${horaDesde}`
}

const labelFecha = (fecha) => {
  if (!fecha) return ''
  const d = dayjs(fecha)
  const dias = d.startOf('day').diff(dayjs().startOf('day'), 'day')
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  const texto = d.format('ddd D [de] MMM')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Chips de lo que se buscó, cada uno con su cruz. Sin esto, una búsqueda vacía
// deja al jugador sin saber cuál de los cinco filtros la dejó así.
const activeFilters = computed(() => {
  const a = aplicados.value
  const chips = []
  if (a.q.trim()) chips.push({ key: 'q', label: `"${a.q.trim()}"` })
  if (a.ciudad) chips.push({ key: 'ciudad', label: a.ciudad })
  if (a.tipo) chips.push({ key: 'tipo', label: labelDeporte(a.tipo) })
  if (a.fecha) chips.push({ key: 'fecha', label: labelFecha(a.fecha) })
  if (a.horaDesde) chips.push({ key: 'hora', label: labelHora(a) })
  return chips
})

// "Está buscando" es lo que decide la cara de la página: con la URL limpia es un
// home (banner + catálogo completo); cuando hay una búsqueda aplicada, el banner
// deja lugar a los resultados. Mira lo aplicado, no el formulario: si no, el
// hero se caería a la primera letra tipeada.
const buscando = computed(() => activeFilters.value.length > 0)

// Hay filtros tocados que todavía no se buscaron. El botón lo marca: sin eso,
// elegir una ciudad y no ver moverse nada parece que la página se colgó.
const hayCambios = computed(() => !mismos(form, aplicados.value))

const resultsMeta = computed(() => {
  const a = aplicados.value
  const parts = [labelFecha(a.fecha) || 'Cualquier día']
  const hora = labelHora(a)
  if (hora) parts.push(hora)
  parts.push(labelDeporte(a.tipo))
  if (a.ciudad) parts.push(a.ciudad)
  return parts.join(' · ')
})

// Orden en cliente por precio ascendente. "Todos" respeta el orden del back
// (alfabético por nombre).
const sortedClubs = computed(() => {
  const list = [...clubs.value]
  if (sortBy.value === 'precio') {
    return list.sort((a, b) => (a.precioDesde ?? Infinity) - (b.precioDesde ?? Infinity))
  }
  return list
})

const fetchClubs = async () => {
  const a = aplicados.value
  loading.value = true
  error.value = ''
  try {
    clubs.value = await publicService.searchClubs({
      q: a.q.trim() || undefined,
      ciudad: a.ciudad || undefined,
      tipo: a.tipo || undefined,
      fecha: a.fecha || undefined,
      hora: a.horaDesde || undefined,
      horaHasta: a.horaHasta || undefined,
    })
  } catch (err) {
    console.error(err)
    error.value = 'No se pudieron cargar los complejos. Probá de nuevo.'
    clubs.value = []
  } finally {
    loading.value = false
  }
}

// Los filtros aplicados viven en la URL para poder compartirla y volver.
const syncUrl = () => {
  const a = aplicados.value
  const query = {}
  if (a.q.trim()) query.q = a.q.trim()
  if (a.ciudad) query.ciudad = a.ciudad
  if (a.tipo) query.tipo = a.tipo
  if (a.fecha) query.fecha = a.fecha
  if (a.horaDesde) query.hora = a.horaDesde
  if (a.horaHasta) query.horaHasta = a.horaHasta
  router.replace({ query })
}

const aplicar = () => {
  aplicados.value = { ...form }
  syncUrl()
  fetchClubs()
}

// El formulario sólo se dispara acá: click en "Buscar" o Enter en el campo de
// nombre.
const resultados = ref(null)
const onSubmit = () => {
  aplicar()
  // Después del repintado: al aplicar el primer filtro se va el hero y la
  // página entera se corre para arriba.
  nextTick(() => resultados.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

// Sacar un chip sí es una acción explícita sobre lo aplicado, así que corre sola
// —esperar un "Buscar" después de tocar la cruz sería raro.
const clearFilter = (key) => {
  if (key === 'hora') {
    form.horaDesde = ''
    form.horaHasta = ''
  } else {
    form[key] = ''
  }
  aplicar()
}

const limpiarFiltros = () => {
  Object.assign(form, { q: '', ciudad: '', tipo: '', fecha: '', horaDesde: '', horaHasta: '' })
  aplicar()
}

// Cambios de URL que no nacieron acá: el buscador de la barra superior (que
// navega al home estando ya en el home, así que el componente no se remonta) y
// el back/forward del navegador.
watch(
  () => route.query,
  (query) => {
    const next = leerQuery(query)
    if (mismos(next, aplicados.value)) return
    Object.assign(form, next)
    aplicados.value = next
    fetchClubs()
  },
)

const goToClub = (club) => {
  const a = aplicados.value
  router.push({
    name: 'public-club',
    params: { slug: club.slug },
    query: {
      ...(a.fecha ? { fecha: a.fecha } : {}),
      ...(a.horaDesde ? { hora: a.horaDesde } : {}),
    },
  })
}

onMounted(fetchClubs)
</script>

<template>
  <div class="mx-auto w-full max-w-shell px-4 py-8">
    <section class="relative">
      <!-- Hero. Se va cuando hay una búsqueda en curso: ahí el jugador ya sabe
           a qué vino y lo que necesita es ver resultados, no el banner. -->
      <div
        v-if="!buscando"
        class="relative overflow-hidden rounded-[28px] bg-brand-green-800 px-6 pt-12 pb-28 sm:px-12 sm:pt-16 sm:pb-32"
      >
        <!-- Tenista (billboard de marca) a la derecha -->
        <img
          src="/images/banner-web.jpg"
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
        Buscador. Es un solo elemento que cambia de envoltorio —flotando sobre el
        borde del banner, o como barra pegada arriba— y nunca se desmonta: si
        fueran dos formularios distintos, el input perdería el foco al aplicar la
        búsqueda, justo cuando el hero se va.

        Cada campo es un disparador completo: se abre desde cualquier punto, no
        hay que acertarle a un ícono. Ninguno es obligatorio.
      -->
      <form
        class="relative z-20 grid grid-cols-1 gap-1 rounded-2xl bg-white p-2 shadow-xl sm:grid-cols-2 lg:flex lg:items-stretch"
        :class="buscando ? 'w-full lg:sticky lg:top-[88px]' : 'mx-auto -mt-16 w-[calc(100%-2rem)] sm:-mt-20'"
        @submit.prevent="onSubmit"
      >
        <div class="lg:flex-[2]"><NameField v-model="form.q" /></div>
        <div class="hidden w-px shrink-0 bg-stone-100 lg:block"></div>
        <div class="lg:flex-1"><CityField v-model="form.ciudad" /></div>
        <div class="hidden w-px shrink-0 bg-stone-100 lg:block"></div>
        <div class="lg:flex-1"><SportField v-model="form.tipo" /></div>
        <div class="hidden w-px shrink-0 bg-stone-100 lg:block"></div>
        <div class="lg:flex-1"><DateField v-model="form.fecha" /></div>
        <div class="hidden w-px shrink-0 bg-stone-100 lg:block"></div>
        <div class="lg:flex-1">
          <TimeField
            :desde="form.horaDesde"
            :hasta="form.horaHasta"
            align="right"
            @update:desde="form.horaDesde = $event"
            @update:hasta="form.horaHasta = $event"
          />
        </div>
        <button
          type="submit"
          class="mt-1 flex items-center justify-center gap-2 rounded-full bg-brand-lime-500 px-7 py-3 text-sm font-semibold text-brand-green-900 transition-all hover:bg-brand-lime-600 cursor-pointer sm:col-span-2 lg:mt-0 lg:shrink-0"
          :class="{ 'ring-2 ring-brand-green-500 ring-offset-2': hayCambios }"
        >
          Buscar <i class="icon-[material-symbols--arrow-forward] text-xs"></i>
        </button>
      </form>
    </section>

    <!-- Resultados -->
    <section ref="resultados" class="scroll-mt-24" :class="buscando ? 'mt-8' : 'mt-12'">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <component
            :is="buscando ? 'h1' : 'h2'"
            class="font-bold text-brand-green-900"
            :class="buscando ? 'text-2xl' : 'text-xl'"
          >
            {{
              buscando
                ? `${sortedClubs.length} ${sortedClubs.length === 1 ? 'resultado' : 'resultados'}`
                : 'Explorá complejos'
            }}
          </component>
          <p v-if="buscando" class="mt-1 text-sm text-stone-500">{{ resultsMeta }}</p>
          <p v-else-if="sortedClubs.length" class="mt-1 text-sm text-stone-500">
            {{ sortedClubs.length }}
            {{ sortedClubs.length === 1 ? 'complejo publicado' : 'complejos publicados' }}
          </p>
        </div>

        <!-- Orden -->
        <div v-if="sortedClubs.length" class="flex flex-wrap gap-2">
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

      <!-- Vacío con filtros: la búsqueda no dio, se ofrece aflojarla. -->
      <div v-else-if="!sortedClubs.length && buscando" class="flex flex-col items-center justify-center py-24 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
          <i class="icon-[material-symbols--search] text-2xl text-stone-300"></i>
        </div>
        <h3 class="mt-4 text-lg font-semibold text-brand-green-900">No encontramos complejos</h3>
        <p class="mt-2 max-w-sm text-sm text-stone-500">
          Probá con otra fecha o quitando alguno de los filtros.
        </p>
        <button
          type="button"
          class="mt-5 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer"
          @click="limpiarFiltros"
        >
          Limpiar filtros
        </button>
      </div>

      <!--
        Vacío sin filtros: no falló la búsqueda, todavía no hay oferta. Ahí el
        único camino útil es el del otro lado del marketplace.
      -->
      <div v-else-if="!sortedClubs.length" class="mt-8 flex flex-col items-center rounded-3xl border border-black/[0.06] bg-white px-6 py-16 text-center">
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green-50">
          <i class="icon-[material-symbols--stadium-outline] text-2xl text-brand-green-500"></i>
        </div>
        <h3 class="mt-4 text-lg font-semibold text-brand-green-900">Todavía no hay complejos publicados</h3>
        <p class="mt-2 max-w-sm text-sm text-stone-500">
          Estamos sumando complejos a CourtIn. Volvé en unos días o, si administrás uno,
          publicalo y empezá a recibir reservas online.
        </p>
        <RouterLink
          :to="{ name: 'landing-complejos' }"
          class="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-semibold text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
        >
          ¿Tenés un complejo? Sumate
          <i class="icon-[material-symbols--arrow-forward] text-xs"></i>
        </RouterLink>
      </div>

      <!-- Grid -->
      <div v-else class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <ClubCard v-for="club in sortedClubs" :key="club._id" :club="club" @select="goToClub" />
      </div>
    </section>
  </div>
</template>
