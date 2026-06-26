<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex justify-end"
        @click="handleOverlayClick"
      >
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/30 transition-opacity" />

        <!-- Drawer panel -->
        <div class="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-slate-200 px-6 py-5">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="form.tipo === 'especial' ? 'bg-primitive-orange-100 text-primitive-orange-600' : 'bg-slate-100 text-slate-500'"
            >
              <i :class="form.tipo === 'especial' ? 'pi pi-star' : 'pi pi-power-off'" class="text-base"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-slate-900">{{ drawerTitle }}</h2>
              <p class="text-sm text-neutral-400">Feriados y excepciones de horario</p>
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
            <div class="space-y-6">
              <!-- Nombre -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Nombre
                </label>
                <input
                  v-model="form.nombre"
                  type="text"
                  placeholder="Ej: Día de la Independencia"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                />
              </div>

              <!-- Fecha -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Fecha
                </label>
                <DatePicker
                  v-model="fechaDate"
                  date-format="dd/mm/yy"
                  show-icon
                  icon-display="input"
                  :min-date="new Date()"
                  fluid
                  placeholder="Seleccioná una fecha"
                />
              </div>

              <!-- Tipo -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Tipo
                </label>
                <div class="flex overflow-hidden rounded-lg border border-slate-300">
                  <button
                    class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                    :class="form.tipo === 'cerrado' ? 'bg-primitive-dark-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
                    @click="form.tipo = 'cerrado'"
                  >
                    Cerrado
                  </button>
                  <button
                    class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                    :class="form.tipo === 'especial' ? 'bg-primitive-dark-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
                    @click="form.tipo = 'especial'"
                  >
                    Horario especial
                  </button>
                </div>
              </div>

              <!-- Horario (solo especial) -->
              <div v-if="form.tipo === 'especial'" class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Desde
                  </label>
                  <TimePicker v-model="form.horaInicio" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Hasta
                  </label>
                  <TimePicker v-model="form.horaFin" />
                </div>
              </div>

              <p v-else class="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
                El complejo permanecerá cerrado durante todo el día. No se podrán generar reservas.
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <button
              v-if="isEditing"
              class="text-sm font-medium text-error-500 transition-colors hover:text-error-600 cursor-pointer"
              @click="emit('delete', index)"
            >
              Eliminar
            </button>
            <div v-else />
            <div class="flex items-center gap-3">
              <button
                class="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                @click="emit('close')"
              >
                Cancelar
              </button>
              <button
                class="rounded-lg bg-primitive-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!canSave"
                @click="handleSave"
              >
                {{ isEditing ? 'Guardar' : 'Agregar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import TimePicker from '@/components/common/TimePicker.vue'
import { toDateInputUTC } from '@/utils/datetime'

const props = defineProps({
  visible: Boolean,
  diaEspecial: Object,
  index: { type: Number, default: -1 },
})

const emit = defineEmits(['close', 'save', 'delete'])

function getEmptyForm() {
  return {
    nombre: '',
    fecha: '',
    tipo: 'cerrado',
    horaInicio: '08:00',
    horaFin: '23:30',
  }
}

const form = ref(getEmptyForm())

const toDateInput = (value) => toDateInputUTC(value)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.diaEspecial) {
        form.value = {
          nombre: props.diaEspecial.nombre || '',
          fecha: toDateInput(props.diaEspecial.fecha),
          tipo: props.diaEspecial.tipo || 'cerrado',
          horaInicio: props.diaEspecial.horaInicio || '08:00',
          horaFin: props.diaEspecial.horaFin || '23:30',
        }
      } else {
        form.value = getEmptyForm()
      }
    }
  },
)

const isEditing = computed(() => props.index >= 0)

const drawerTitle = computed(() => (isEditing.value ? 'Editar día especial' : 'Nuevo día especial'))

const canSave = computed(() => form.value.nombre.trim() !== '' && form.value.fecha !== '')

// Mapea el string "YYYY-MM-DD" del form al Date que usa DatePicker, sin desfasaje de zona.
const fechaDate = computed({
  get() {
    if (!form.value.fecha) return null
    const [y, m, d] = form.value.fecha.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  },
  set(date) {
    if (!date) {
      form.value.fecha = ''
      return
    }
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    form.value.fecha = `${yyyy}-${mm}-${dd}`
  },
})

const handleSave = () => {
  const payload = {
    nombre: form.value.nombre.trim(),
    fecha: form.value.fecha,
    tipo: form.value.tipo,
  }
  if (form.value.tipo === 'especial') {
    payload.horaInicio = form.value.horaInicio
    payload.horaFin = form.value.horaFin
  }
  emit('save', { dia: payload, index: props.index })
}

const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) {
    emit('close')
  }
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
