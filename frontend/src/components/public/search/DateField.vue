<script setup>
import { computed, ref } from 'vue'
import { dayjs } from '@/utils/datetime'
import FilterPopover from './FilterPopover.vue'
import MiniCalendar from '@/components/common/MiniCalendar.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  align: { type: String, default: 'left' },
})

const emit = defineEmits(['update:modelValue'])

const popover = ref(null)

const hoy = dayjs().startOf('day')

// Los próximos días como atajos. Cubren casi toda la intención real ("juego hoy
// o el finde"); el calendario queda para lo que se sale de eso.
const atajos = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = hoy.add(i, 'day')
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.format('ddd D')
    return {
      value: d.format('YYYY-MM-DD'),
      label: label.charAt(0).toUpperCase() + label.slice(1),
    }
  }),
)

// Etiqueta del campo cerrado: "Hoy"/"Mañana" cuando aplica, si no la fecha
// escrita. Un "2026-08-14" no le dice a nadie qué día de la semana es.
const label = computed(() => {
  if (!props.modelValue) return ''
  const d = dayjs(props.modelValue)
  const dias = d.startOf('day').diff(hoy, 'day')
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  const texto = d.format('ddd D [de] MMM')
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

const elegir = (value) => {
  emit('update:modelValue', value)
  popover.value?.close()
}
</script>

<template>
  <FilterPopover
    ref="popover"
    label="Fecha"
    icon="icon-[material-symbols--calendar-month]"
    :value="label"
    placeholder="Elegí un día"
    :align="align"
    panel-class="w-[19rem]"
  >
    <p class="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
      Próximos días
    </p>
    <div class="flex flex-wrap gap-1.5">
      <button
        v-for="a in atajos"
        :key="a.value"
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer"
        :class="
          modelValue === a.value
            ? 'bg-brand-green-500 text-white'
            : 'border border-black/[0.08] bg-white text-stone-600 hover:bg-stone-50'
        "
        @click="elegir(a.value)"
      >
        {{ a.label }}
      </button>
    </div>

    <p class="mt-3 border-t border-black/[0.06] px-1 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
      Otra fecha
    </p>
    <MiniCalendar :model-value="modelValue" @update:model-value="elegir" />
  </FilterPopover>
</template>
