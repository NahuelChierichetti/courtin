<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import reservationService from '@/services/reservationService'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'
import { ESTADO_META, pagoMeta } from '@/utils/turnos'
import { sportLabel } from '@/utils/sports'
import AccountNav from '@/components/public/AccountNav.vue'
import SportIcon from '@/components/public/SportIcon.vue'

const confirm = useConfirm()
const toast = useToast()

const reservations = ref([])
const loading = ref(true)
const error = ref('')
const tab = ref('proximas')
const cancelandoId = ref(null)

const ACTIVE_STATUSES = ['pendiente', 'confirmada']

// "Próxima" es lo que todavía se puede jugar: activa y sin terminar. Se calcula
// contra la hora de cada consulta y no contra un `now` congelado al montar, para
// que un turno no siga apareciendo como próximo si la pestaña quedó abierta.
const esProxima = (r) => ACTIVE_STATUSES.includes(r.estado) && dayjs.utc(r.fin).isAfter(dayjs())

const proximas = computed(() =>
  reservations.value.filter(esProxima).sort((a, b) => dayjs.utc(a.inicio) - dayjs.utc(b.inicio)),
)

const historial = computed(() =>
  reservations.value
    .filter((r) => !esProxima(r))
    .sort((a, b) => dayjs.utc(b.inicio) - dayjs.utc(a.inicio)),
)

const visibles = computed(() => (tab.value === 'proximas' ? proximas.value : historial.value))

const TABS = computed(() => [
  { key: 'proximas', label: 'Próximas', count: proximas.value.length },
  { key: 'historial', label: 'Historial', count: historial.value.length },
])

// --- Formato ---

const tzOf = (r) => r.club?.timezone || DEFAULT_TZ
const monedaOf = (r) => r.club?.moneda || 'ARS'
const estadoMetaOf = (r) => ESTADO_META[r.estado] || ESTADO_META.pendiente
const pagoMetaOf = (r) => pagoMeta(r, (monto) => formatCurrency(monto, monedaOf(r)))

const fechaOf = (r) => {
  const l = dayjs.utc(r.inicio).tz(tzOf(r)).format('dddd D [de] MMMM')
  return l.charAt(0).toUpperCase() + l.slice(1)
}

const horarioOf = (r) => {
  const inicio = dayjs.utc(r.inicio).tz(tzOf(r)).format('HH:mm')
  const fin = dayjs.utc(r.fin).tz(tzOf(r)).format('HH:mm')
  return `${inicio} – ${fin} hs`
}

// Cuenta regresiva en lenguaje natural ("en 2 días"), sólo para lo que viene.
const cuandoOf = (r) => dayjs.utc(r.inicio).fromNow()

const direccionOf = (r) =>
  [r.club?.direccion, r.club?.ciudad].filter(Boolean).join(', ') || null

const mapsUrlOf = (r) => {
  const destino = [r.club?.nombre, direccionOf(r)].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`
}

// --- Cancelación ---

// Sólo tiene sentido ofrecerla sobre un turno que todavía no pasó. Si el
// complejo tiene tolerancia de cancelación configurada, el backend es quien
// decide: acá no la duplicamos para no desincronizar las dos reglas.
const puedeCancelar = (r) => esProxima(r)

const confirmarCancelacion = (r) => {
  confirm.require({
    header: 'Cancelar reserva',
    message: `¿Seguro que querés cancelar tu turno en ${r.club?.nombre} del ${fechaOf(r)} a las ${horarioOf(r)}?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Cancelar reserva',
    rejectLabel: 'Volver',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', outlined: true },
    accept: () => cancelar(r),
  })
}

const cancelar = async (r) => {
  cancelandoId.value = r._id
  try {
    const actualizada = await reservationService.cancelMyReservation(r._id)
    reservations.value = reservations.value.map((item) =>
      item._id === r._id ? { ...item, ...actualizada } : item,
    )
    toast.add({
      severity: 'success',
      summary: 'Reserva cancelada',
      detail: `Avisamos a ${r.club?.nombre}.`,
      life: 5000,
    })
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo cancelar',
      detail: err.response?.data?.message || 'Probá de nuevo en un momento.',
      life: 6000,
    })
  } finally {
    cancelandoId.value = null
  }
}

const fetchReservations = async () => {
  loading.value = true
  error.value = ''
  try {
    reservations.value = await reservationService.getMyReservations()
    // Si no hay nada por jugar, el historial es lo único que tiene contenido:
    // abrir en una pestaña vacía haría parecer que no hay reservas.
    if (proximas.value.length === 0 && historial.value.length > 0) {
      tab.value = 'historial'
    }
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
    <h1 class="text-2xl font-medium text-brand-green-900">Mis reservas</h1>
    <p class="mt-1 text-sm text-stone-500">Gestioná tus turnos y revisá tu historial.</p>

    <div class="mt-6">
      <AccountNav />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-stone-400"></i>
      <p class="mt-4 text-sm text-stone-500">Cargando tus reservas...</p>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="mt-6 flex items-center justify-between gap-3 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600"
    >
      <span>{{ error }}</span>
      <button
        class="shrink-0 font-semibold underline underline-offset-2 cursor-pointer"
        @click="fetchReservations"
      >
        Reintentar
      </button>
    </div>

    <!-- Sin ninguna reserva -->
    <div
      v-else-if="reservations.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--calendar-month] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-brand-green-900">Todavía no tenés reservas</h3>
      <p class="mt-1 text-sm text-stone-500">Buscá un complejo y reservá tu primera cancha.</p>
      <RouterLink
        :to="{ name: 'public-home' }"
        class="mt-5 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-semibold text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
      >
        Buscar canchas
      </RouterLink>
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="mt-6 flex gap-2 border-b border-black/[0.06]">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition-colors cursor-pointer"
          :class="
            tab === t.key
              ? 'border-brand-green-500 text-brand-green-900'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          "
          @click="tab = t.key"
        >
          {{ t.label }}
          <span
            class="rounded-full px-2 py-0.5 text-xs font-bold"
            :class="tab === t.key ? 'bg-brand-green-50 text-brand-green-600' : 'bg-stone-100 text-stone-500'"
          >
            {{ t.count }}
          </span>
        </button>
      </div>

      <!-- Pestaña vacía -->
      <div v-if="visibles.length === 0" class="py-16 text-center">
        <p class="text-sm text-stone-500">
          {{
            tab === 'proximas'
              ? 'No tenés turnos por jugar.'
              : 'Todavía no hay turnos en tu historial.'
          }}
        </p>
        <RouterLink
          v-if="tab === 'proximas'"
          :to="{ name: 'public-home' }"
          class="mt-4 inline-block rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-semibold text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
        >
          Reservar una cancha
        </RouterLink>
      </div>

      <!-- Listado -->
      <div v-else class="mt-5 space-y-3">
        <article
          v-for="r in visibles"
          :key="r._id"
          class="overflow-hidden rounded-2xl border border-black/[0.06] bg-white"
          :class="{ 'opacity-70': r.estado === 'cancelada' }"
        >
          <div class="p-5">
            <!-- Encabezado: complejo + estado -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <span
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green-50 text-brand-green-500"
                >
                  <SportIcon :sport="r.court?.tipo" class="h-5 w-5" />
                </span>
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-brand-green-900">{{ r.club?.nombre }}</p>
                  <p class="truncate text-xs text-stone-500">
                    {{ r.court?.nombre }}
                    <template v-if="r.court?.tipo"> · {{ sportLabel(r.court.tipo) }}</template>
                  </p>
                </div>
              </div>

              <span
                class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-stone-50 px-2.5 py-1 text-xs font-medium"
                :class="estadoMetaOf(r).text"
              >
                <span class="h-1.5 w-1.5 rounded-full" :class="estadoMetaOf(r).dot"></span>
                {{ estadoMetaOf(r).label }}
              </span>
            </div>

            <!-- Cuándo -->
            <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-stone-700">
              <span class="flex items-center gap-1.5">
                <i class="icon-[material-symbols--calendar-month] text-sm text-stone-400"></i>
                {{ fechaOf(r) }}
              </span>
              <span class="flex items-center gap-1.5">
                <i class="icon-[material-symbols--schedule] text-sm text-stone-400"></i>
                {{ horarioOf(r) }}
              </span>
              <span
                v-if="esProxima(r)"
                class="rounded-full bg-brand-lime-100 px-2.5 py-0.5 text-xs font-semibold text-brand-green-800"
              >
                {{ cuandoOf(r) }}
              </span>
            </div>

            <!-- Dónde -->
            <p v-if="direccionOf(r)" class="mt-2 flex items-start gap-1.5 text-sm text-stone-500">
              <i class="icon-[material-symbols--location-on-outline] mt-0.5 shrink-0 text-sm text-stone-400"></i>
              {{ direccionOf(r) }}
            </p>

            <!-- Precio y pago -->
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
              <div>
                <p class="text-base font-bold text-brand-green-900">
                  {{ formatCurrency(r.precioFinal, monedaOf(r)) }}
                </p>
                <p v-if="pagoMetaOf(r)" class="mt-0.5 flex items-center gap-1.5 text-xs" :class="pagoMetaOf(r).text">
                  <span class="h-1.5 w-1.5 rounded-full" :class="pagoMetaOf(r).dot"></span>
                  {{ pagoMetaOf(r).detalle }}
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <a
                  v-if="direccionOf(r) && esProxima(r)"
                  :href="mapsUrlOf(r)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex h-9 items-center gap-1.5 rounded-full border border-black/[0.08] px-3.5 text-xs font-semibold text-stone-600 no-underline transition-colors hover:bg-stone-50"
                >
                  <i class="icon-[material-symbols--directions-outline] text-sm"></i>
                  Cómo llegar
                </a>
                <RouterLink
                  v-if="r.club?.slug"
                  :to="{ name: 'public-club', params: { slug: r.club.slug } }"
                  class="flex h-9 items-center rounded-full border border-black/[0.08] px-3.5 text-xs font-semibold text-stone-600 no-underline transition-colors hover:bg-stone-50"
                >
                  {{ esProxima(r) ? 'Ver complejo' : 'Volver a reservar' }}
                </RouterLink>
                <button
                  v-if="puedeCancelar(r)"
                  :disabled="cancelandoId === r._id"
                  class="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-error-600 transition-colors hover:bg-error-50 disabled:opacity-50 cursor-pointer"
                  @click="confirmarCancelacion(r)"
                >
                  <i
                    v-if="cancelandoId === r._id"
                    class="icon-[material-symbols--progress-activity] animate-spin text-sm"
                  ></i>
                  {{ cancelandoId === r._id ? 'Cancelando...' : 'Cancelar' }}
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </template>
  </div>
</template>
