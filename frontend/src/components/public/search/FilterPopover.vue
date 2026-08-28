<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

// Disparador + panel para los filtros del buscador.
//
// Existe porque el problema principal del buscador viejo era que había que
// acertarle a un ícono diminuto (el de `<input type="date">`) para que se
// abriera algo. Acá el disparador entero es el botón: se abre desde cualquier
// punto del campo.
defineProps({
  label: { type: String, required: true },
  icon: { type: String, required: true },
  // Lo que se ve cuando está cerrado. Si no hay valor elegido, se muestra en
  // gris como un placeholder.
  value: { type: String, default: '' },
  placeholder: { type: String, default: 'Cualquiera' },
  align: { type: String, default: 'left' },
  panelClass: { type: String, default: 'w-80' },
})

const open = ref(false)
const root = ref(null)

const close = () => {
  open.value = false
}

// Cierre por click afuera comprobando contención real, en vez de `@click.stop`
// dentro del panel: el panel tiene controles propios (calendario, chips) y
// frenar la propagación de todos sus clicks rompe cosas sutiles.
const onDocumentClick = (event) => {
  if (root.value && !root.value.contains(event.target)) close()
}

const onKeydown = (event) => {
  if (event.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ close })
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-stone-50 cursor-pointer"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="open = !open"
    >
      <i :class="icon" class="shrink-0 text-base text-brand-green-500"></i>
      <span class="min-w-0 flex-1">
        <span class="block text-[11px] font-semibold uppercase tracking-wide text-brand-green-500">
          {{ label }}
        </span>
        <span
          class="block truncate text-sm font-medium"
          :class="value ? 'text-brand-green-900' : 'text-stone-400'"
        >
          {{ value || placeholder }}
        </span>
      </span>
      <i
        class="icon-[material-symbols--keyboard-arrow-down] shrink-0 text-sm text-stone-400 transition-transform"
        :class="{ 'rotate-180': open }"
      ></i>
    </button>

    <div
      v-if="open"
      role="dialog"
      class="absolute top-full z-50 mt-2 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-xl"
      :class="[panelClass, align === 'right' ? 'right-0' : 'left-0']"
    >
      <slot :close="close" />
    </div>
  </div>
</template>
