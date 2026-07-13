<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50 flex justify-end" @click="handleOverlayClick">
        <div class="absolute inset-0 bg-black/30 transition-opacity" />

        <div class="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-black/[0.06] px-6 py-5">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="form.tipo === 'ingreso' ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600'"
            >
              <i :class="form.tipo === 'ingreso' ? 'icon-[material-symbols--south-west]' : 'icon-[material-symbols--north-east]'" class="text-base"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold text-primitive-dark-500">Registrar movimiento</h2>
              <p class="text-sm text-neutral-400">Cargá un ingreso o egreso de caja</p>
            </div>
            <button class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer" @click="emit('close')">
              <i class="icon-[material-symbols--close] text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <!-- Tipo -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Tipo</label>
              <div class="flex overflow-hidden rounded-full border border-black/[0.08]">
                <button
                  class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                  :class="form.tipo === 'ingreso' ? 'bg-success-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
                  @click="setTipo('ingreso')"
                >
                  Ingreso
                </button>
                <button
                  class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
                  :class="form.tipo === 'egreso' ? 'bg-error-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'"
                  @click="setTipo('egreso')"
                >
                  Egreso
                </button>
              </div>
            </div>

            <!-- Categoría -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Categoría</label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="c in categorias"
                  :key="c"
                  type="button"
                  class="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer"
                  :class="form.categoria === c
                    ? 'border-primitive-orange-500 bg-primitive-orange-50 text-primitive-orange-700'
                    : 'border-black/[0.08] bg-white text-slate-600 hover:bg-slate-50'"
                  @click="form.categoria = c"
                >
                  <i :class="categoriaMeta(c).icon" class="text-base"></i>
                  <span class="truncate">{{ categoriaMeta(c).label }}</span>
                </button>
              </div>
            </div>

            <!-- Monto -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Monto</label>
              <div class="relative">
                <span class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-400">$</span>
                <input
                  v-model.number="form.monto"
                  type="number"
                  min="0"
                  step="500"
                  placeholder="0"
                  class="w-full rounded-xl border border-black/[0.08] py-2.5 pr-3 pl-7 text-sm font-medium font-secondary text-primitive-dark-500 outline-none transition-colors focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                />
              </div>
            </div>

            <!-- Concepto -->
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">
                Concepto <span class="font-normal normal-case tracking-normal text-slate-300">(opcional)</span>
              </label>
              <input
                v-model="form.concepto"
                type="text"
                :placeholder="conceptoPlaceholder"
                class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
              />
            </div>

            <!-- Método + Fecha -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Método</label>
                <div class="relative">
                  <select v-model="form.metodoPago" class="w-full appearance-none rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 pr-8 text-sm text-primitive-dark-500 outline-none transition-colors focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100">
                    <option v-for="m in METODOS" :key="m" :value="m">{{ metodoLabel(m) }}</option>
                  </select>
                  <i class="icon-[material-symbols--keyboard-arrow-down] pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
                </div>
              </div>
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Fecha</label>
                <input v-model="form.fecha" type="date" :max="today" class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-primitive-dark-500 outline-none transition-colors focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100" />
              </div>
            </div>

            <p v-if="errorMsg" class="flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600">
              <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMsg }}
            </p>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 border-t border-black/[0.06] px-6 py-4">
            <button class="rounded-full border border-black/[0.08] px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer" @click="emit('close')">
              Cancelar
            </button>
            <button
              class="flex items-center gap-2 rounded-full bg-primitive-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="saving"
              @click="handleSave"
            >
              <i v-if="saving" class="icon-[material-symbols--progress-activity] animate-spin text-xs"></i>
              {{ saving ? 'Guardando...' : 'Registrar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { dayjs } from '@/utils/datetime'
import { categoriaMeta, categoriasManuales, metodoLabel, METODOS } from '@/utils/cash'

const props = defineProps({
  visible: Boolean,
  saving: Boolean,
})
const emit = defineEmits(['close', 'save'])

const today = dayjs().format('YYYY-MM-DD')

const getEmptyForm = () => ({
  tipo: 'ingreso',
  categoria: 'venta',
  concepto: '',
  monto: null,
  metodoPago: 'efectivo',
  fecha: today,
})

const form = ref(getEmptyForm())
const errorMsg = ref('')

const categorias = computed(() => categoriasManuales(form.value.tipo))

const conceptoPlaceholder = computed(() => {
  const map = {
    venta: 'Ej: 2 Gatorade + grip',
    alquiler: 'Ej: 2 paletas',
    saldo: 'Ej: saldo restante turno',
    gasto: 'Ej: insumos kiosco',
    retiro: 'Ej: retiro a banco',
    otro: 'Detalle del movimiento',
  }
  return map[form.value.categoria] || 'Detalle del movimiento'
})

const setTipo = (t) => {
  form.value.tipo = t
  if (!categorias.value.includes(form.value.categoria)) {
    form.value.categoria = categorias.value[0]
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      form.value = getEmptyForm()
      errorMsg.value = ''
    }
  },
)

const handleSave = () => {
  errorMsg.value = ''
  const monto = Number(form.value.monto)
  if (!Number.isFinite(monto) || monto <= 0) {
    errorMsg.value = 'Ingresá un monto mayor a 0.'
    return
  }
  // Si la fecha es hoy, usamos la hora actual (para que quede al tope y con
  // hora real); si es otro día, el mediodía de ese día.
  let fechaISO
  if (!form.value.fecha || form.value.fecha === today) {
    fechaISO = dayjs().toISOString()
  } else {
    fechaISO = dayjs(`${form.value.fecha} 12:00`, 'YYYY-MM-DD HH:mm').toISOString()
  }

  emit('save', {
    tipo: form.value.tipo,
    categoria: form.value.categoria,
    concepto: form.value.concepto.trim(),
    monto,
    metodoPago: form.value.metodoPago,
    fecha: fechaISO,
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
