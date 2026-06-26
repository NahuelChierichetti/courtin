<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import publicService from '@/services/publicService'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'
import { ESTADO_META } from '@/utils/turnos'

const route = useRoute()
const token = route.params.token

const reservation = ref(null)
const loading = ref(true)
const error = ref('')

const cancelling = ref(false)
const cancelError = ref('')
const confirmingCancel = ref(false)

const tz = computed(() => reservation.value?.club?.timezone || DEFAULT_TZ)
const moneda = computed(() => reservation.value?.club?.moneda || 'ARS')

const estadoMeta = computed(() => ESTADO_META[reservation.value?.estado] || ESTADO_META.pendiente)

const fecha = computed(() => {
  if (!reservation.value) return ''
  const l = dayjs.utc(reservation.value.inicio).tz(tz.value).format('dddd DD [de] MMMM, YYYY')
  return l.charAt(0).toUpperCase() + l.slice(1)
})

const horario = computed(() => {
  if (!reservation.value) return ''
  const start = dayjs.utc(reservation.value.inicio).tz(tz.value).format('HH:mm')
  const end = dayjs.utc(reservation.value.fin).tz(tz.value).format('HH:mm')
  return `${start} – ${end}`
})

const canCancel = computed(
  () => reservation.value && ['pendiente', 'confirmada'].includes(reservation.value.estado),
)

const fetchReservation = async () => {
  loading.value = true
  error.value = ''
  try {
    reservation.value = await publicService.getReservationByToken(token)
  } catch (err) {
    console.error(err)
    error.value = 'No encontramos esta reserva. El link puede ser inválido.'
  } finally {
    loading.value = false
  }
}

const confirmCancel = async () => {
  cancelling.value = true
  cancelError.value = ''
  try {
    reservation.value = await publicService.cancelReservationByToken(token)
    confirmingCancel.value = false
  } catch (err) {
    console.error(err)
    cancelError.value = err.response?.data?.message || 'No se pudo cancelar la reserva.'
  } finally {
    cancelling.value = false
  }
}

onMounted(fetchReservation)
</script>

<template>
  <div class="mx-auto max-w-lg">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="pi pi-spin pi-spinner text-3xl text-neutral-400"></i>
      <p class="mt-4 text-sm text-slate-500">Cargando reserva...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="pi pi-exclamation-triangle text-2xl text-neutral-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">{{ error }}</h3>
      <RouterLink :to="{ name: 'public-buscar' }" class="!mt-3 text-sm font-medium text-primitive-orange-500 no-underline">
        Buscar canchas
      </RouterLink>
    </div>

    <!-- Reservation -->
    <div v-else class="rounded-2xl border border-slate-200 bg-white">
      <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h1 class="text-base font-semibold text-slate-900">Tu reserva</h1>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium" :class="estadoMeta.text">
          <span class="h-1.5 w-1.5 rounded-full" :class="estadoMeta.dot"></span>
          {{ estadoMeta.label }}
        </span>
      </div>

      <div class="space-y-4 px-6 py-5">
        <div>
          <p class="text-xs text-neutral-400">Complejo</p>
          <p class="text-sm font-semibold text-slate-800">{{ reservation.club?.nombre }}</p>
          <p v-if="reservation.club?.direccion" class="text-xs text-slate-500">{{ reservation.club.direccion }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-neutral-400">Cancha</p>
            <p class="text-sm font-semibold text-slate-800">{{ reservation.court?.nombre }}</p>
          </div>
          <div>
            <p class="text-xs text-neutral-400">Precio</p>
            <p class="text-sm font-semibold text-slate-800">{{ formatCurrency(reservation.precioFinal, moneda) }}</p>
          </div>
        </div>

        <div>
          <p class="text-xs text-neutral-400">Fecha</p>
          <p class="text-sm font-semibold text-slate-800">{{ fecha }}</p>
        </div>
        <div>
          <p class="text-xs text-neutral-400">Horario</p>
          <p class="text-sm font-semibold text-slate-800">{{ horario }} hs</p>
        </div>
        <div v-if="reservation.guestName">
          <p class="text-xs text-neutral-400">A nombre de</p>
          <p class="text-sm font-semibold text-slate-800">{{ reservation.guestName }}</p>
        </div>
      </div>

      <!-- Cancel -->
      <div v-if="canCancel" class="border-t border-slate-100 px-6 py-4">
        <template v-if="!confirmingCancel">
          <button class="text-sm font-medium text-red-500 hover:text-red-600 cursor-pointer" @click="confirmingCancel = true">
            Cancelar reserva
          </button>
        </template>
        <template v-else>
          <p class="text-sm text-slate-700">¿Seguro que querés cancelar esta reserva?</p>
          <p v-if="cancelError" class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ cancelError }}</p>
          <div class="mt-3 flex gap-2">
            <button
              class="h-9 rounded-lg bg-red-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60 cursor-pointer"
              :disabled="cancelling"
              @click="confirmCancel"
            >
              <i v-if="cancelling" class="pi pi-spin pi-spinner mr-1.5"></i>
              {{ cancelling ? 'Cancelando...' : 'Sí, cancelar' }}
            </button>
            <button class="h-9 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer" :disabled="cancelling" @click="confirmingCancel = false">
              No
            </button>
          </div>
        </template>
      </div>

      <div v-else-if="reservation.estado === 'cancelada'" class="border-t border-slate-100 px-6 py-4">
        <p class="text-sm text-slate-500">Esta reserva fue cancelada.</p>
      </div>
    </div>
  </div>
</template>
