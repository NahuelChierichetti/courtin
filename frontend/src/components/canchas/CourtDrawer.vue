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
          <div class="flex items-center gap-4 border-b border-black/[0.06] px-6 py-5">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="deporteColors[form.tipo]"
            >
              <i :class="deporteIcons[form.tipo]" class="text-base"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-primitive-dark-500">{{ drawerTitle }}</h2>
              <p class="text-sm text-neutral-400">{{ drawerSubtitle }}</p>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              @click="emit('close')"
            >
              <i class="icon-[material-symbols--close] text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-6">
            <div class="space-y-6">
              <!-- Name & Sport -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Nombre
                  </label>
                  <input
                    v-model="form.nombre"
                    type="text"
                    placeholder="Ej: Cancha 1"
                    class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Deporte
                  </label>
                  <div class="relative">
                    <select
                      v-model="form.tipo"
                      class="w-full appearance-none rounded-xl border border-black/[0.08] px-3 py-2.5 pr-8 text-sm text-primitive-dark-500 outline-none transition-colors focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100 bg-white"
                    >
                      <option v-for="opt in deporteOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                    <i class="icon-[material-symbols--keyboard-arrow-down] pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
                  </div>
                </div>
              </div>

              <!-- Surface & Cover -->
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Superficie <span class="font-normal normal-case tracking-normal text-slate-300">(opcional)</span>
                  </label>
                  <div class="relative">
                    <select
                      v-model="surfaceSelect"
                      class="w-full appearance-none rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 pr-8 text-sm text-primitive-dark-500 outline-none transition-colors focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                    >
                      <option value="">Sin especificar</option>
                      <option v-for="s in surfaceOptions" :key="s" :value="s">{{ s }}</option>
                      <option value="__otra__">Otra…</option>
                    </select>
                    <i class="icon-[material-symbols--keyboard-arrow-down] pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
                  </div>
                  <input
                    v-if="surfaceSelect === '__otra__'"
                    v-model="form.superficie"
                    type="text"
                    placeholder="Especificá la superficie"
                    class="mt-2 w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Cubierta
                  </label>
                  <div class="flex overflow-hidden rounded-full border border-black/[0.08]">
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
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                    Jugadores por equipo
                  </label>
                  <input
                    v-model.number="form.jugadores"
                    type="number"
                    min="3"
                    max="11"
                    placeholder="Ej: 5, 7, 11"
                    class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                  />
                </div>
              </div>

              <!-- Duración del turno -->
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Duración del turno
                </label>
                <div class="flex overflow-hidden rounded-full border border-black/[0.08]">
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
                <p class="mt-2.5 text-xs text-neutral-400">
                  Fútbol suele ser 60 min; pádel y tenis, 90 min.
                </p>
              </div>

              <!-- Reservable online -->
              <div class="flex items-center justify-between rounded-xl border border-black/[0.06] p-4">
                <div class="pr-4">
                  <p class="text-sm font-semibold text-slate-800">Reservable online</p>
                  <p class="text-xs text-neutral-400">
                    Permitir que los jugadores reserven esta cancha desde la web pública.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  :aria-checked="form.visible"
                  class="relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer"
                  :class="form.visible ? 'bg-primitive-orange-500' : 'bg-slate-300'"
                  @click="form.visible = !form.visible"
                >
                  <span
                    class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                    :class="form.visible ? 'translate-x-5' : ''"
                  ></span>
                </button>
              </div>

              <!-- Tarifas -->
              <div>
                <label class="mb-2 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                  Tarifas
                </label>

                <!-- Precio único (simple) -->
                <div v-if="!advanced">
                  <label class="mb-1.5 block text-[11px] font-medium text-slate-500">Precio por hora</label>
                  <div class="relative max-w-[200px]">
                    <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-400">$</span>
                    <input
                      v-model.number="precioHora"
                      type="number"
                      min="0"
                      step="500"
                      placeholder="0"
                      class="w-full rounded-xl border border-black/[0.08] py-2.5 pr-3 pl-7 text-sm font-medium font-secondary text-primitive-dark-500 outline-none transition-colors focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                    />
                  </div>
                  <p class="mt-2.5 text-xs text-neutral-400">
                    Se cobra por hora; el total del turno se calcula según la duración (1h 30 = 1.5×).
                  </p>
                </div>

                <!-- Franjas (avanzado) -->
                <div v-else class="space-y-3">
                  <p class="text-xs text-neutral-400">
                    Cada franja aplica a ciertos días y un rango horario. El precio es por hora.
                  </p>

                  <div
                    v-for="(band, index) in form.tarifas"
                    :key="index"
                    class="rounded-xl border border-black/[0.06] p-4"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <label class="mb-1.5 block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Días</label>
                        <div class="flex flex-wrap gap-1.5">
                          <button
                            v-for="d in DAYS"
                            :key="d.code"
                            type="button"
                            class="h-8 w-9 rounded-full border text-xs font-semibold transition-colors cursor-pointer"
                            :class="band.diasSel.includes(d.code)
                              ? 'border-primitive-orange-500 bg-primitive-orange-500 text-white'
                              : 'border-black/[0.08] bg-white text-slate-500 hover:bg-slate-50'"
                            @click="toggleDay(band, d.code)"
                          >
                            {{ d.label }}
                          </button>
                        </div>
                        <div class="mt-2 flex flex-wrap gap-1.5">
                          <button
                            v-for="p in dayPresets"
                            :key="p.value"
                            type="button"
                            class="rounded-full border border-black/[0.08] px-2.5 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 cursor-pointer"
                            @click="applyPreset(band, p.value)"
                          >
                            {{ p.label }}
                          </button>
                        </div>
                      </div>
                      <button
                        v-if="form.tarifas.length > 1"
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-red-50 hover:text-error-500 cursor-pointer"
                        @click="removeBand(index)"
                      >
                        <i class="icon-[material-symbols--delete] text-sm"></i>
                      </button>
                    </div>

                    <div class="mt-3 grid grid-cols-[1fr_1fr_1.1fr] items-end gap-2.5">
                      <div>
                        <label class="mb-1 block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Desde</label>
                        <div class="relative">
                          <select v-model="band.horaInicio" class="w-full appearance-none rounded-xl border border-black/[0.08] bg-white px-3 py-2 pr-7 text-sm text-primitive-dark-500 outline-none transition-colors focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100">
                            <option v-for="h in horasOptions" :key="h" :value="h">{{ h }}</option>
                          </select>
                          <i class="icon-[material-symbols--keyboard-arrow-down] pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-neutral-400"></i>
                        </div>
                      </div>
                      <div>
                        <label class="mb-1 block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Hasta</label>
                        <div class="relative">
                          <select v-model="band.horaFin" class="w-full appearance-none rounded-xl border border-black/[0.08] bg-white px-3 py-2 pr-7 text-sm text-primitive-dark-500 outline-none transition-colors focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100">
                            <option v-for="h in horasOptions" :key="h" :value="h">{{ h }}</option>
                          </select>
                          <i class="icon-[material-symbols--keyboard-arrow-down] pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-neutral-400"></i>
                        </div>
                      </div>
                      <div>
                        <label class="mb-1 block text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Precio /h</label>
                        <div class="relative">
                          <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-400">$</span>
                          <input v-model.number="band.precio" type="number" min="0" step="500" class="w-full rounded-xl border border-black/[0.08] py-2 pr-3 pl-7 text-right text-sm font-medium font-secondary text-primitive-dark-500 outline-none transition-colors focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100" />
                        </div>
                      </div>
                    </div>

                    <p
                      class="mt-3 rounded-lg px-2.5 py-1.5 text-xs"
                      :class="band.diasSel.length ? 'bg-primitive-orange-50 text-primitive-orange-700' : 'bg-slate-50 text-slate-400'"
                    >
                      {{ bandSummary(band) }}
                    </p>
                  </div>

                  <button
                    class="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/[0.12] py-2.5 text-sm font-medium text-slate-500 transition-colors hover:border-primitive-orange-300 hover:text-primitive-orange-600 cursor-pointer"
                    @click="addBand"
                  >
                    <i class="icon-[material-symbols--add] text-base"></i> Agregar franja
                  </button>

                  <p v-if="hasOverlap" class="flex items-center gap-1.5 text-xs text-warning-600">
                    <i class="icon-[material-symbols--warning] text-sm"></i>
                    Hay franjas que se pisan en día y horario. Se usará la primera que coincida.
                  </p>
                </div>

                <!-- Toggle diferenciar -->
                <label class="mt-4 flex items-center justify-between rounded-xl border border-black/[0.06] p-4">
                  <div class="pr-4">
                    <p class="text-sm font-semibold text-slate-800">Diferenciar por día/horario</p>
                    <p class="text-xs text-neutral-400">Cobrá distinto en finde, noche, etc.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="advanced"
                    class="relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer"
                    :class="advanced ? 'bg-primitive-orange-500' : 'bg-slate-300'"
                    @click="advanced = !advanced"
                  >
                    <span
                      class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                      :class="advanced ? 'translate-x-5' : ''"
                    ></span>
                  </button>
                </label>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-black/[0.06] px-6 py-4">
            <button
              v-if="isEditing"
              class="flex items-center gap-1.5 text-sm font-medium text-error-500 transition-colors hover:text-error-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="deactivating"
              @click="handleDeactivate"
            >
              <i :class="deactivating ? 'icon-[material-symbols--progress-activity] animate-spin' : 'icon-[material-symbols--power-settings-new]'" class="text-xs"></i>
              {{ form.estado === 'activa' ? 'Desactivar' : 'Activar' }}
            </button>
            <div v-else />
            <div class="flex items-center gap-3">
              <button
                class="rounded-full border border-black/[0.08] px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                @click="emit('close')"
              >
                Cancelar
              </button>
              <button
                class="flex items-center gap-2 rounded-full bg-primitive-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="saving"
                @click="handleSave"
              >
                <i :class="saving ? 'icon-[material-symbols--progress-activity] animate-spin' : ''" class="text-xs"></i>
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
import { ref, watch, computed, nextTick } from 'vue'

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

// Superficies sugeridas por deporte (con escape "Otra…").
const SURFACES = {
  padel: ['Muro de cemento', 'Cristal (Blindex)', 'Panorámica', 'Sintética'],
  tenis: ['Polvo de ladrillo', 'Cemento / Hard', 'Césped', 'Sintética / Resina'],
  futbol: ['Césped sintético', 'Césped natural', 'Cemento / Futsal'],
}

// Días canónicos.
const DAYS = [
  { code: 'lun', label: 'Lun' },
  { code: 'mar', label: 'Mar' },
  { code: 'mie', label: 'Mié' },
  { code: 'jue', label: 'Jue' },
  { code: 'vie', label: 'Vie' },
  { code: 'sab', label: 'Sáb' },
  { code: 'dom', label: 'Dom' },
]
const ALL = DAYS.map((d) => d.code)
const WEEK = ['lun', 'mar', 'mie', 'jue', 'vie']
const WEEKEND = ['sab', 'dom']
const dayPresets = [
  { label: 'Lun a Vie', value: 'week' },
  { label: 'Finde', value: 'finde' },
  { label: 'Todos', value: 'all' },
]

const form = ref(getEmptyForm())
const surfaceSelect = ref('')
const tarifaMode = ref('simple') // 'simple' | 'avanzado'
const precioHora = ref(0)
const isLoading = ref(false)

const advanced = computed({
  get: () => tarifaMode.value === 'avanzado',
  set: (v) => { tarifaMode.value = v ? 'avanzado' : 'simple' },
})

function getEmptyForm() {
  return {
    _id: null,
    nombre: '',
    tipo: 'padel',
    superficie: '',
    cubierta: true,
    estado: 'activa',
    visible: true,
    jugadores: null,
    duracionTurno: 60,
    tarifas: [],
  }
}

// --- Días: parse/serialize/label ---
const parseDias = (raw) => {
  const dias = (raw || '').toLowerCase().trim()
  if (!dias) return []
  const tokens = dias.split(',').map((s) => s.trim()).filter(Boolean)
  const codes = new Set(ALL)
  if (tokens.length && tokens.every((t) => codes.has(t))) return tokens
  // legacy
  if (dias.includes('lun a dom')) return [...ALL]
  if (dias.includes('lun a sab')) return ['lun', 'mar', 'mie', 'jue', 'vie', 'sab']
  if (dias.includes('lun a vie') || dias.includes('lun-vie')) return [...WEEK]
  if (dias.includes('finde')) return [...WEEKEND]
  const out = []
  if (dias.includes('sab')) out.push('sab')
  if (dias.includes('dom')) out.push('dom')
  return out
}
const serializeDias = (codes) => ALL.filter((c) => codes.includes(c)).join(',')
const diasLabel = (codes) => {
  const set = new Set(codes)
  if (!set.size) return 'Sin días'
  if (ALL.every((c) => set.has(c))) return 'Todos los días'
  if (WEEK.every((c) => set.has(c)) && !WEEKEND.some((c) => set.has(c))) return 'Lun a Vie'
  if (WEEKEND.every((c) => set.has(c)) && !WEEK.some((c) => set.has(c))) return 'Fines de semana'
  return ALL.filter((c) => set.has(c)).map((c) => DAYS.find((d) => d.code === c).label).join(', ')
}
const money = (n) => '$' + (Number(n) || 0).toLocaleString('es-AR')
const toMin = (hhmm) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number)
  return h * 60 + m
}

const toggleDay = (band, code) => {
  const i = band.diasSel.indexOf(code)
  if (i >= 0) band.diasSel.splice(i, 1)
  else band.diasSel.push(code)
}
const applyPreset = (band, preset) => {
  band.diasSel = preset === 'week' ? [...WEEK] : preset === 'finde' ? [...WEEKEND] : [...ALL]
}
const bandSummary = (band) => {
  if (!band.diasSel.length) return 'Elegí al menos un día'
  return `${diasLabel(band.diasSel)} de ${band.horaInicio} a ${band.horaFin} → ${money(band.precio)}/h`
}

const newBand = (precio = 0) => ({ diasSel: [...ALL], horaInicio: '08:00', horaFin: '23:30', precio: precio || 0 })
const toBand = (t) => ({
  diasSel: parseDias(t.dias),
  horaInicio: t.horaInicio || '08:00',
  horaFin: t.horaFin || '23:30',
  precio: t.precio || 0,
})
const addBand = () => form.value.tarifas.push(newBand(precioHora.value))
const removeBand = (index) => form.value.tarifas.splice(index, 1)

// ¿Dos franjas se pisan (mismo día + rango horario superpuesto)?
const hasOverlap = computed(() => {
  if (!advanced.value) return false
  const b = form.value.tarifas
  for (let i = 0; i < b.length; i++) {
    for (let j = i + 1; j < b.length; j++) {
      if (!b[i].diasSel.some((d) => b[j].diasSel.includes(d))) continue
      const a0 = toMin(b[i].horaInicio), a1 = toMin(b[i].horaFin)
      const c0 = toMin(b[j].horaInicio), c1 = toMin(b[j].horaFin)
      if (a0 < c1 && c0 < a1) return true
    }
  }
  return false
})

const surfaceOptions = computed(() => SURFACES[form.value.tipo] || [])

const initSurface = (sup) => {
  if (!sup) surfaceSelect.value = ''
  else if (surfaceOptions.value.includes(sup)) surfaceSelect.value = sup
  else surfaceSelect.value = '__otra__'
  form.value.superficie = sup || ''
}

// Cambiar la opción del select refleja el valor (salvo "Otra…", donde se escribe).
watch(surfaceSelect, (v) => {
  if (v === '__otra__') {
    if (surfaceOptions.value.includes(form.value.superficie)) form.value.superficie = ''
  } else {
    form.value.superficie = v
  }
})

watch(
  () => props.visible,
  (val) => {
    if (!val) return
    isLoading.value = true
    if (props.court) {
      const tf = (props.court.tarifas || []).map((t) => ({ ...t }))
      form.value = {
        ...props.court,
        visible: props.court.visible !== false,
        tarifas: [],
      }
      if (tf.length <= 1) {
        tarifaMode.value = 'simple'
        precioHora.value = tf[0]?.precio ?? props.court.precio ?? 0
        form.value.tarifas = [tf.length ? toBand(tf[0]) : newBand(precioHora.value)]
      } else {
        tarifaMode.value = 'avanzado'
        precioHora.value = Math.min(...tf.map((t) => t.precio || 0))
        form.value.tarifas = tf.map(toBand)
      }
      initSurface(props.court.superficie)
    } else {
      form.value = getEmptyForm()
      tarifaMode.value = 'simple'
      precioHora.value = 0
      form.value.tarifas = [newBand(0)]
      initSurface('')
    }
    nextTick(() => { isLoading.value = false })
  },
)

const isEditing = computed(() => !!form.value._id)

const drawerTitle = computed(() => (isEditing.value ? `Editar ${form.value.nombre}` : 'Nueva cancha'))
const drawerSubtitle = computed(() => {
  if (!isEditing.value) return 'Configurar cancha y tarifas'
  const deporte = deporteOptions.find((d) => d.value === form.value.tipo)
  return [deporte?.label, form.value.superficie].filter(Boolean).join(' · ')
})

const deporteColors = {
  padel: 'bg-primitive-blue-100 text-primitive-blue-600',
  tenis: 'bg-primitive-orange-100 text-primitive-orange-600',
  futbol: 'bg-success-100 text-success-600',
}
const deporteIcons = {
  padel: 'icon-[material-symbols--grid-view]',
  tenis: 'icon-[material-symbols--circle]',
  futbol: 'icon-[material-symbols--public]',
}

const showJugadores = computed(() => form.value.tipo === 'futbol')

const duracionOptions = [60, 90, 120]
const duracionSugerida = { futbol: 60, padel: 90, tenis: 90 }

watch(
  () => form.value.tipo,
  (tipo) => {
    if (isLoading.value) return
    if (!isEditing.value && duracionSugerida[tipo]) form.value.duracionTurno = duracionSugerida[tipo]
    // La superficie depende del deporte: al cambiar, se reinicia la selección.
    initSurface('')
  },
)

const horasOptions = (() => {
  const options = []
  for (let h = 0; h < 24; h++) {
    options.push(`${String(h).padStart(2, '0')}:00`)
    options.push(`${String(h).padStart(2, '0')}:30`)
  }
  return options
})()

// Construye el array de tarifas persistible según el modo.
const buildTarifas = () => {
  if (!advanced.value) {
    return [{
      nombre: 'General',
      dias: serializeDias(ALL),
      horaInicio: '00:00',
      horaFin: '23:59',
      precio: Number(precioHora.value) || 0,
    }]
  }
  const bands = form.value.tarifas
    .filter((b) => b.diasSel.length)
    .map((b) => ({
      nombre: `${diasLabel(b.diasSel)} · ${b.horaInicio}-${b.horaFin}`,
      dias: serializeDias(b.diasSel),
      horaInicio: b.horaInicio,
      horaFin: b.horaFin,
      precio: Number(b.precio) || 0,
    }))
  // Salvaguarda: si quedó sin franjas válidas, cae a un precio único.
  if (!bands.length) {
    return [{ nombre: 'General', dias: serializeDias(ALL), horaInicio: '00:00', horaFin: '23:59', precio: Number(precioHora.value) || 0 }]
  }
  return bands
}

// Al alternar el modo, traspasa el precio para no perder lo ya cargado.
watch(advanced, (on) => {
  if (isLoading.value) return
  if (on) {
    if (form.value.tarifas.length === 1 && !form.value.tarifas[0].precio) {
      form.value.tarifas[0].precio = Number(precioHora.value) || 0
    }
  } else if (!precioHora.value) {
    const first = form.value.tarifas.find((b) => b.precio)
    if (first) precioHora.value = first.precio
  }
})

const handleSave = () => {
  const { tarifas, ...rest } = form.value
  emit('save', { ...rest, tarifas: buildTarifas() })
}

const handleDeactivate = () => emit('deactivate', form.value._id)

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
