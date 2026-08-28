<script setup>
import { ref, computed, watch, nextTick, useTemplateRef } from 'vue'
import publicService from '@/services/publicService'
import { dayjs, formatCurrency } from '@/utils/datetime'
import { sportMeta } from '@/utils/turnos'
import { useAuth } from '@/composables/useAuth'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue'

const props = defineProps({
  visible: Boolean,
  slug: String,
  club: Object,
  court: Object,
  date: String, // YYYY-MM-DD
  slot: Object, // { inicio, fin, horaInicio, horaFin, precio }
  moneda: { type: String, default: 'ARS' },
  prefill: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['close', 'confirmed'])

const { isAuthenticated, loginWithGoogle } = useAuth()

const step = ref(1)
const form = ref({ nombre: '', telefono: '', email: '', notas: '' })
const metodo = ref('mercadopago')
const submitting = ref(false)
const submitError = ref('')
const result = ref(null)

// Config de cobro del complejo (viene de /public/clubs/:slug).
const pagos = computed(() => props.club?.pagos || {})
const cobraOnline = computed(() => pagos.value.online === true)
const total = computed(() => props.slot?.precio || 0)

// Cuánto se cobra ahora. El backend lo recalcula igual (nunca se confía en el
// cliente para fijar un precio); acá es sólo para mostrarlo antes de pagar.
const aPagarAhora = computed(() => {
  if (!cobraOnline.value || pagos.value.modalidad !== 'sena') return total.value
  const valor = Number(pagos.value.senaValor) || 0
  const monto = pagos.value.senaTipo === 'fijo' ? valor : (total.value * valor) / 100
  return Math.min(Math.round(monto), total.value)
})
const saldo = computed(() => Math.max(total.value - aPagarAhora.value, 0))
const esSena = computed(() => cobraOnline.value && saldo.value > 0)

// Los métodos disponibles dependen del complejo: sin cuenta de MercadoPago
// conectada, la única opción posible es pagar al llegar.
const metodos = computed(() => {
  const opciones = []
  if (cobraOnline.value) {
    opciones.push({
      value: 'mercadopago',
      label: 'MercadoPago',
      desc: 'Tarjeta, dinero en cuenta o QR',
      icon: 'icon-[material-symbols--account-balance-wallet]',
    })
  }
  if (pagos.value.permitePagoEnComplejo !== false) {
    opciones.push({
      value: 'complejo',
      label: 'Pagar en el complejo',
      desc: 'Reservás ahora, pagás al llegar',
      icon: 'icon-[material-symbols--apartment]',
    })
  }
  return opciones
})

const dateLabel = computed(() => {
  if (!props.date) return ''
  const isToday = props.date === dayjs().format('YYYY-MM-DD')
  const l = dayjs(props.date).format('ddd DD MMM')
  const cap = l.charAt(0).toUpperCase() + l.slice(1)
  return isToday ? `Hoy ${dayjs(props.date).format('DD MMM')}` : cap
})

const horario = computed(() => (props.slot ? `${props.slot.horaInicio} – ${props.slot.horaFin}` : ''))

const codigo = computed(() =>
  result.value ? `CI-${String(result.value.reservation._id).slice(-4).toUpperCase()}` : '',
)

// Reset al abrir.
watch(
  () => props.visible,
  (v) => {
    if (v) {
      step.value = 1
      submitError.value = ''
      result.value = null
      metodo.value = metodos.value[0]?.value || 'complejo'
      form.value = {
        nombre: props.prefill.nombre || '',
        telefono: props.prefill.telefono || '',
        email: props.prefill.email || '',
        notas: '',
      }
    }
  },
)

// Entrar con Google sin salir de la reserva.
//
// Acá está el momento en que más rinde: la persona ya eligió cancha y horario, y
// mandarla a /login para volver después es la forma más segura de perderla. Con
// la sesión abierta, `api` empieza a mandar el token y el backend engancha la
// reserva a su cuenta (ver attachUserOptional) — que es lo que convierte una
// reserva suelta en historial, favoritos y notificaciones.
//
// Nada de esto es obligatorio: reservar como invitado sigue siendo un camino
// completo, y por eso el botón es una opción arriba y no un portón adelante.
const googleError = ref('')
const telefonoInput = useTemplateRef('telefonoInput')

// Google no da el teléfono, así que después de entrar suele quedar ese único
// campo vacío en medio de un formulario que se completó solo. Se le lleva el
// cursor para que se vea dónde seguir.
const enfocarTelefono = () => nextTick(() => telefonoInput.value?.focus())

const onGoogleCredential = async (credential) => {
  googleError.value = ''

  try {
    const { user } = await loginWithGoogle(credential)
    form.value.nombre = user?.nombre || form.value.nombre
    form.value.email = user?.email || form.value.email
    // El teléfono no viene de Google, pero sí puede estar guardado en la cuenta
    // de quien ya reservó antes. Si está, esto completa el formulario entero.
    form.value.telefono = user?.telefono || form.value.telefono

    if (!form.value.telefono) enfocarTelefono()
  } catch (err) {
    console.error(err)
    googleError.value = err.response?.data?.message || 'No se pudo iniciar sesión con Google.'
  }
}

const goToPago = () => {
  // El mensaje nombra sólo lo que falta de verdad. Uno solo para los dos campos
  // manda a revisar el que ya estaba bien: entrando con Google, el nombre llega
  // completo y el único hueco es el teléfono, así que "completá tu nombre y
  // teléfono" se lee como un error del sistema.
  const faltan = []
  if (!form.value.nombre.trim()) faltan.push('tu nombre')
  if (!form.value.telefono.trim()) faltan.push('tu teléfono')

  if (faltan.length) {
    submitError.value = `Completá ${faltan.join(' y ')} para continuar.`
    if (!form.value.telefono.trim()) enfocarTelefono()
    return
  }

  submitError.value = ''
  step.value = 2
}

const confirmar = async () => {
  submitting.value = true
  submitError.value = ''
  try {
    const res = await publicService.createReservation(props.slug, {
      courtId: props.court._id,
      inicio: props.slot.inicio,
      fin: props.slot.fin,
      guestName: form.value.nombre.trim(),
      guestPhone: form.value.telefono.trim(),
      guestEmail: form.value.email.trim() || undefined,
      notas: form.value.notas.trim() || undefined,
      metodoPago: metodo.value,
    })

    // Con pago online la reserva todavía NO está confirmada: queda el horario
    // bloqueado unos minutos y se va a MercadoPago. La confirmación la da el
    // webhook cuando el pago se acredita, y al volver aterriza en /reserva/:token.
    if (res.pago?.initPoint) {
      window.location.href = res.pago.initPoint
      return
    }

    result.value = res
    step.value = 3
    emit('confirmed', res)
  } catch (err) {
    console.error(err)
    submitError.value = err.response?.data?.message || 'No se pudo confirmar la reserva. Probá de nuevo.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 text-brand-green-900/50" @click="step !== 3 && emit('close')"></div>

      <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <!-- Header + progress (steps 1-2) -->
        <template v-if="step !== 3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-stone-900">
              {{ step === 1 ? 'Confirmá tus datos' : 'Elegí cómo pagar' }}
            </h3>
            <button class="text-stone-400 hover:text-stone-600 cursor-pointer" @click="emit('close')">
              <i class="icon-[material-symbols--close]"></i>
            </button>
          </div>
          <div class="mt-4 flex gap-1.5">
            <span class="h-1 flex-1 rounded-full bg-brand-green-500"></span>
            <span class="h-1 flex-1 rounded-full" :class="step >= 2 ? 'bg-brand-green-500' : 'bg-stone-200'"></span>
            <span class="h-1 flex-1 rounded-full bg-stone-200"></span>
          </div>
        </template>

        <!-- Court summary band (steps 1-2) -->
        <div v-if="step !== 3" class="mt-4 rounded-xl border border-stone-200 p-3">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" :class="sportMeta(court?.tipo).bg">
              <span class="h-2.5 w-2.5 rounded-full" :class="sportMeta(court?.tipo).dot"></span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-stone-900">{{ club?.nombre }}</p>
              <p class="text-xs text-stone-500">{{ court?.nombre }} · {{ sportMeta(court?.tipo).label }}</p>
            </div>
          </div>
          <div class="mt-2.5 flex items-center justify-between rounded-lg bg-brand-green-50 px-3 py-2 text-sm">
            <span class="font-medium text-stone-700">{{ dateLabel }}</span>
            <span class="font-semibold text-brand-green-600">{{ horario }}</span>
          </div>
        </div>

        <!-- STEP 1: datos -->
        <div v-if="step === 1" class="mt-4 space-y-3">
          <!-- Acceso con Google, sólo si todavía no hay sesión -->
          <template v-if="!isAuthenticated">
            <div class="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p class="mb-2.5 text-center text-xs text-stone-500">
                Entrá con Google y tené todas tus reservas en un solo lugar
              </p>
              <GoogleSignInButton text="continue_with" @credential="onGoogleCredential" />
              <p v-if="googleError" class="mt-2 text-center text-xs text-error-600">{{ googleError }}</p>
            </div>
            <div class="flex items-center gap-3 py-0.5">
              <span class="h-px flex-1 bg-stone-200"></span>
              <span class="text-xs font-medium text-stone-400">o seguí como invitado</span>
              <span class="h-px flex-1 bg-stone-200"></span>
            </div>
          </template>

          <div>
            <label class="mb-1 block text-xs font-medium text-stone-600">Nombre y apellido</label>
            <input v-model="form.nombre" type="text" class="h-10 w-full rounded-lg border border-stone-200 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-green-400" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-stone-600">Teléfono de contacto</label>
            <input ref="telefonoInput" v-model="form.telefono" type="tel" class="h-10 w-full rounded-lg border border-stone-200 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-green-400" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-stone-600">Email <span class="text-stone-400">(para la confirmación)</span></label>
            <input v-model="form.email" type="email" class="h-10 w-full rounded-lg border border-stone-200 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-green-400" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-stone-600">Notas para el complejo <span class="text-stone-400">(opcional)</span></label>
            <input v-model="form.notas" type="text" placeholder="Ej: necesito alquilar paletas" class="h-10 w-full rounded-lg border border-stone-200 px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-brand-green-400" />
          </div>

          <p v-if="submitError" class="rounded-lg bg-error-50 px-3 py-2 text-xs text-error-600">{{ submitError }}</p>

          <div class="mt-2 flex gap-3">
            <button class="h-11 flex-1 rounded-full border border-stone-200 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 cursor-pointer" @click="emit('close')">
              Cancelar
            </button>
            <button class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer" @click="goToPago">
              Continuar <i class="icon-[material-symbols--arrow-forward] text-xs"></i>
            </button>
          </div>
        </div>

        <!-- STEP 2: pago -->
        <div v-else-if="step === 2" class="mt-4 space-y-2.5">
          <button
            v-for="m in metodos"
            :key="m.value"
            class="flex w-full items-center gap-3 rounded-full border p-3 text-left transition-colors cursor-pointer"
            :class="metodo === m.value ? 'border-brand-green-400 bg-brand-green-50' : 'border-stone-200 hover:bg-stone-50'"
            @click="metodo = m.value"
          >
            <i :class="m.icon" class="text-lg text-stone-500"></i>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-stone-800">{{ m.label }}</p>
              <p class="text-xs text-stone-500">{{ m.desc }}</p>
            </div>
            <span class="flex h-5 w-5 items-center justify-center rounded-full border-2" :class="metodo === m.value ? 'border-brand-green-500' : 'border-stone-300'">
              <span v-if="metodo === m.value" class="h-2.5 w-2.5 rounded-full bg-brand-green-500"></span>
            </span>
          </button>

          <div class="mt-2 rounded-xl bg-stone-50 p-3 text-sm">
            <div class="flex items-center justify-between text-stone-500">
              <span>{{ court?.nombre }} · {{ court?.duracionTurno }} min</span>
              <span>{{ formatCurrency(total, moneda) }}</span>
            </div>
            <div v-if="esSena && metodo === 'mercadopago'" class="mt-1 flex items-center justify-between text-stone-500">
              <span>Resta en el complejo</span>
              <span>{{ formatCurrency(saldo, moneda) }}</span>
            </div>
            <div class="mt-1 flex items-center justify-between">
              <span class="font-semibold text-stone-800">
                {{ metodo === 'complejo' ? 'Total a pagar al llegar' : esSena ? 'Seña a pagar ahora' : 'Total a pagar' }}
              </span>
              <span class="text-lg font-bold font-secondary text-stone-900">
                {{ formatCurrency(metodo === 'complejo' ? total : aPagarAhora, moneda) }}
              </span>
            </div>
          </div>

          <p v-if="metodo === 'mercadopago'" class="flex items-start gap-1.5 px-1 text-xs text-stone-400">
            <i class="icon-[material-symbols--lock] mt-0.5 shrink-0"></i>
            <span>Te llevamos a MercadoPago. El horario queda reservado 15 minutos mientras pagás.</span>
          </p>

          <p v-if="submitError" class="rounded-lg bg-error-50 px-3 py-2 text-xs text-error-600">{{ submitError }}</p>

          <div class="mt-2 flex gap-3">
            <button class="h-11 flex-1 rounded-full border border-stone-200 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 cursor-pointer disabled:opacity-60" :disabled="submitting" @click="step = 1">
              Atrás
            </button>
            <button class="flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer disabled:opacity-60" :disabled="submitting" @click="confirmar">
              <i v-if="submitting" class="icon-[material-symbols--progress-activity] animate-spin"></i>
              {{ submitting ? 'Procesando...' : (metodo === 'complejo' ? 'Confirmar reserva' : `Pagar ${formatCurrency(aPagarAhora, moneda)}`) }}
            </button>
          </div>
        </div>

        <!-- STEP 3: confirmado -->
        <div v-else class="text-center">
          <div class="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
            <i class="icon-[material-symbols--check] text-3xl text-success-500"></i>
          </div>
          <h3 class="mt-4 text-xl font-bold text-stone-900">¡Reserva registrada!</h3>
          <p class="mt-1 text-sm text-stone-500">{{ court?.nombre }} en {{ club?.nombre }}</p>
          <p class="text-sm text-stone-500">{{ dateLabel }} · {{ horario }}</p>

          <div class="mx-auto mt-4 rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-2.5 text-sm">
            <span class="text-stone-500">Código: </span>
            <span class="font-bold tracking-wide text-stone-900">{{ codigo }}</span>
          </div>

          <p class="mt-3 text-xs text-stone-500">
            Te enviamos los detalles por email.<br />Pagás al llegar al complejo.
          </p>

          <button class="mt-5 h-11 w-full rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer" @click="emit('close')">
            Listo
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
