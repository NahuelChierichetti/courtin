<script setup>
import { computed, ref } from 'vue'
import { PUBLIC_SPORTS, sportMeta } from '@/utils/sports'
import SportIcon from '@/components/public/SportIcon.vue'
import FilterPopover from './FilterPopover.vue'

// Deporte como campo del buscador. Antes sólo existía como chips en la vista de
// resultados: desde la home había que buscar primero y filtrar después.
const props = defineProps({
  modelValue: { type: String, default: '' },
  align: { type: String, default: 'left' },
})

const emit = defineEmits(['update:modelValue'])

const popover = ref(null)

const label = computed(() => (props.modelValue ? sportMeta(props.modelValue).label : ''))

const elegir = (value) => {
  emit('update:modelValue', value)
  popover.value?.close()
}
</script>

<template>
  <FilterPopover
    ref="popover"
    label="Deporte"
    icon="icon-[material-symbols--sports-tennis-outline]"
    :value="label"
    placeholder="Todos los deportes"
    :align="align"
    panel-class="w-60"
  >
    <div class="space-y-0.5">
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors cursor-pointer"
        :class="!modelValue ? 'bg-brand-green-50 text-brand-green-700' : 'text-stone-700 hover:bg-stone-50'"
        @click="elegir('')"
      >
        <i class="icon-[material-symbols--apps] text-base text-brand-green-500"></i>
        <span class="flex-1">Todos los deportes</span>
        <i v-if="!modelValue" class="icon-[material-symbols--check] text-sm text-brand-green-500"></i>
      </button>

      <button
        v-for="s in PUBLIC_SPORTS"
        :key="s.key"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors cursor-pointer"
        :class="modelValue === s.key ? 'bg-brand-green-50 text-brand-green-700' : 'text-stone-700 hover:bg-stone-50'"
        @click="elegir(s.key)"
      >
        <SportIcon :sport="s.key" class="h-[18px] w-[18px] text-brand-green-500" />
        <span class="flex-1">{{ s.label }}</span>
        <i v-if="modelValue === s.key" class="icon-[material-symbols--check] text-sm text-brand-green-500"></i>
      </button>
    </div>
  </FilterPopover>
</template>
