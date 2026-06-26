<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50 flex justify-end" @click="handleOverlayClick">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/30 transition-opacity" />

        <!-- Drawer panel -->
        <div class="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-slate-200 px-6 py-5">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="[selectedSport.bg, selectedSport.text]"
            >
              <i class="pi pi-calendar text-base"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-slate-900">{{ isEditing ? 'Editar turno' : 'Nuevo turno' }}</h2>
              <p class="truncate text-sm text-neutral-400">{{ subtitle }}</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              @click="emit('close')"
            >
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-6">
            <div class="space-y-5">
              <!-- Error del backend -->
              <div
                v-if="serverError"
                class="flex items-start gap-2 rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-sm text-error-600"
              >
                <i class="pi pi-exclamation-circle mt-0.5 text-xs"></i>
                <span>{{ serverError }}</span>
              </div>

              <!-- Cliente -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Cliente</label>
                <input
                  v-model="form.guestName"
                  type="text"
                  placeholder="Nombre y apellido"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                />
              </div>

              <!-- Teléfono -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Teléfono</label>
                <input
                  v-model="form.guestPhone"
                  type="tel"
                  placeholder="Ej: 11 2345 6789"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                />
              </div>

              <!-- Cancha -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Cancha</label>
                <div class="relative">
                  <select
                    v-model="form.courtId"
                    class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                  >
                    <option v-for="c in courts" :key="c._id" :value="c._id">{{ c.nombre }} · {{ sportLabel(c.tipo) }}</option>
                  </select>
                  <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
                </div>
              </div>

              <!-- Fecha -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Fecha</label>
                <input
                  v-model="form.fecha"
                  type="date"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                />
                <p v-if="openRange" class="mt-1 text-xs text-neutral-400">
                  Atención: {{ minutesToTime(openRange.startMin) }} a {{ minutesToTime(openRange.endMin) }}
                </p>
              </div>

              <!-- Horario -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Desde</label>
                  <div class="relative">
                    <select
                      v-model="form.horaInicio"
                      class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                    >
                      <option v-for="h in horasOptions" :key="h" :value="h">{{ h }}</option>
                    </select>
                    <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
                  </div>
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Hasta</label>
                  <div class="relative">
                    <select
                      v-model="form.horaFin"
                      class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                    >
                      <option v-for="h in horasOptions" :key="h" :value="h">{{ h }}</option>
                    </select>
                    <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
                  </div>
                </div>
              </div>

              <!-- Estado -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Estado</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in estadoOptions"
                    :key="opt.value"
                    class="rounded-lg border px-2 py-2 text-xs font-medium transition-colors cursor-pointer"
                    :class="form.estado === opt.value
                      ? 'border-primitive-dark-500 bg-primitive-dark-500 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'"
                    @click="form.estado = opt.value"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- Precio -->
              <div>
                <div class="mb-1.5 flex items-center justify-between">
                  <label class="text-xs font-semibold tracking-wider text-neutral-400 uppercase">Precio</label>
                  <button
                    v-if="suggested != null && suggested !== form.precioFinal"
                    class="text-xs font-medium text-primitive-orange-500 transition-colors hover:text-primitive-orange-600 cursor-pointer"
                    @click="applySuggested"
                  >
                    Usar sugerido: {{ formatCurrency(suggested, currency) }}
                  </button>
                </div>
                <div class="relative">
                  <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-400">$</span>
                  <input
                    v-model.number="form.precioFinal"
                    type="number"
                    min="0"
                    step="500"
                    class="w-full rounded-lg border border-slate-300 py-2.5 pr-3 pl-7 text-right text-sm font-medium font-secondary text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                    @input="priceTouched = true"
                  />
                </div>
              </div>

              <!-- Notas -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Notas</label>
                <textarea
                  v-model="form.notas"
                  rows="2"
                  placeholder="Observaciones (opcional)"
                  class="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <button
              v-if="isEditing && form.estado !== 'cancelada'"
              class="flex items-center gap-1.5 text-sm font-medium text-error-500 transition-colors hover:text-error-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="cancelling"
              @click="emit('cancel', form._id)"
            >
              <i :class="cancelling ? 'pi pi-spin pi-spinner' : 'pi pi-ban'" class="text-xs"></i>
              Cancelar turno
            </button>
            <div v-else />
            <div class="flex items-center gap-3">
              <button
                class="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                @click="emit('close')"
              >
                Cerrar
              </button>
              <button
                class="flex items-center gap-2 rounded-lg bg-primitive-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="saving"
                @click="handleSave"
              >
                <i v-if="saving" class="pi pi-spin pi-spinner text-xs"></i>
                {{ saving ? 'Guardando...' : 'Guardar' }}
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
import { formatCurrency, dayjs, zonedToUtcISO, DEFAULT_TZ } from '@/utils/datetime'
import { sportMeta, timeToMinutes, minutesToTime, suggestedPrice, openRangeForDate } from '@/utils/turnos'

const props = defineProps({
  visible: Boolean,
  // Datos de partida: reserva existente (edición) o prefill (creación).
  reservation: Object,
  courts: { type: Array, default: () => [] },
  currency: { type: String, default: 'ARS' },
  // Zona horaria del club: para convertir fecha+hora local <-> instante UTC.
  timezone: { type: String, default: DEFAULT_TZ },
  // Solo para mostrar el horario de atención como guía (la validación es del backend).
  horarios: { type: Object, default: null },
  saving: Boolean,
  cancelling: Boolean,
  // Mensaje de error devuelto por el backend al guardar.
  serverError: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save', 'cancel'])

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
    courtId: '',
    fecha: dayjs().format('YYYY-MM-DD'),
    horaInicio: '08:00',
    horaFin: '09:30',
    estado: 'confirmada',
    precioFinal: null,
    notas: '',
  }
}

const isEditing = computed(() => !!form.value._id)

const selectedCourt = computed(() => props.courts.find((c) => c._id === form.value.courtId))

const selectedSport = computed(() => sportMeta(selectedCourt.value?.tipo))

const sportLabel = (tipo) => sportMeta(tipo).label

const subtitle = computed(() => {
  if (selectedCourt.value) return `${selectedCourt.value.nombre} · ${dayjs(form.value.fecha).format('ddd DD MMM')}`
  return 'Reservá una cancha'
})

const suggested = computed(() => {
  if (!selectedCourt.value || !form.value.fecha) return null
  const dow = dayjs(form.value.fecha).day()
  return suggestedPrice(selectedCourt.value, dow, form.value.horaInicio)
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
        courtId: r.court?._id || r.court || '',
        fecha: start.format('YYYY-MM-DD'),
        horaInicio: start.format('HH:mm'),
        horaFin: end.format('HH:mm'),
        estado: r.estado || 'confirmada',
        precioFinal: r.precioFinal ?? null,
        notas: r.notas || '',
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

const handleSave = () => {
  // Convertimos fecha + hora local del club a instantes UTC. Si el fin es menor
  // o igual al inicio, el turno cruza la medianoche (día siguiente).
  const inicio = zonedToUtcISO(form.value.fecha, form.value.horaInicio, props.timezone)
  const finDay =
    timeToMinutes(form.value.horaFin) <= timeToMinutes(form.value.horaInicio)
      ? dayjs(form.value.fecha).add(1, 'day').format('YYYY-MM-DD')
      : form.value.fecha
  const fin = zonedToUtcISO(finDay, form.value.horaFin, props.timezone)

  emit('save', {
    _id: form.value._id,
    courtId: form.value.courtId,
    guestName: form.value.guestName.trim(),
    guestPhone: form.value.guestPhone.trim(),
    inicio,
    fin,
    estado: form.value.estado,
    precioFinal: form.value.precioFinal ?? 0,
    notas: form.value.notas?.trim() || '',
  })
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
