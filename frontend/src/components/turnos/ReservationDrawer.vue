<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50 flex justify-end" @click="handleOverlayClick">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/30 transition-opacity" />

        <!-- Drawer panel -->
        <div class="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-black/[0.06] px-4 py-5 sm:px-6">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="[selectedSport.bg, selectedSport.text]"
            >
              <i class="icon-[material-symbols--calendar-month] text-base"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-brand-green-900">{{ isEditing ? 'Editar turno' : 'Nuevo turno' }}</h2>
              <p class="truncate text-sm text-stone-400">{{ subtitle }}</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 cursor-pointer"
              @click="emit('close')"
            >
              <i class="icon-[material-symbols--close] text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div class="space-y-5">
              <!-- Error del backend o de los campos obligatorios -->
              <div
                v-if="serverError || localError"
                class="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-600"
              >
                <i class="icon-[material-symbols--error] mt-0.5 text-xs"></i>
                <span>{{ serverError || localError }}</span>
              </div>

              <!-- Este turno viene de un turno fijo. Importa decirlo antes de
                   que toquen "Cancelar turno": lo que se cancela es ESTE día y
                   no la serie, y esa diferencia es todo el feature. -->
              <div
                v-if="form.esFijo"
                class="flex items-start gap-2.5 rounded-xl border border-brand-purple-100 bg-brand-purple-50/60 px-3.5 py-3"
              >
                <i class="icon-[material-symbols--push-pin] mt-0.5 text-xs text-brand-purple-500"></i>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-brand-green-900">Turno fijo</p>
                  <p class="mt-0.5 text-xs text-stone-500">
                    Se repite todas las semanas. Si cancelás, se libera <strong>sólo este día</strong> y la serie sigue.
                  </p>
                </div>
              </div>

              <!-- Cobro online. Sólo aparece en turnos que se pagan (o se
                   pagaron) por la web: en los cargados a mano no hay nada que
                   mostrar y el bloque sería ruido. -->
              <div v-if="pago" class="rounded-xl border border-black/[0.08] p-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold tracking-wider text-stone-400 uppercase">Cobro online</span>
                  <span class="inline-flex items-center gap-1.5 text-xs font-semibold" :class="pago.text">
                    <span class="h-1.5 w-1.5 rounded-full" :class="pago.dot"></span>
                    {{ pago.label }}
                  </span>
                </div>
                <p class="mt-1 text-xs text-stone-400">{{ pago.detalle }}</p>

                <p v-if="refundError" class="mt-3 rounded-lg bg-error-50 px-3 py-2 text-xs text-error-600">
                  {{ refundError }}
                </p>

                <template v-if="puedeDevolver">
                  <button
                    v-if="!confirmandoRefund"
                    class="mt-3 text-xs font-medium text-error-500 hover:underline cursor-pointer"
                    @click="confirmandoRefund = true"
                  >
                    Devolver pago
                  </button>
                  <div v-else class="mt-3 rounded-lg border border-error-200 bg-error-50 p-3">
                    <p class="text-xs text-stone-600">
                      Se le devuelven {{ formatCurrency(reservation?.pago?.montoPagado, currency) }} al jugador por
                      MercadoPago. No se puede deshacer.
                    </p>
                    <div class="mt-2.5 flex gap-2">
                      <button
                        class="flex-1 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50 cursor-pointer"
                        :disabled="refunding"
                        @click="confirmandoRefund = false"
                      >
                        Cancelar
                      </button>
                      <button
                        class="flex-1 rounded-full bg-error-500 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-95 cursor-pointer disabled:opacity-60"
                        :disabled="refunding"
                        @click="emit('refund', form._id)"
                      >
                        {{ refunding ? 'Devolviendo...' : 'Sí, devolver' }}
                      </button>
                    </div>
                  </div>
                </template>
              </div>

              <!-- Cliente -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Cliente<span class="ml-0.5 text-error-500">*</span></label>
                <input
                  v-model="form.guestName"
                  type="text"
                  placeholder="Nombre y apellido"
                  class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
              </div>

              <!-- Teléfono + Email -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Teléfono<span class="ml-0.5 text-error-500">*</span></label>
                  <input
                    v-model="form.guestPhone"
                    type="tel"
                    placeholder="Ej: 11 2345 6789"
                    class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">
                    Email <span class="font-normal normal-case tracking-normal text-stone-300">(cliente)</span>
                  </label>
                  <input
                    v-model="form.guestEmail"
                    type="email"
                    placeholder="cliente@mail.com"
                    class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                  />
                </div>
              </div>

              <!-- Avisar por WhatsApp.
                   Sólo en turnos guardados Y confirmados (ver `avisable`): el
                   mensaje se arma con los datos guardados (`reservation`), no
                   con lo que hay a medio editar en el formulario. -->
              <!-- Pintado con el verde de WhatsApp (#25D366), igual que el
                   bloque de MercadoPago usa su celeste: es una marca de afuera y
                   se reconoce por el color antes que por el texto. Los botones
                   blancos son los que tienen que saltar sobre el verde. -->
              <div v-if="avisable && puedeAvisar" class="rounded-xl bg-[#25D366] p-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold tracking-wider text-white uppercase">
                    Avisar por WhatsApp
                  </span>
                  <WhatsappIcon class="h-4 w-4 text-white" />
                </div>

                <div class="mt-3 grid grid-cols-2 gap-2">
                  <button
                    class="flex items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#25D366] shadow-sm transition-colors hover:bg-stone-50 cursor-pointer"
                    @click="abrirWhatsapp('confirmacion')"
                  >
                    <i class="icon-[material-symbols--check-circle-outline] text-sm"></i>
                    Confirmación
                  </button>
                  <button
                    class="flex items-center justify-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#25D366] shadow-sm transition-colors hover:bg-stone-50 cursor-pointer"
                    @click="abrirWhatsapp('recordatorio')"
                  >
                    <i class="icon-[material-symbols--alarm-outline] text-sm"></i>
                    Recordatorio
                  </button>
                </div>

                <!-- Que quede claro que abre el chat con el mensaje escrito y
                     que el envío lo hace la persona. Un botón que promete
                     "enviar" y en realidad abre WhatsApp se siente roto. -->
                <p class="mt-2.5 text-xs text-white">
                  Se abre WhatsApp con el mensaje listo para enviar.
                </p>
              </div>

              <!-- Sin teléfono usable no hay nada que hacer, así que el bloque
                   no se pinta: el verde es la invitación a apretar el botón. -->
              <div v-else-if="avisable" class="rounded-xl border border-black/[0.08] p-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold tracking-wider text-stone-400 uppercase">Avisar por WhatsApp</span>
                  <WhatsappIcon class="h-4 w-4 text-stone-300" />
                </div>
                <p class="mt-2 text-xs text-stone-400">
                  {{
                    reservation?.guestPhone
                      ? 'El teléfono guardado no permite armar un chat de WhatsApp. Corregilo y guardá para poder avisarle.'
                      : 'Este turno no tiene teléfono cargado. Agregalo y guardá para poder avisarle.'
                  }}
                </p>
              </div>

              <!-- Cancha -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Cancha<span class="ml-0.5 text-error-500">*</span></label>
                <Select
                  v-model="form.courtId"
                  :options="courtOptions"
                  option-label="label"
                  option-value="value"
                  placeholder="Elegí la cancha"
                  class="h-[42px] w-full text-sm"
                />
              </div>

              <!-- Fecha -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Fecha<span class="ml-0.5 text-error-500">*</span></label>
                <input
                  v-model="form.fecha"
                  type="date"
                  class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-brand-green-900 outline-none transition-colors focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
                <p v-if="openRange" class="mt-2.5 text-xs text-stone-400">
                  Atención: {{ minutesToTime(openRange.startMin) }} a {{ minutesToTime(openRange.endMin) }}
                </p>
              </div>

              <!-- Horario -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Desde<span class="ml-0.5 text-error-500">*</span></label>
                  <Select
                    v-model="form.horaInicio"
                    :options="horasOptions"
                    class="h-[42px] w-full text-sm"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Hasta<span class="ml-0.5 text-error-500">*</span></label>
                  <Select
                    v-model="form.horaFin"
                    :options="horasOptions"
                    class="h-[42px] w-full text-sm"
                  />
                </div>
              </div>

              <!-- Estado -->
              <div v-if="!form.esFijo">
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Estado</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in estadoOptions"
                    :key="opt.value"
                    class="rounded-full border px-2 py-2 text-xs font-medium transition-colors cursor-pointer"
                    :class="form.estado === opt.value
                      ? 'border-brand-purple-500 bg-brand-purple-500 text-white'
                      : 'border-black/[0.08] bg-white text-stone-600 hover:bg-stone-50'"
                    @click="form.estado = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- Precio -->
              <div>
                <div class="mb-1.5 flex items-center justify-between">
                  <label class="text-xs font-semibold tracking-wider text-stone-400 uppercase">Precio</label>
                  <button
                    v-if="suggested != null && suggested !== form.precioFinal"
                    class="text-xs font-medium text-brand-green-500 transition-colors hover:text-brand-green-600 cursor-pointer"
                    @click="applySuggested"
                  >
                    Usar sugerido: {{ formatCurrency(suggested, currency) }}
                  </button>
                </div>
                <div class="relative">
                  <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-400">$</span>
                  <input
                    v-model.number="form.precioFinal"
                    type="number"
                    min="0"
                    step="500"
                    class="w-full rounded-xl border border-black/[0.08] py-2.5 pr-3 pl-7 text-right text-sm font-medium font-secondary text-brand-green-900 outline-none transition-colors focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                    @input="priceTouched = true"
                  />
                </div>
              </div>

              <!-- Hacerlo fijo. Sólo al crear: convertir en fijo un turno que ya
                   existe abre la pregunta de qué pasa con ese turno suelto, y
                   la respuesta corta es que conviene crearlo como fijo desde el
                   principio. -->
              <div v-if="!isEditing" class="rounded-xl border border-black/[0.08] p-4">
                <label class="flex cursor-pointer items-start gap-3">
                  <input
                    v-model="form.esFijo"
                    type="checkbox"
                    class="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-purple-500"
                  />
                  <span class="min-w-0">
                    <span class="block text-sm font-medium text-brand-green-900">Se repite todas las semanas</span>
                    <span class="mt-0.5 block text-xs text-stone-500">
                      Turno fijo: se genera solo y no vence. Vas a poder revisar las fechas antes de confirmar.
                    </span>
                  </span>
                </label>
              </div>

              <!-- Notas -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Notas</label>
                <textarea
                  v-model="form.notas"
                  rows="2"
                  placeholder="Observaciones (opcional)"
                  class="w-full resize-none rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                ></textarea>
              </div>

              <p class="text-xs text-stone-400">
                <span class="text-error-500">*</span> Campo obligatorio
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-black/[0.06] px-4 py-4 sm:px-6">
            <button
              v-if="isEditing && form.estado !== 'cancelada'"
              class="flex items-center gap-1.5 text-sm font-medium text-error-500 transition-colors hover:text-error-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="cancelling"
              @click="emit('cancel', form._id)"
            >
              <i :class="cancelling ? 'icon-[material-symbols--progress-activity] animate-spin' : 'icon-[material-symbols--block]'" class="text-xs"></i>
              Cancelar turno
            </button>
            <div v-else />
            <div class="flex items-center gap-3">
              <button
                class="rounded-full border border-black/[0.08] px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
                @click="emit('close')"
              >
                Cerrar
              </button>
              <button
                class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-medium text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="saving"
                @click="handleSave"
              >
                <i v-if="saving" class="icon-[material-symbols--progress-activity] animate-spin text-xs"></i>
                {{ saving ? 'Guardando...' : form.esFijo ? 'Ver fechas' : 'Guardar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Select from 'primevue/select'
import { formatCurrency, dayjs, zonedToUtcISO, DEFAULT_TZ } from '@/utils/datetime'
import { sportMeta, timeToMinutes, minutesToTime, priceForDuration, openRangeForDate, pagoMeta } from '@/utils/turnos'
import { waLink, puedeWhatsapp, mensajeConfirmacion, mensajeRecordatorio } from '@/utils/whatsapp'
import WhatsappIcon from '@/components/common/WhatsappIcon.vue'

const props = defineProps({
  visible: Boolean,
  // Datos de partida: reserva existente (edición) o prefill (creación).
  reservation: Object,
  courts: { type: Array, default: () => [] },
  currency: { type: String, default: 'ARS' },
  // Para firmar los mensajes de WhatsApp: el jugador tiene que leer el nombre
  // del complejo, no el de la plataforma.
  clubNombre: { type: String, default: '' },
  // Zona horaria del club: para convertir fecha+hora local <-> instante UTC.
  timezone: { type: String, default: DEFAULT_TZ },
  // Solo para mostrar el horario de atención como guía (la validación es del backend).
  horarios: { type: Object, default: null },
  saving: Boolean,
  cancelling: Boolean,
  refunding: Boolean,
  // Sólo el dueño del complejo puede devolver un pago: mueve plata de su cuenta.
  isAdmin: Boolean,
  // Mensaje de error devuelto por el backend al guardar.
  serverError: { type: String, default: '' },
  refundError: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save', 'save-recurring', 'cancel', 'refund'])

const estadoOptions = [
  { label: 'Pendiente', value: 'pendiente' },
  { label: 'Confirmada', value: 'confirmada' },
  { label: 'Completada', value: 'completada' },
]

// Horario de atención del día, solo como guía visual (no bloquea nada).
const openRange = computed(() => openRangeForDate(props.horarios, form.value.fecha))

// Opciones de hora: el día completo (24hs). El backend valida.
const horasOptions = (() => {
  const out = []
  for (let m = 0; m <= 24 * 60; m += 30) out.push(minutesToTime(m))
  return out
})()

const form = ref(emptyForm())
const priceTouched = ref(false)

function emptyForm() {
  return {
    _id: null,
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    courtId: '',
    fecha: dayjs().format('YYYY-MM-DD'),
    horaInicio: '08:00',
    horaFin: '09:30',
    estado: 'confirmada',
    precioFinal: null,
    notas: '',
    esFijo: false,
  }
}

const isEditing = computed(() => !!form.value._id)

// --- Cobro online ---
const confirmandoRefund = ref(false)
const pago = computed(() => pagoMeta(props.reservation, (n) => formatCurrency(n, props.currency)))
const puedeDevolver = computed(
  () => props.isAdmin && props.reservation?.pago?.estado === 'pagado',
)

// Al abrir otro turno, la confirmación de devolución vuelve a cero: si quedara
// abierta, un clic distraído devolvería el pago del turno equivocado.
watch(
  () => [props.visible, props.reservation?._id],
  () => {
    confirmandoRefund.value = false
  },
)

const selectedCourt = computed(() => props.courts.find((c) => c._id === form.value.courtId))

const selectedSport = computed(() => sportMeta(selectedCourt.value?.tipo))

const sportLabel = (tipo) => sportMeta(tipo).label

const courtOptions = computed(() =>
  props.courts.map((c) => ({ value: c._id, label: `${c.nombre} · ${sportLabel(c.tipo)}` })),
)

// --- Avisos por WhatsApp ---
//
// No hay integración con Meta: se abre un chat con el mensaje ya escrito y el
// complejo aprieta Enviar. Por eso tampoco queda registro de envío — desde acá
// es imposible saber si el mensaje salió.

// Sólo se avisa por un turno confirmado, y se mira el estado GUARDADO y no el
// del formulario. Los otros estados no tienen nada que mandar: una `pendiente`
// todavía está esperando el pago y confirmarla por WhatsApp es prometer un
// horario que se puede liberar solo; una `cancelada` o una `completada` ya no
// van a jugarse. Si el complejo pasa el turno a confirmada, guarda y lo vuelve
// a abrir, los botones aparecen.
const avisable = computed(() => isEditing.value && props.reservation?.estado === 'confirmada')

const puedeAvisar = computed(() => puedeWhatsapp(props.reservation?.guestPhone))

const abrirWhatsapp = (tipo) => {
  const reservation = props.reservation
  if (!reservation) return

  const armar = tipo === 'confirmacion' ? mensajeConfirmacion : mensajeRecordatorio
  const texto = armar({
    reservation,
    club: { nombre: props.clubNombre },
    court: selectedCourt.value || reservation.court,
    tz: props.timezone,
    moneda: props.currency,
  })

  const link = waLink(reservation.guestPhone, texto)
  if (link) window.open(link, '_blank', 'noopener')
}

const subtitle = computed(() => {
  if (selectedCourt.value) return `${selectedCourt.value.nombre} · ${dayjs(form.value.fecha).format('ddd DD MMM')}`
  return 'Reservá una cancha'
})

const suggested = computed(() => {
  if (!selectedCourt.value || !form.value.fecha) return null
  const dow = dayjs(form.value.fecha).day()
  // Duración del turno según inicio/fin elegidos (prorratea el precio por hora).
  const durationMin = timeToMinutes(form.value.horaFin) - timeToMinutes(form.value.horaInicio)
  return priceForDuration(selectedCourt.value, dow, form.value.horaInicio, durationMin > 0 ? durationMin : undefined)
})

const applySuggested = () => {
  form.value.precioFinal = suggested.value
  priceTouched.value = true
}

watch(
  () => props.visible,
  (val) => {
    if (!val) return
    priceTouched.value = false
    const r = props.reservation
    if (r && r._id) {
      // Edición: convertimos los instantes UTC a la hora local del club.
      const start = dayjs.utc(r.inicio).tz(props.timezone)
      const end = dayjs.utc(r.fin).tz(props.timezone)
      form.value = {
        _id: r._id,
        guestName: r.customer?.nombre || r.guestName || '',
        guestPhone: r.guestPhone || '',
        guestEmail: r.customer?.email || r.guestEmail || '',
        courtId: r.court?._id || r.court || '',
        fecha: start.format('YYYY-MM-DD'),
        horaInicio: start.format('HH:mm'),
        horaFin: end.format('HH:mm'),
        estado: r.estado || 'confirmada',
        precioFinal: r.precioFinal ?? null,
        notas: r.notas || '',
        esFijo: !!r.esFijo,
      }
      priceTouched.value = true
    } else {
      // Creación con prefill opcional. El inicio sugerido usa el horario de
      // atención solo como conveniencia (la validación final es del backend).
      const base = emptyForm()
      const courtId = r?.courtId || props.courts[0]?._id || ''
      base.courtId = courtId
      if (r?.fecha) base.fecha = r.fecha
      const range = openRangeForDate(props.horarios, base.fecha)
      const startMin = r?.horaInicio ? timeToMinutes(r.horaInicio) : range ? range.startMin : 8 * 60
      base.horaInicio = minutesToTime(startMin)
      base.horaFin = computeEnd(courtId, base.horaInicio)
      form.value = base
    }
  },
)

function computeEnd(courtId, horaInicio) {
  const court = props.courts.find((c) => c._id === courtId)
  const dur = court?.duracionTurno || 60
  return minutesToTime(timeToMinutes(horaInicio) + dur)
}

// Al cambiar cancha u hora de inicio (en creación), recalcular fin y precio.
watch(
  () => [form.value.courtId, form.value.horaInicio],
  () => {
    if (!props.visible) return
    if (!isEditing.value) {
      form.value.horaFin = computeEnd(form.value.courtId, form.value.horaInicio)
    }
    if (!priceTouched.value && suggested.value != null) {
      form.value.precioFinal = suggested.value
    }
  },
)

// Cambiar la hora de fin (duración) reproratea el precio sugerido.
watch(
  () => form.value.horaFin,
  () => {
    if (!props.visible) return
    if (!priceTouched.value && suggested.value != null) {
      form.value.precioFinal = suggested.value
    }
  },
)

// Campos que el backend rechaza si faltan (ver `validateCustomerData` e
// `isValidInstantRange` en reservationController). Se valida acá también para
// que el asterisco signifique algo: marcar un campo como obligatorio y después
// dejar que el error venga de un viaje al servidor es peor que no marcarlo.
//
// La lista tiene que seguir a la del backend. Si alguna vez divergen, la que
// manda es la del servidor y el usuario ve el `serverError`.
const REQUERIDOS = [
  { campo: 'guestName', label: 'el nombre del cliente' },
  { campo: 'guestPhone', label: 'el teléfono' },
  { campo: 'courtId', label: 'la cancha' },
  { campo: 'fecha', label: 'la fecha' },
  { campo: 'horaInicio', label: 'la hora de inicio' },
  { campo: 'horaFin', label: 'la hora de fin' }
]

const faltantes = computed(() =>
  REQUERIDOS.filter(({ campo }) => !String(form.value[campo] ?? '').trim()),
)

const localError = ref('')

// El mensaje se limpia solo al corregir, para que no quede un cartel rojo
// contradiciendo un formulario ya completo.
watch(faltantes, (f) => {
  if (f.length === 0) localError.value = ''
})

const handleSave = () => {
  if (faltantes.value.length > 0) {
    const nombres = faltantes.value.map((f) => f.label)
    const lista =
      nombres.length === 1
        ? nombres[0]
        : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
    localError.value = `Falta completar ${lista}.`
    return
  }
  localError.value = ''

  // Convertimos fecha + hora local del club a instantes UTC. Si el fin es menor
  // o igual al inicio, el turno cruza la medianoche (día siguiente).
  const inicio = zonedToUtcISO(form.value.fecha, form.value.horaInicio, props.timezone)
  const finDay =
    timeToMinutes(form.value.horaFin) <= timeToMinutes(form.value.horaInicio)
      ? dayjs(form.value.fecha).add(1, 'day').format('YYYY-MM-DD')
      : form.value.fecha
  const fin = zonedToUtcISO(finDay, form.value.horaFin, props.timezone)

  const payload = {
    _id: form.value._id,
    courtId: form.value.courtId,
    guestName: form.value.guestName.trim(),
    guestPhone: form.value.guestPhone.trim(),
    guestEmail: form.value.guestEmail.trim(),
    inicio,
    fin,
    estado: form.value.estado,
    precioFinal: form.value.precioFinal ?? 0,
    notas: form.value.notas?.trim() || '',
  }

  // Un turno fijo no se guarda acá: se previsualiza primero. La regla la crea
  // `/recurring`, que además genera las 13 ocurrencias de una. Lo que viaja es
  // el instante del turno (`inicio`) y su duración; el día de la semana y la
  // hora UTC los deriva el backend de ahí, sin ninguna conversión de zona.
  if (form.value.esFijo) {
    emit('save-recurring', {
      ...payload,
      estado: 'confirmada',
      duracionMin: dayjs.utc(fin).diff(dayjs.utc(inicio), 'minute'),
    })
    return
  }

  emit('save', payload)
}

const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s ease;
}
.drawer-enter-active > div:first-child,
.drawer-leave-active > div:first-child {
  transition: opacity 0.3s ease;
}
.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.3s ease;
}
.drawer-enter-from > div:first-child,
.drawer-leave-to > div:first-child {
  opacity: 0;
}
.drawer-enter-from > div:last-child,
.drawer-leave-to > div:last-child {
  transform: translateX(100%);
}
</style>
