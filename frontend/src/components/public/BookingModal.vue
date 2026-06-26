<script setup>
import { ref, computed, watch } from 'vue'
import publicService from '@/services/publicService'
import { dayjs, formatCurrency } from '@/utils/datetime'
import { sportMeta } from '@/utils/turnos'

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

const step = ref(1)
const form = ref({ nombre: '', telefono: '', email: '', notas: '' })
const metodo = ref('mercadopago')
const submitting = ref(false)
const submitError = ref('')
const result = ref(null)

const metodos = [
  { value: 'mercadopago', label: 'MercadoPago', desc: 'Tarjeta, dinero en cuenta o QR', icon: 'pi pi-wallet' },
  { value: 'tarjeta', label: 'Tarjeta de crédito / débito', desc: 'Visa, Mastercard, Amex', icon: 'pi pi-credit-card' },
  { value: 'complejo', label: 'Pagar en el complejo', desc: 'Reservás ahora, pagás al llegar', icon: 'pi pi-building' },
]

const dateLabel = computed(() => {
  if (!props.date) return ''
  const isToday = props.date === dayjs().format('YYYY-MM-DD')
  const l = dayjs(props.date).format('ddd DD MMM')
  const cap = l.charAt(0).toUpperCase() + l.slice(1)
  return isToday ? `Hoy ${dayjs(props.date).format('DD MMM')}` : cap
})

const horario = computed(() => (props.slot ? `${props.slot.horaInicio} – ${props.slot.horaFin}` : ''))
const total = computed(() => props.slot?.precio || 0)

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
      metodo.value = 'mercadopago'
      form.value = {
        nombre: props.prefill.nombre || '',
        telefono: '',
        email: props.prefill.email || '',
        notas: '',
      }
    }
  },
)

const goToPago = () => {
  if (!form.value.nombre.trim() || !form.value.telefono.trim()) {
    submitError.value = 'Completá tu nombre y teléfono.'
    return
  }
  submitError.value = ''
  step.value = 2
}

const confirmar = async () => {
  submitting.value = true
  submitError.value = ''
  try {
    // El pago real con MercadoPago se integra en una etapa posterior; por ahora
    // la reserva se crea como pendiente sin importar el método elegido.
    const res = await publicService.createReservation(props.slug, {
      courtId: props.court._id,
      inicio: props.slot.inicio,
      fin: props.slot.fin,
      guestName: form.value.nombre.trim(),
      guestPhone: form.value.telefono.trim(),
      guestEmail: form.value.email.trim() || undefined,
      notas: form.value.notas.trim() || undefined,
    })
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
      <div class="absolute inset-0 bg-slate-900/50" @click="step !== 3 && emit('close')"></div>

      <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <!-- Header + progress (steps 1-2) -->
        <template v-if="step !== 3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-slate-900">
              {{ step === 1 ? 'Confirmá tus datos' : 'Elegí cómo pagar' }}
            </h3>
            <button class="text-slate-400 hover:text-slate-600 cursor-pointer" @click="emit('close')">
              <i class="pi pi-times"></i>
            </button>
          </div>
          <div class="mt-4 flex gap-1.5">
            <span class="h-1 flex-1 rounded-full bg-primitive-orange-500"></span>
            <span class="h-1 flex-1 rounded-full" :class="step >= 2 ? 'bg-primitive-orange-500' : 'bg-slate-200'"></span>
            <span class="h-1 flex-1 rounded-full bg-slate-200"></span>
          </div>
        </template>

        <!-- Court summary band (steps 1-2) -->
        <div v-if="step !== 3" class="mt-4 rounded-xl border border-slate-200 p-3">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg" :class="sportMeta(court?.tipo).bg">
              <span class="h-2.5 w-2.5 rounded-full" :class="sportMeta(court?.tipo).dot"></span>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-slate-900">{{ club?.nombre }}</p>
              <p class="text-xs text-slate-500">{{ court?.nombre }} · {{ sportMeta(court?.tipo).label }}</p>
            </div>
          </div>
          <div class="mt-2.5 flex items-center justify-between rounded-lg bg-primitive-orange-50 px-3 py-2 text-sm">
            <span class="font-medium text-slate-700">{{ dateLabel }}</span>
            <span class="font-semibold text-primitive-orange-600">{{ horario }}</span>
          </div>
        </div>

        <!-- STEP 1: datos -->
        <div v-if="step === 1" class="mt-4 space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Nombre y apellido</label>
            <input v-model="form.nombre" type="text" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none placeholder:text-neutral-400 focus:border-primitive-orange-400" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Teléfono de contacto</label>
            <input v-model="form.telefono" type="tel" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none placeholder:text-neutral-400 focus:border-primitive-orange-400" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Email <span class="text-neutral-400">(para la confirmación)</span></label>
            <input v-model="form.email" type="email" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none placeholder:text-neutral-400 focus:border-primitive-orange-400" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-slate-600">Notas para el complejo <span class="text-neutral-400">(opcional)</span></label>
            <input v-model="form.notas" type="text" placeholder="Ej: necesito alquilar paletas" class="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 outline-none placeholder:text-neutral-400 focus:border-primitive-orange-400" />
          </div>

          <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ submitError }}</p>

          <div class="mt-2 flex gap-3">
            <button class="h-11 flex-1 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer" @click="emit('close')">
              Cancelar
            </button>
            <button class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primitive-orange-500 text-sm font-semibold text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer" @click="goToPago">
              Continuar <i class="pi pi-arrow-right text-xs"></i>
            </button>
          </div>
        </div>

        <!-- STEP 2: pago -->
        <div v-else-if="step === 2" class="mt-4 space-y-2.5">
          <button
            v-for="m in metodos"
            :key="m.value"
            class="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer"
            :class="metodo === m.value ? 'border-primitive-orange-400 bg-primitive-orange-50' : 'border-slate-200 hover:bg-slate-50'"
            @click="metodo = m.value"
          >
            <i :class="m.icon" class="text-lg text-slate-500"></i>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-800">{{ m.label }}</p>
              <p class="text-xs text-slate-500">{{ m.desc }}</p>
            </div>
            <span class="flex h-5 w-5 items-center justify-center rounded-full border-2" :class="metodo === m.value ? 'border-primitive-orange-500' : 'border-slate-300'">
              <span v-if="metodo === m.value" class="h-2.5 w-2.5 rounded-full bg-primitive-orange-500"></span>
            </span>
          </button>

          <div class="mt-2 rounded-xl bg-slate-50 p-3 text-sm">
            <div class="flex items-center justify-between text-slate-500">
              <span>{{ court?.nombre }} · {{ court?.duracionTurno }} min</span>
              <span>{{ formatCurrency(total, moneda) }}</span>
            </div>
            <div class="mt-1 flex items-center justify-between">
              <span class="font-semibold text-slate-800">Total a pagar</span>
              <span class="text-lg font-bold font-secondary text-slate-900">{{ formatCurrency(total, moneda) }}</span>
            </div>
          </div>

          <p v-if="submitError" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{{ submitError }}</p>

          <div class="mt-2 flex gap-3">
            <button class="h-11 flex-1 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer disabled:opacity-60" :disabled="submitting" @click="step = 1">
              Atrás
            </button>
            <button class="flex h-11 flex-[1.4] items-center justify-center gap-1.5 rounded-lg bg-primitive-orange-500 text-sm font-semibold text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer disabled:opacity-60" :disabled="submitting" @click="confirmar">
              <i v-if="submitting" class="pi pi-spin pi-spinner"></i>
              {{ submitting ? 'Procesando...' : (metodo === 'complejo' ? 'Confirmar reserva' : `Pagar ${formatCurrency(total, moneda)}`) }}
            </button>
          </div>
        </div>

        <!-- STEP 3: confirmado -->
        <div v-else class="text-center">
          <div class="mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-success-50">
            <i class="pi pi-check text-3xl text-success-500"></i>
          </div>
          <h3 class="mt-4 text-xl font-bold text-slate-900">¡Reserva confirmada!</h3>
          <p class="mt-1 text-sm text-slate-500">{{ court?.nombre }} en {{ club?.nombre }}</p>
          <p class="text-sm text-slate-500">{{ dateLabel }} · {{ horario }}</p>

          <div class="mx-auto mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm">
            <span class="text-slate-500">Código: </span>
            <span class="font-bold tracking-wide text-slate-900">{{ codigo }}</span>
          </div>

          <p class="mt-3 text-xs text-slate-500">
            Te enviamos los detalles por WhatsApp y email.<br />Tu reserva quedó registrada como pendiente de confirmación.
          </p>

          <button class="mt-5 h-11 w-full rounded-lg bg-primitive-orange-500 text-sm font-semibold text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer" @click="emit('close')">
            Listo
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
