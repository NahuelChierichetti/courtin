<script setup>
import { computed, ref } from 'vue'
import FilterPopover from './FilterPopover.vue'

// Franja horaria en vez de una hora exacta.
//
// Pedir una hora puntual era la forma más rápida de no encontrar nada: si el
// complejo arranca los turnos 20:00 y 21:00, buscar "20:30" daba cero resultados
// aunque estuviera libre toda la noche. Las franjas describen la intención real
// ("juego a la tarde") y el backend filtra por rango.
const props = defineProps({
  desde: { type: String, default: '' },
  hasta: { type: String, default: '' },
  align: { type: String, default: 'left' },
})

const emit = defineEmits(['update:desde', 'update:hasta'])

const popover = ref(null)

const FRANJAS = [
  { label: 'Cualquier hora', desde: '', hasta: '', icon: 'icon-[material-symbols--schedule]' },
  { label: 'Mañana', detalle: '6 a 12 hs', desde: '06:00', hasta: '11:59', icon: 'icon-[material-symbols--wb-twilight]' },
  { label: 'Tarde', detalle: '12 a 18 hs', desde: '12:00', hasta: '17:59', icon: 'icon-[material-symbols--wb-sunny-outline]' },
  { label: 'Noche', detalle: '18 a 24 hs', desde: '18:00', hasta: '23:59', icon: 'icon-[material-symbols--bedtime-outline]' },
]

// Horas cerradas: nadie busca "a partir de las 20:47", y ofrecer minutos sueltos
// era justamente lo que hacía fallar la búsqueda.
const HORAS = Array.from({ length: 17 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`)

const franjaActiva = computed(() =>
  FRANJAS.find((f) => f.desde === props.desde && f.hasta === props.hasta),
)

const label = computed(() => {
  if (franjaActiva.value) return franjaActiva.value.desde ? franjaActiva.value.label : ''
  if (props.desde) return `Desde las ${props.desde}`
  return ''
})

const elegirFranja = (franja) => {
  emit('update:desde', franja.desde)
  emit('update:hasta', franja.hasta)
  popover.value?.close()
}

// "A partir de": sin cota superior, así que muestra todo lo que quede después.
const elegirHora = (hora) => {
  emit('update:desde', hora)
  emit('update:hasta', '')
  popover.value?.close()
}
</script>

<template>
  <FilterPopover
    ref="popover"
    label="Horario"
    icon="icon-[material-symbols--schedule]"
    :value="label"
    placeholder="Cualquier hora"
    :align="align"
    panel-class="w-72"
  >
    <div class="space-y-1">
      <button
        v-for="f in FRANJAS"
        :key="f.label"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer"
        :class="
          franjaActiva === f
            ? 'bg-brand-green-50 text-brand-green-700'
            : 'text-stone-700 hover:bg-stone-50'
        "
        @click="elegirFranja(f)"
      >
        <i :class="f.icon" class="text-base text-brand-green-500"></i>
        <span class="flex-1 text-sm font-semibold">{{ f.label }}</span>
        <span v-if="f.detalle" class="text-xs text-stone-400">{{ f.detalle }}</span>
        <i
          v-if="franjaActiva === f"
          class="icon-[material-symbols--check] text-sm text-brand-green-500"
        ></i>
      </button>
    </div>

    <p class="mt-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
      A partir de una hora
    </p>
    <div class="grid grid-cols-4 gap-1.5">
      <button
        v-for="h in HORAS"
        :key="h"
        type="button"
        class="rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer"
        :class="
          desde === h && !hasta
            ? 'bg-brand-green-500 text-white'
            : 'border border-black/[0.08] bg-white text-stone-600 hover:bg-stone-50'
        "
        @click="elegirHora(h)"
      >
        {{ h }}
      </button>
    </div>
  </FilterPopover>
</template>
