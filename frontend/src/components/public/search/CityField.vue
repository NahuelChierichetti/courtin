<script setup>
import { computed, onMounted, ref } from 'vue'
import publicService from '@/services/publicService'
import FilterPopover from './FilterPopover.vue'

// Ciudades reales, traídas de /public/cities.
//
// Antes era texto libre: había que adivinar cómo estaba escrita la ciudad, y un
// "la plata" con acento de más o una "Cdad. de Bs As" no coincidía con nada. Si
// una ciudad está en esta lista, es porque hay complejos ahí.
const props = defineProps({
  modelValue: { type: String, default: '' },
  align: { type: String, default: 'left' },
})

const emit = defineEmits(['update:modelValue'])

const popover = ref(null)
const cities = ref([])
const filtro = ref('')
const cargando = ref(true)

const visibles = computed(() => {
  const term = filtro.value.trim().toLowerCase()
  if (!term) return cities.value
  return cities.value.filter((c) => c.toLowerCase().includes(term))
})

const elegir = (ciudad) => {
  emit('update:modelValue', ciudad)
  filtro.value = ''
  popover.value?.close()
}

onMounted(async () => {
  try {
    cities.value = await publicService.getCities()
  } catch (error) {
    console.error(error)
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <FilterPopover
    ref="popover"
    label="Ubicación"
    icon="icon-[material-symbols--location-on-outline]"
    :value="modelValue"
    placeholder="Todas las ciudades"
    :align="align"
    panel-class="w-72"
  >
    <!-- El buscador interno sólo aparece cuando la lista es larga: con cuatro
         ciudades sería un campo de más que hay que leer y descartar. -->
    <input
      v-if="cities.length > 8"
      v-model="filtro"
      type="text"
      placeholder="Buscar ciudad"
      class="mb-2 h-10 w-full rounded-xl border border-black/[0.08] px-3 text-sm outline-none focus:border-brand-green-400"
    />

    <div class="max-h-64 space-y-0.5 overflow-y-auto">
      <button
        type="button"
        class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer"
        :class="!modelValue ? 'bg-brand-green-50 text-brand-green-700' : 'text-stone-700 hover:bg-stone-50'"
        @click="elegir('')"
      >
        <span class="flex-1">Todas las ciudades</span>
        <i v-if="!modelValue" class="icon-[material-symbols--check] text-sm text-brand-green-500"></i>
      </button>

      <p v-if="cargando" class="px-3 py-3 text-sm text-stone-400">Cargando ciudades...</p>
      <p v-else-if="!cities.length" class="px-3 py-3 text-sm text-stone-400">
        Todavía no hay complejos publicados.
      </p>
      <p v-else-if="!visibles.length" class="px-3 py-3 text-sm text-stone-400">
        No hay ciudades que coincidan.
      </p>

      <button
        v-for="c in visibles"
        :key="c"
        type="button"
        class="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer"
        :class="modelValue === c ? 'bg-brand-green-50 text-brand-green-700' : 'text-stone-700 hover:bg-stone-50'"
        @click="elegir(c)"
      >
        <span class="flex-1 truncate">{{ c }}</span>
        <i v-if="modelValue === c" class="icon-[material-symbols--check] text-sm text-brand-green-500"></i>
      </button>
    </div>
  </FilterPopover>
</template>
