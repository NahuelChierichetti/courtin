<script setup>
// Dibujo esquemático de una cancha, por deporte. Es la cara de cada tarjeta en
// la vista de Canchas.
//
// Vive en su propio componente y no suelto dentro de `CanchasView` porque la
// demo de la landing muestra esas mismas tarjetas: si los dibujos estuvieran
// pegados a la vista, la landing tendría copias que se irían despegando del
// producto con cada cambio.
//
// El deporte sin dibujo propio cae al ícono del catálogo. Eso pasa con "otro" y
// con cualquier clave que llegue de un catálogo posterior al de esta versión.
import SportIcon from '@/components/public/SportIcon.vue'

defineProps({
  tipo: { type: String, default: 'otro' },
})

// Las líneas se dibujan con el `ink` de marca a baja opacidad: el color del
// deporte ya lo pone el fondo de la tarjeta, y repetirlo acá lo saturaba.
const LINEA = '#16241b'
</script>

<template>
  <!-- Pádel -->
  <svg v-if="tipo === 'padel'" class="h-28 w-36" viewBox="0 0 180 140" fill="none">
    <rect x="10" y="10" width="160" height="120" rx="2" :stroke="LINEA" stroke-opacity="0.55" stroke-width="2" fill="none" />
    <line x1="90" y1="10" x2="90" y2="130" :stroke="LINEA" stroke-opacity="0.55" stroke-width="2" />
    <rect x="35" y="10" width="110" height="30" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <rect x="35" y="100" width="110" height="30" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <line x1="10" y1="70" x2="170" y2="70" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="4 3" />
  </svg>

  <!-- Tenis -->
  <svg v-else-if="tipo === 'tenis'" class="h-28 w-36" viewBox="0 0 180 140" fill="none">
    <rect x="10" y="10" width="160" height="120" rx="2" :stroke="LINEA" stroke-opacity="0.55" stroke-width="2" fill="none" />
    <line x1="90" y1="10" x2="90" y2="130" :stroke="LINEA" stroke-opacity="0.55" stroke-width="2" />
    <rect x="40" y="10" width="100" height="35" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <rect x="40" y="95" width="100" height="35" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <rect x="55" y="10" width="70" height="35" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1" fill="none" />
    <rect x="55" y="95" width="70" height="35" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1" fill="none" />
    <line x1="10" y1="70" x2="170" y2="70" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" />
  </svg>

  <!-- Fútbol -->
  <svg v-else-if="tipo === 'futbol'" class="h-28 w-36" viewBox="0 0 180 140" fill="none">
    <rect x="10" y="10" width="160" height="120" rx="2" :stroke="LINEA" stroke-opacity="0.55" stroke-width="2" fill="none" />
    <line x1="90" y1="10" x2="90" y2="130" :stroke="LINEA" stroke-opacity="0.55" stroke-width="2" />
    <circle cx="90" cy="70" r="20" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <rect x="10" y="35" width="30" height="70" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <rect x="140" y="35" width="30" height="70" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <rect x="10" y="50" width="15" height="40" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1" fill="none" />
    <rect x="155" y="50" width="15" height="40" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1" fill="none" />
  </svg>

  <!-- Básquet -->
  <svg v-else-if="tipo === 'basquet'" class="h-28 w-36" viewBox="0 0 180 140" fill="none">
    <rect x="10" y="10" width="160" height="120" rx="2" :stroke="LINEA" stroke-opacity="0.55" stroke-width="2" fill="none" />
    <line x1="90" y1="10" x2="90" y2="130" :stroke="LINEA" stroke-opacity="0.55" stroke-width="2" />
    <circle cx="90" cy="70" r="18" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <rect x="10" y="45" width="35" height="50" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <rect x="135" y="45" width="35" height="50" rx="1" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <path d="M45 50a22 22 0 0 1 0 40" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
    <path d="M135 50a22 22 0 0 0 0 40" :stroke="LINEA" stroke-opacity="0.35" stroke-width="1.5" fill="none" />
  </svg>

  <SportIcon v-else :sport="tipo" class="h-16 w-16 text-brand-green-900/30" />
</template>
