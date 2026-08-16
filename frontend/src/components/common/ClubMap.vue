<script setup>
import { computed } from 'vue'
import { embedUrl, tieneCoords } from '@/utils/maps'

// El mapa del complejo, con el pin donde está la cancha. Lo usan la ficha
// pública y la configuración de la landing: es el mismo mapa, así que el
// complejo ve al configurar exactamente lo que va a ver el jugador.

const props = defineProps({
  nombre: { type: String, default: 'el complejo' },
  lat: { type: [Number, String], default: null },
  lng: { type: [Number, String], default: null },
  // Respaldo cuando todavía no hay coordenadas: Google ubica la dirección.
  direccion: { type: String, default: '' },
  ciudad: { type: String, default: '' },
  provincia: { type: String, default: '' },
  zoom: { type: Number, default: 16 },
  heightClass: { type: String, default: 'h-[320px]' },
})

const src = computed(() =>
  embedUrl({
    lat: props.lat,
    lng: props.lng,
    direccion: props.direccion,
    ciudad: props.ciudad,
    provincia: props.provincia,
    zoom: props.zoom,
  }),
)

// Sin coordenadas el pin lo pone Google interpretando la dirección, que puede
// caer cerca pero no en la puerta. Se avisa en vez de dar por bueno el punto.
const aproximado = computed(() => !!src.value && !tieneCoords({ lat: props.lat, lng: props.lng }))
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-stone-100" :class="heightClass">
    <iframe
      v-if="src"
      :src="src"
      :title="`Mapa de ${nombre}`"
      class="h-full w-full border-0"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      allowfullscreen
    ></iframe>

    <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-center">
      <i class="icon-[material-symbols--location-off] text-2xl text-stone-300"></i>
      <p class="px-6 text-xs text-stone-400">Todavía no hay una ubicación cargada.</p>
    </div>

    <span
      v-if="aproximado"
      class="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-medium text-stone-500 shadow-sm"
    >
      <i class="icon-[material-symbols--info-outline] text-xs"></i>Ubicación aproximada
    </span>
  </div>
</template>
