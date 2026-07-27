<script setup>
import { computed } from 'vue'
import { sportMeta } from '@/utils/turnos'
import { formatCurrency } from '@/utils/datetime'

const props = defineProps({
  club: { type: Object, required: true },
})

defineEmits(['select'])

const cover = computed(() => props.club.fotos?.[0] || null)
const primarySport = computed(() => props.club.deportes?.[0] || null)
const location = computed(() =>
  [props.club.direccion, props.club.ciudad].filter(Boolean).join(', '),
)
// Etiqueta de horario "Abre HH:MM · Cierra HH:MM" cuando el club expone horarios.
const hoursLabel = computed(() => {
  const sem = props.club.horarios?.semanal
  if (!sem) return null
  const keys = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const today = sem[keys[new Date().getDay()]]
  if (!today || today.abierto === false) return null
  return `Abre ${today.horaInicio} · Cierra ${today.horaFin}`
})
</script>

<template>
  <button
    type="button"
    class="group flex flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white text-left shadow-sm transition-shadow hover:shadow-md cursor-pointer"
    @click="$emit('select', club)"
  >
    <!-- Cover -->
    <div class="relative h-52 w-full overflow-hidden">
      <img
        v-if="cover"
        :src="cover"
        :alt="club.nombre"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div v-else class="relative h-full w-full bg-gradient-to-br from-ink-500 to-brand-purple-500">
        <div class="absolute inset-5 rounded-lg border border-white/15">
          <div class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/15"></div>
          <div class="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/15"></div>
          <div class="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"></div>
        </div>
      </div>
      <span
        v-if="primarySport"
        class="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-500 shadow-sm"
      >
        {{ sportMeta(primarySport).label }}
      </span>
    </div>

    <!-- Body -->
    <div class="flex flex-1 flex-col p-5">
      <div class="flex items-start justify-between gap-3">
        <h3 class="text-lg font-bold leading-snug text-ink-500">{{ club.nombre }}</h3>
        <span v-if="club.rating" class="flex shrink-0 items-center gap-1 text-sm font-bold text-success-600">
          <i class="icon-[material-symbols--star] text-xs"></i>{{ Number(club.rating).toFixed(2) }}
        </span>
      </div>

      <div class="mt-3 space-y-2 text-sm text-stone-500">
        <p v-if="location" class="flex items-center gap-2">
          <i class="icon-[material-symbols--location-on] text-[13px] text-stone-400"></i>{{ location }}
        </p>
        <p v-if="club.deportes?.length" class="flex items-center gap-2">
          <i class="icon-[material-symbols--grid-view] text-[13px] text-stone-400"></i>
          {{ club.deportes.map((d) => sportMeta(d).label).join(' · ') }}
        </p>
        <p v-if="hoursLabel" class="flex items-center gap-2">
          <i class="icon-[material-symbols--schedule] text-[13px] text-stone-400"></i>{{ hoursLabel }}
        </p>
      </div>

      <div class="mt-4 border-t border-black/[0.06] pt-4">
        <p v-if="club.precioDesde" class="text-lg font-bold text-brand-green-500">
          {{ formatCurrency(club.precioDesde, club.moneda) }}
          <span class="text-sm font-medium text-stone-400">/hora</span>
        </p>
        <p v-else class="text-sm font-medium text-stone-400">Ver disponibilidad</p>
      </div>
    </div>
  </button>
</template>
