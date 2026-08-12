<script setup>
import { RouterLink, useRoute } from 'vue-router'

// Navegación del área de cuenta del jugador. Vive en un componente aparte
// porque la comparten "Mis reservas" y "Mi cuenta", que son rutas hermanas sin
// un layout propio en el router.
const route = useRoute()

// Las notificaciones no están acá a propósito: se llega por la campanita del
// header, que es donde el jugador las busca. Sumarlas como cuarta pestaña
// apretaría las cuatro etiquetas en pantallas de 390 px.
const TABS = [
  { name: 'mis-reservas', label: 'Mis reservas', icon: 'icon-[material-symbols--calendar-month]' },
  { name: 'favoritos', label: 'Favoritos', icon: 'icon-[material-symbols--favorite-outline]' },
  { name: 'cuenta', label: 'Mi cuenta', icon: 'icon-[material-symbols--person-outline]' },
]

// El estado activo se resuelve acá y no con `active-class`: las clases de
// Tailwind que se pisan (texto blanco vs. gris) dependerían del orden del CSS
// generado, no del orden en que se escriben.
const isActive = (name) => route.name === name
</script>

<template>
  <nav class="flex gap-1 rounded-full bg-white p-1 ring-1 ring-black/[0.06]">
    <RouterLink
      v-for="tab in TABS"
      :key="tab.name"
      :to="{ name: tab.name }"
      class="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-semibold no-underline transition-colors sm:px-4"
      :class="
        isActive(tab.name)
          ? 'bg-brand-green-500 text-white'
          : 'text-stone-600 hover:bg-stone-50'
      "
    >
      <i :class="tab.icon" class="hidden text-base sm:inline-block"></i>
      {{ tab.label }}
    </RouterLink>
  </nav>
</template>
