<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import publicService from '@/services/publicService'
import { dayjs, formatCurrency, DEFAULT_TZ } from '@/utils/datetime'
import { ESTADO_META } from '@/utils/turnos'

const route = useRoute()
const router = useRouter()
const token = route.params.token

const reservation = ref(null)
const loading = ref(true)
const error = ref('')

const cancelling = ref(false)
const cancelError = ref('')
const confirmingCancel = ref(false)

// --- Vuelta desde MercadoPago ---
//
// `?pago=` lo pone MercadoPago al redirigir y es sólo un indicio: quien
// confirma de verdad es el webhook. Por eso, ante un "success", la pantalla
// sondea el estado real en vez de dar por hecho que ya está pagada.
const pagoRetorno = ref(route.query.pago || null)
const verificandoPago = ref(false)
const reintentando = ref(false)
const reintentoError = ref('')

const POLL_INTERVALO_MS = 2000
const POLL_MAX_MS = 40000
let pollTimer = null

const pago = computed(() => reservation.value?.pago || { estado: 'no_requerido' })
const esperandoPago = computed(() => pago.value.estado === 'pendiente')
const pagada = computed(() => pago.value.estado === 'pagado')

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

/**
 * Sondea hasta que el pago se acredite.
 *
 * El backend, además de leer su base, le pregunta a MercadoPago: si el webhook
 * se demoró o se perdió, esta consulta igual termina confirmando la reserva.
 * Se corta a los 40 s para no dejar la pantalla girando: a esa altura, o el
 * pago quedó "en proceso" (débito, transferencia) o algo falló, y en los dos
 * casos el jugador va a recibir el email cuando se acredite.
 */
const esperarAcreditacion = async () => {
  verificandoPago.value = true
  const limite = Date.now() + POLL_MAX_MS

  const tick = async () => {
    try {
      const estado = await publicService.getPaymentStatus(token)
      if (estado.estado !== 'pendiente') {
        await fetchReservation()
        verificandoPago.value = false
        return
      }
    } catch (err) {
      console.error(err)
    }

    if (Date.now() >= limite) {
      verificandoPago.value = false
      return
    }
    pollTimer = setTimeout(tick, POLL_INTERVALO_MS)
  }

  await tick()
}

const reintentarPago = async () => {
  reintentando.value = true
  reintentoError.value = ''
  try {
    const nuevo = await publicService.retryPayment(token)
    window.location.href = nuevo.initPoint
  } catch (err) {
    console.error(err)
    reintentoError.value = err.response?.data?.message || 'No se pudo reiniciar el pago.'
    reintentando.value = false
  }
}

onMounted(async () => {
  await fetchReservation()

  // Se limpia la query: un refresh no tiene por qué volver a mostrar el cartel
  // de "pago exitoso" cuando la reserva ya está resuelta.
  if (route.query.pago) router.replace({ query: {} })

  if (pagoRetorno.value === 'success' && esperandoPago.value) {
    await esperarAcreditacion()
  }
})

onUnmounted(() => clearTimeout(pollTimer))
</script>

<template>
  <div class="mx-auto max-w-lg">
    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-stone-400"></i>
      <p class="mt-4 text-sm text-stone-500">Cargando reserva...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--warning] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-stone-900">{{ error }}</h3>
      <RouterLink :to="{ name: 'public-buscar' }" class="!mt-3 text-sm font-medium text-brand-green-500 no-underline">
        Buscar canchas
      </RouterLink>
    </div>

    <!-- Reservation -->
    <div v-else class="rounded-2xl border border-stone-200 bg-white">
      <div class="flex items-center justify-between border-b border-stone-100 px-6 py-4">
        <h1 class="text-base font-semibold text-stone-900">Tu reserva</h1>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-2.5 py-1 text-xs font-medium" :class="estadoMeta.text">
          <span class="h-1.5 w-1.5 rounded-full" :class="estadoMeta.dot"></span>
          {{ estadoMeta.label }}
        </span>
      </div>

      <!-- Estado del pago (sólo para reservas que se cobran online) -->
      <div v-if="verificandoPago" class="flex items-start gap-3 border-b border-stone-100 bg-brand-green-50 px-6 py-4">
        <i class="icon-[material-symbols--progress-activity] mt-0.5 animate-spin text-lg text-brand-green-600"></i>
        <div>
          <p class="text-sm font-semibold text-stone-800">Confirmando tu pago...</p>
          <p class="text-xs text-stone-500">Puede tardar unos segundos. No cierres esta página.</p>
        </div>
      </div>

      <div v-else-if="pagada" class="flex items-start gap-3 border-b border-stone-100 bg-success-50 px-6 py-4">
        <i class="icon-[material-symbols--check-circle] mt-0.5 text-lg text-success-600"></i>
        <div>
          <p class="text-sm font-semibold text-stone-800">
            Pago acreditado · {{ formatCurrency(pago.montoPagado, moneda) }}
          </p>
          <p v-if="pago.saldoPendiente > 0" class="text-xs text-stone-500">
            Pagaste la seña. Al llegar abonás los {{ formatCurrency(pago.saldoPendiente, moneda) }} restantes.
          </p>
          <p v-else class="text-xs text-stone-500">El turno está pago en su totalidad.</p>
        </div>
      </div>

      <div v-else-if="pago.estado === 'reembolsado'" class="flex items-start gap-3 border-b border-stone-100 bg-stone-50 px-6 py-4">
        <i class="icon-[material-symbols--undo] mt-0.5 text-lg text-stone-500"></i>
        <div>
          <p class="text-sm font-semibold text-stone-800">Pago devuelto</p>
          <p class="text-xs text-stone-500">El complejo te devolvió el dinero de esta reserva.</p>
        </div>
      </div>

      <div v-else-if="esperandoPago" class="border-b border-stone-100 bg-warning-50 px-6 py-4">
        <div class="flex items-start gap-3">
          <i class="icon-[material-symbols--schedule] mt-0.5 text-lg text-warning-600"></i>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-stone-800">
              {{ pagoRetorno === 'pending' ? 'Tu pago está en proceso' : 'Falta pagar' }}
            </p>
            <p class="text-xs text-stone-500">
              {{
                pagoRetorno === 'pending'
                  ? 'Algunos medios de pago tardan en acreditarse. Te avisamos por email en cuanto se confirme.'
                  : 'El horario queda reservado hasta que venza el tiempo de pago.'
              }}
            </p>
          </div>
        </div>

        <p v-if="reintentoError" class="mt-3 rounded-lg bg-error-50 px-3 py-2 text-xs text-error-600">{{ reintentoError }}</p>

        <button
          v-if="pagoRetorno !== 'pending'"
          class="mt-3 h-9 rounded-full bg-brand-lime-500 px-4 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:opacity-60 cursor-pointer"
          :disabled="reintentando"
          @click="reintentarPago"
        >
          <i v-if="reintentando" class="icon-[material-symbols--progress-activity] animate-spin mr-1.5"></i>
          {{ reintentando ? 'Abriendo...' : 'Pagar ahora' }}
        </button>
      </div>

      <div class="space-y-4 px-6 py-5">
        <div>
          <p class="text-xs text-stone-400">Complejo</p>
          <p class="text-sm font-semibold text-stone-800">{{ reservation.club?.nombre }}</p>
          <p v-if="reservation.club?.direccion" class="text-xs text-stone-500">{{ reservation.club.direccion }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-stone-400">Cancha</p>
            <p class="text-sm font-semibold text-stone-800">{{ reservation.court?.nombre }}</p>
          </div>
          <div>
            <p class="text-xs text-stone-400">Precio</p>
            <p class="text-sm font-semibold text-stone-800">{{ formatCurrency(reservation.precioFinal, moneda) }}</p>
          </div>
        </div>

        <div>
          <p class="text-xs text-stone-400">Fecha</p>
          <p class="text-sm font-semibold text-stone-800">{{ fecha }}</p>
        </div>
        <div>
          <p class="text-xs text-stone-400">Horario</p>
          <p class="text-sm font-semibold text-stone-800">{{ horario }} hs</p>
        </div>
        <div v-if="reservation.guestName">
          <p class="text-xs text-stone-400">A nombre de</p>
          <p class="text-sm font-semibold text-stone-800">{{ reservation.guestName }}</p>
        </div>
      </div>

      <!-- Cancel -->
      <div v-if="canCancel" class="border-t border-stone-100 px-6 py-4">
        <template v-if="!confirmingCancel">
          <button class="text-sm font-medium text-error-500 hover:text-error-600 cursor-pointer" @click="confirmingCancel = true">
            Cancelar reserva
          </button>
        </template>
        <template v-else>
          <p class="text-sm text-stone-700">¿Seguro que querés cancelar esta reserva?</p>
          <p v-if="cancelError" class="mt-2 rounded-lg bg-error-50 px-3 py-2 text-xs text-error-600">{{ cancelError }}</p>
          <div class="mt-3 flex gap-2">
            <button
              class="h-9 rounded-full bg-error-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-error-600 disabled:opacity-60 cursor-pointer"
              :disabled="cancelling"
              @click="confirmCancel"
            >
              <i v-if="cancelling" class="icon-[material-symbols--progress-activity] animate-spin mr-1.5"></i>
              {{ cancelling ? 'Cancelando...' : 'Sí, cancelar' }}
            </button>
            <button class="h-9 rounded-full border border-stone-200 px-4 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 cursor-pointer" :disabled="cancelling" @click="confirmingCancel = false">
              No
            </button>
          </div>
        </template>
      </div>

      <div v-else-if="reservation.estado === 'cancelada'" class="border-t border-stone-100 px-6 py-4">
        <p class="text-sm text-stone-500">Esta reserva fue cancelada.</p>
      </div>
    </div>
  </div>
</template>
