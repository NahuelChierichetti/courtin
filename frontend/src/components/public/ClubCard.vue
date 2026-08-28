<script setup>
import { computed } from 'vue'
import { sportMeta } from '@/utils/turnos'
import { formatCurrency } from '@/utils/datetime'
import FavoriteButton from '@/components/public/FavoriteButton.vue'

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
  <!--
    El corazón va como hermano del botón de la card y no adentro: un <button>
    dentro de otro <button> es HTML inválido y el click interno se vuelve
    impredecible.
  -->
  <div class="relative">
  <button
    type="button"
    class="group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white text-left shadow-sm transition-shadow hover:shadow-md cursor-pointer"
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
      <!-- <span
        v-if="primarySport"
        class="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-green-900 shadow-sm"
      >
        {{ sportMeta(primarySport).label }}
      </span> -->
    </div>

    <!--
      Logo del complejo, a caballo entre la foto y el cuerpo (de ahí que viva
      fuera del cover, que recorta lo que se le desborda). `top-52` es la altura
      del cover: con el -translate-y-1/2 queda centrado justo en el borde.
    -->
    <div
      class="absolute right-5 top-52 flex h-20 w-20 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-stone-300 ring-1 ring-black/[0.06]"
    >
      <img v-if="club.logo" :src="club.logo" :alt="`Logo de ${club.nombre}`" class="h-full w-full bg-white object-contain" />
      <i v-else class="icon-[material-symbols--image] text-3xl text-white"></i>
    </div>

    <!-- Body -->
    <div class="flex flex-1 flex-col p-5">
      <!-- pr-20: el logo se mete sobre esta línea; sin esto, un nombre largo
           pasa por debajo. -->
      <div class="flex items-start justify-between gap-3 pr-20">
        <h3 class="text-lg font-bold leading-snug text-brand-green-900">{{ club.nombre }}</h3>
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

      <div class="mt-4 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
        <p v-if="club.precioDesde" class="text-lg font-bold text-brand-green-500">
          {{ formatCurrency(club.precioDesde, club.moneda) }}
          <span class="text-sm font-medium text-stone-400">/hora</span>
        </p>
        <p v-else class="text-sm font-medium text-stone-400">Ver disponibilidad</p>
        <span
          class="rounded-full bg-brand-lime-500 px-4 py-2 text-sm font-semibold text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
        >
          Reservar
          <i class="icon-[material-symbols--arrow-forward] text-base transition-transform group-hover:translate-x-0.5"></i>
        </span>
      </div>
    </div>
  </button>

    <FavoriteButton :club="club" class="absolute right-3 top-3" />
  </div>
</template>
