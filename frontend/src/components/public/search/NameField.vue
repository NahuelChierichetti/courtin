<script setup>
// Búsqueda por nombre del complejo.
//
// El campo decía "¿Qué querés jugar?", que invitaba a escribir un deporte, pero
// lo que hace es buscar por nombre/dirección. Escribir "pádel" ahí devolvía sólo
// los complejos que tuvieran "pádel" en el nombre. El deporte ahora tiene su
// propio selector, y este campo dice lo que realmente busca.
defineProps({
  modelValue: { type: String, default: '' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <label
    class="flex w-full cursor-text items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-stone-50"
  >
    <i class="icon-[material-symbols--search] shrink-0 text-base text-brand-green-500"></i>
    <span class="min-w-0 flex-1">
      <span class="block text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        Complejo
      </span>
      <input
        :value="modelValue"
        type="text"
        placeholder="Nombre"
        class="block h-5 w-full bg-transparent text-sm font-medium text-ink-500 outline-none placeholder:font-medium placeholder:text-stone-400"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </span>
    <button
      v-if="modelValue"
      type="button"
      class="shrink-0 text-stone-400 transition-colors hover:text-stone-600 cursor-pointer"
      aria-label="Borrar"
      @click.prevent="$emit('update:modelValue', '')"
    >
      <i class="icon-[material-symbols--close] text-sm"></i>
    </button>
  </label>
</template>
