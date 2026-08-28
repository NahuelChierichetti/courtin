<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { dayjs } from '@/utils/datetime'
import MiniCalendar from '@/components/common/MiniCalendar.vue'

// Selector de fecha del calendario de turnos.
//
// Las flechas siguen estando para moverse de a un día (o de a una semana), pero
// el salto largo —"quiero ver el finde que viene"— se hace en el calendario que
// abre la fecha. En modo semana el día elegido define la semana que se muestra,
// así que el calendario resalta los siete días completos.
const props = defineProps({
  modelValue: { type: String, required: true },
  mode: { type: String, default: 'day' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const root = ref(null)

const weekStart = computed(() => dayjs(props.modelValue).startOf('week'))
const weekEnd = computed(() => weekStart.value.add(6, 'day'))

const rangeStart = computed(() =>
  props.mode === 'week' ? weekStart.value.format('YYYY-MM-DD') : '',
)
const rangeEnd = computed(() => (props.mode === 'week' ? weekEnd.value.format('YYYY-MM-DD') : ''))

const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1)

const label = computed(() => {
  if (props.mode === 'day') return capitalizar(dayjs(props.modelValue).format('ddd DD [de] MMMM, YYYY'))
  return `${weekStart.value.format('DD MMM')} – ${weekEnd.value.format('DD MMM')}`
})

// Versión corta para mobile: en la barra no hay ancho para "Lun. 17 de agosto,
// 2026". En vista semanal el rango ya es corto y se reusa tal cual.
const labelShort = computed(() => {
  if (props.mode !== 'day') return label.value
  return capitalizar(dayjs(props.modelValue).format('ddd DD MMM'))
})

const hoy = computed(() => dayjs().format('YYYY-MM-DD'))

const esHoy = computed(() =>
  props.mode === 'day'
    ? props.modelValue === hoy.value
    : dayjs().isSame(weekStart.value, 'week'),
)

const set = (value) => {
  if (value !== props.modelValue) emit('update:modelValue', value)
}

const shift = (dir) => {
  const unit = props.mode === 'day' ? 'day' : 'week'
  set(dayjs(props.modelValue).add(dir, unit).format('YYYY-MM-DD'))
}

const elegir = (value) => {
  set(value)
  open.value = false
}

const irHoy = () => elegir(hoy.value)

// Cerrar al hacer click afuera. El listener va en captura sobre `document`
// porque el popover convive con otros menús de la barra.
const onDocClick = (e) => {
  if (!open.value) return
  if (root.value && !root.value.contains(e.target)) open.value = false
}

const onKeydown = (e) => {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="relative">
    <div class="flex items-center rounded-full border border-black/[0.06] bg-white shadow-sm">
      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-l-full text-stone-500 transition-colors hover:bg-stone-50 cursor-pointer"
        :aria-label="mode === 'day' ? 'Día anterior' : 'Semana anterior'"
        @click="shift(-1)"
      >
        <i class="icon-[material-symbols--chevron-left] text-xs"></i>
      </button>

      <button
        type="button"
        class="flex h-9 min-w-[136px] items-center justify-center gap-1.5 px-2 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-stone-50 cursor-pointer lg:min-w-[196px] lg:px-3"
        :aria-expanded="open"
        aria-haspopup="dialog"
        title="Elegir fecha"
        @click="open = !open"
      >
        <i class="icon-[material-symbols--calendar-month] shrink-0 text-sm text-stone-400"></i>
        <!-- En mobile no entra la fecha larga. -->
        <span class="lg:hidden">{{ labelShort }}</span>
        <span class="hidden lg:inline">{{ label }}</span>
        <i class="icon-[material-symbols--keyboard-arrow-down] shrink-0 text-[10px] text-stone-400"></i>
      </button>

      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-r-full text-stone-500 transition-colors hover:bg-stone-50 cursor-pointer"
        :aria-label="mode === 'day' ? 'Día siguiente' : 'Semana siguiente'"
        @click="shift(1)"
      >
        <i class="icon-[material-symbols--chevron-right] text-xs"></i>
      </button>
    </div>

    <div
      v-if="open"
      role="dialog"
      class="absolute left-0 top-full z-30 mt-1 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-black/[0.06] bg-white p-3 shadow-lg"
    >
      <div class="flex items-center justify-between px-1 pb-2">
        <p class="text-[11px] font-semibold uppercase tracking-wide text-stone-400">
          {{ mode === 'day' ? 'Ver otro día' : 'Ver otra semana' }}
        </p>
        <button
          type="button"
          class="rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-default disabled:opacity-40"
          :class="esHoy ? 'text-stone-400' : 'text-brand-green-600 hover:bg-brand-green-50'"
          :disabled="esHoy"
          @click="irHoy"
        >
          Ir a hoy
        </button>
      </div>

      <MiniCalendar
        :model-value="modelValue"
        :min-date="null"
        :range-start="rangeStart"
        :range-end="rangeEnd"
        @update:model-value="elegir"
      />

      <p v-if="mode === 'week'" class="px-1 pt-2 text-[11px] leading-snug text-stone-400">
        Se muestra la semana completa del día que elijas.
      </p>
    </div>
  </div>
</template>
