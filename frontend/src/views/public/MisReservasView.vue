<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import reservationService from '@/services/reservationService'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'
import { ESTADO_META } from '@/utils/turnos'

const reservations = ref([])
const loading = ref(true)
const error = ref('')

const now = dayjs()

// Próximas (activas y a futuro) primero; después el historial.
const proximas = computed(() =>
  reservations.value
    .filter((r) => ['pendiente', 'confirmada'].includes(r.estado) && dayjs.utc(r.fin).isAfter(now))
    .sort((a, b) => dayjs.utc(a.inicio) - dayjs.utc(b.inicio)),
)

const historial = computed(() =>
  reservations.value
    .filter((r) => !proximas.value.includes(r))
    .sort((a, b) => dayjs.utc(b.inicio) - dayjs.utc(a.inicio)),
)

const tzOf = (r) => r.club?.timezone || DEFAULT_TZ
const monedaOf = (r) => r.club?.moneda || 'ARS'
const estadoMetaOf = (r) => ESTADO_META[r.estado] || ESTADO_META.pendiente

const fechaOf = (r) => {
  const l = dayjs.utc(r.inicio).tz(tzOf(r)).format('dddd DD [de] MMMM')
  return l.charAt(0).toUpperCase() + l.slice(1)
}
const horarioOf = (r) => {
  const start = dayjs.utc(r.inicio).tz(tzOf(r)).format('HH:mm')
  const end = dayjs.utc(r.fin).tz(tzOf(r)).format('HH:mm')
  return `${start} – ${end} hs`
}

const fetchReservations = async () => {
  loading.value = true
  error.value = ''
  try {
    reservations.value = await reservationService.getMyReservations()
  } catch (err) {
    console.error(err)
    error.value = 'No pudimos cargar tus reservas. Probá de nuevo.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchReservations)
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="text-2xl font-bold text-slate-900">Mis reservas</h1>
    <p class="mt-1 text-sm text-slate-500">Gestioná tus turnos y revisá tu historial.</p>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="pi pi-spin pi-spinner text-3xl text-neutral-400"></i>
      <p class="mt-4 text-sm text-slate-500">Cargando tus reservas...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="mt-8 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
      {{ error }}
    </div>

    <!-- Empty -->
    <div v-else-if="reservations.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="pi pi-calendar text-2xl text-neutral-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">Todavía no tenés reservas</h3>
      <p class="mt-1 text-sm text-slate-500">Buscá un complejo y reservá tu primera cancha.</p>
      <RouterLink
        :to="{ name: 'public-buscar' }"
        class="mt-4 rounded-lg bg-primitive-orange-500 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-primitive-orange-600"
      >
        Buscar canchas
      </RouterLink>
    </div>

    <!-- List -->
    <div v-else class="mt-8 space-y-8">
      <section v-if="proximas.length">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Próximas</h2>
        <div class="mt-3 space-y-3">
          <article
            v-for="r in proximas"
            :key="r._id"
            class="rounded-2xl border border-slate-200 bg-white px-5 py-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-slate-900">{{ r.club?.nombre }}</p>
                <p class="text-xs text-slate-500">{{ r.court?.nombre }}</p>
              </div>
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium"
                :class="estadoMetaOf(r).text"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="estadoMetaOf(r).dot"></span>
                {{ estadoMetaOf(r).label }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-700">
              <span><i class="pi pi-calendar mr-1.5 text-xs text-neutral-400"></i>{{ fechaOf(r) }}</span>
              <span><i class="pi pi-clock mr-1.5 text-xs text-neutral-400"></i>{{ horarioOf(r) }}</span>
              <span class="font-semibold">{{ formatCurrency(r.precioFinal, monedaOf(r)) }}</span>
            </div>
          </article>
        </div>
      </section>

      <section v-if="historial.length">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Historial</h2>
        <div class="mt-3 space-y-3">
          <article
            v-for="r in historial"
            :key="r._id"
            class="rounded-2xl border border-slate-100 bg-slate-50/50 px-5 py-4"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm font-semibold text-slate-800">{{ r.club?.nombre }}</p>
                <p class="text-xs text-slate-500">{{ r.court?.nombre }}</p>
              </div>
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium"
                :class="estadoMetaOf(r).text"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="estadoMetaOf(r).dot"></span>
                {{ estadoMetaOf(r).label }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
              <span><i class="pi pi-calendar mr-1.5 text-xs text-neutral-400"></i>{{ fechaOf(r) }}</span>
              <span><i class="pi pi-clock mr-1.5 text-xs text-neutral-400"></i>{{ horarioOf(r) }}</span>
              <span class="font-semibold">{{ formatCurrency(r.precioFinal, monedaOf(r)) }}</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
