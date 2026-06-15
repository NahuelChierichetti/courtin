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
        <div class="relative flex w-full max-w-lg flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-slate-200 px-6 py-5">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="deporteColors[form.tipo]"
            >
              <i :class="deporteIcons[form.tipo]" class="text-base"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-slate-900">{{ drawerTitle }}</h2>
              <p class="text-sm text-slate-400">{{ drawerSubtitle }}</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              @click="emit('close')"
            >
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-6">
            <div class="space-y-6">
              <!-- Name & Sport -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Nombre
                  </label>
                  <input
                    v-model="form.nombre"
                    type="text"
                    placeholder="Ej: Cancha 1"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Deporte
                  </label>
                  <div class="relative">
                    <select
                      v-model="form.tipo"
                      class="w-full appearance-none rounded-lg border border-slate-300 px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500 bg-white"
                    >
                      <option v-for="opt in deporteOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                    <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400"></i>
                  </div>
                </div>
              </div>

              <!-- Surface & Cover -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Superficie
                  </label>
                  <input
                    v-model="form.superficie"
                    type="text"
                    placeholder="Ej: Cristal, Cemento..."
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Cubierta
                  </label>
                  <div class="flex overflow-hidden rounded-lg border border-slate-300">
                    <button
                      class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                      :class="form.cubierta ? 'bg-primitive-dark-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
                      @click="form.cubierta = true"
                    >
                      Cubierta
                    </button>
                    <button
                      class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                      :class="!form.cubierta ? 'bg-primitive-dark-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
                      @click="form.cubierta = false"
                    >
                      Descubierta
                    </button>
                  </div>
                </div>
              </div>

              <!-- Players (futbol only) -->
              <div v-if="showJugadores" class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Jugadores por equipo
                  </label>
                  <input
                    v-model.number="form.jugadores"
                    type="number"
                    min="3"
                    max="11"
                    placeholder="Ej: 5, 7, 11"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                  />
                </div>
              </div>

              <!-- Duración del turno -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Duración del turno
                </label>
                <div class="flex overflow-hidden rounded-lg border border-slate-300">
                  <button
                    v-for="opt in duracionOptions"
                    :key="opt"
                    class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                    :class="form.duracionTurno === opt ? 'bg-primitive-dark-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
                    @click="form.duracionTurno = opt"
                  >
                    {{ opt }} min
                  </button>
                </div>
                <p class="mt-1.5 text-xs text-slate-400">
                  Fútbol suele ser 60 min; pádel y tenis, 90 min.
                </p>
              </div>

              <!-- Tarifas -->
              <div>
                <div class="mb-3 flex items-center justify-between">
                  <label class="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    Tarifas por franja
                  </label>
                  <button
                    class="text-xs font-medium text-primitive-orange-500 transition-colors hover:text-primitive-orange-600 cursor-pointer"
                    @click="addTarifa"
                  >
                    Agregar franja
                  </button>
                </div>

                <div class="space-y-3">
                  <div
                    v-for="(tarifa, index) in form.tarifas"
                    :key="index"
                    class="rounded-xl border border-slate-200 p-4"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="grid flex-1 grid-cols-2 gap-3">
                        <div>
                          <label class="mb-1 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Nombre</label>
                          <input
                            v-model="tarifa.nombre"
                            type="text"
                            placeholder="Ej: Lun-Vie Día"
                            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                          />
                        </div>
                        <div>
                          <label class="mb-1 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Días</label>
                          <div class="relative">
                            <select
                              v-model="tarifa.dias"
                              class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                            >
                              <option v-for="d in diasOptions" :key="d.value" :value="d.value">{{ d.label }}</option>
                            </select>
                            <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400"></i>
                          </div>
                        </div>
                      </div>
                      <button
                        v-if="form.tarifas.length > 1"
                        class="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-error-500 cursor-pointer"
                        @click="removeTarifa(index)"
                      >
                        <i class="pi pi-trash text-xs"></i>
                      </button>
                    </div>

                    <div class="mt-3 grid grid-cols-3 gap-3">
                      <div>
                        <label class="mb-1 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Desde</label>
                        <div class="relative">
                          <select
                            v-model="tarifa.horaInicio"
                            class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                          >
                            <option v-for="h in horasOptions" :key="h" :value="h">{{ h }}</option>
                          </select>
                          <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400"></i>
                        </div>
                      </div>
                      <div>
                        <label class="mb-1 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Hasta</label>
                        <div class="relative">
                          <select
                            v-model="tarifa.horaFin"
                            class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                          >
                            <option v-for="h in horasOptions" :key="h" :value="h">{{ h }}</option>
                          </select>
                          <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-slate-400"></i>
                        </div>
                      </div>
                      <div>
                        <label class="mb-1 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Precio</label>
                        <div class="relative">
                          <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-400">$</span>
                          <input
                            v-model.number="tarifa.precio"
                            type="number"
                            min="0"
                            step="500"
                            class="w-full rounded-lg border border-slate-300 py-2 pr-3 pl-7 text-right text-sm font-medium font-secondary text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <button
              v-if="isEditing"
              class="flex items-center gap-1.5 text-sm font-medium text-error-500 transition-colors hover:text-error-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="deactivating"
              @click="handleDeactivate"
            >
              <i :class="deactivating ? 'pi pi-spin pi-spinner' : 'pi pi-power-off'" class="text-xs"></i>
              {{ form.estado === 'activa' ? 'Desactivar' : 'Activar' }}
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
                class="flex items-center gap-2 rounded-lg bg-primitive-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="saving"
                @click="handleSave"
              >
                <i :class="saving ? 'pi pi-spin pi-spinner' : ''" class="text-xs"></i>
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
import { ref, watch, computed } from 'vue'

const props = defineProps({
  visible: Boolean,
  court: Object,
  saving: Boolean,
  deactivating: Boolean,
})

const emit = defineEmits(['close', 'save', 'deactivate'])

const deporteOptions = [
  { label: 'Padel', value: 'padel' },
  { label: 'Tenis', value: 'tenis' },
  { label: 'Futbol', value: 'futbol' },
]

const defaultTarifas = [
  { nombre: 'Lun-Vie Dia', dias: 'Lun a Vie', horaInicio: '08:00', horaFin: '17:00', precio: 0 },
  { nombre: 'Lun-Vie Noche', dias: 'Lun a Vie', horaInicio: '17:00', horaFin: '23:30', precio: 0 },
  { nombre: 'Finde', dias: 'Sab y Dom', horaInicio: '08:00', horaFin: '23:30', precio: 0 },
]

const form = ref(getEmptyForm())

function getEmptyForm() {
  return {
    _id: null,
    nombre: '',
    tipo: 'padel',
    superficie: '',
    cubierta: true,
    estado: 'activa',
    jugadores: null,
    duracionTurno: 60,
    tarifas: defaultTarifas.map((t) => ({ ...t })),
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.court) {
        form.value = {
          ...props.court,
          tarifas: props.court.tarifas.map((t) => ({ ...t })),
        }
      } else {
        form.value = getEmptyForm()
      }
    }
  },
)

const isEditing = computed(() => !!form.value._id)

const drawerTitle = computed(() => {
  if (isEditing.value) return `Editar ${form.value.nombre}`
  return 'Nueva cancha'
})

const drawerSubtitle = computed(() => {
  if (!isEditing.value) return 'Configurar cancha y tarifas'
  const deporte = deporteOptions.find((d) => d.value === form.value.tipo)
  return `${deporte?.label || ''} · ${form.value.superficie || ''}`
})

const deporteColors = {
  padel: 'bg-primitive-blue-100 text-primitive-blue-600',
  tenis: 'bg-primitive-orange-100 text-primitive-orange-600',
  futbol: 'bg-success-100 text-success-600',
}

const deporteIcons = {
  padel: 'pi pi-th-large',
  tenis: 'pi pi-circle',
  futbol: 'pi pi-globe',
}

const showJugadores = computed(() => form.value.tipo === 'futbol')

const duracionOptions = [60, 90, 120]

const duracionSugerida = { futbol: 60, padel: 90, tenis: 90 }

watch(
  () => form.value.tipo,
  (tipo) => {
    if (!isEditing.value && duracionSugerida[tipo]) {
      form.value.duracionTurno = duracionSugerida[tipo]
    }
  },
)

const diasOptions = [
  { label: 'Lun a Vie', value: 'Lun a Vie' },
  { label: 'Sáb y Dom', value: 'Sab y Dom' },
  { label: 'Lun a Dom', value: 'Lun a Dom' },
  { label: 'Lun a Sáb', value: 'Lun a Sab' },
  { label: 'Sólo Sáb', value: 'Sabado' },
  { label: 'Sólo Dom', value: 'Domingo' },
  { label: 'Feriados', value: 'Feriados' },
]

const horasOptions = (() => {
  const options = []
  for (let h = 0; h < 24; h++) {
    options.push(`${String(h).padStart(2, '0')}:00`)
    options.push(`${String(h).padStart(2, '0')}:30`)
  }
  return options
})()

const addTarifa = () => {
  form.value.tarifas.push({
    nombre: '',
    dias: '',
    horaInicio: '08:00',
    horaFin: '23:30',
    precio: 0,
  })
}

const removeTarifa = (index) => {
  form.value.tarifas.splice(index, 1)
}

const handleSave = () => {
  console.log(form.value)
  emit('save', { ...form.value, tarifas: form.value.tarifas.map((t) => ({ ...t })) })
}

const handleDeactivate = () => {
  emit('deactivate', form.value._id)
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
