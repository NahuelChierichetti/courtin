<script setup>
import { computed, ref, watch } from 'vue'
import { dayjs } from '@/utils/datetime'

// Calendario chico para elegir una fecha.
//
// Propio y no el DatePicker de PrimeVue por tres razones concretas: sale en
// inglés salvo que se configure un locale aparte (dayjs ya está en español), el
// preset de la app lo pinta con un panel oscuro que no pega con el buscador, y
// arrastra ~112 KB al bundle para un mes de casillas.
const props = defineProps({
  modelValue: { type: String, default: '' },
  // Nada antes de hoy: no se reserva para atrás. En el panel se pasa `null`
  // porque ahí sí se miran días pasados.
  minDate: { type: String, default: () => dayjs().format('YYYY-MM-DD') },
  // Rango a resaltar además del día elegido (la semana visible, en el panel).
  // Ambos extremos incluidos.
  rangeStart: { type: String, default: '' },
  rangeEnd: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

// Iniciales de lunes a domingo, que es como se lee un calendario acá.
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const cursor = ref(dayjs(props.modelValue || undefined).startOf('month'))

// La fecha también cambia desde afuera (flechas del header, atajo "Hoy"): si el
// mes no acompaña, al abrir el calendario el día elegido no está a la vista.
watch(
  () => props.modelValue,
  (value) => {
    if (!value) return
    const d = dayjs(value)
    if (!d.isSame(cursor.value, 'month')) cursor.value = d.startOf('month')
  },
)

const titulo = computed(() => {
  const t = cursor.value.format('MMMM YYYY')
  return t.charAt(0).toUpperCase() + t.slice(1)
})

// Casillas del mes, con huecos al principio para que el día 1 caiga bajo su
// columna. `day()` devuelve 0 para domingo, así que se corre para que el lunes
// sea la primera columna.
const celdas = computed(() => {
  const primero = cursor.value.startOf('month')
  const offset = (primero.day() + 6) % 7
  const total = cursor.value.daysInMonth()

  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => primero.add(i, 'day')),
  ]
})

const min = computed(() => (props.minDate ? dayjs(props.minDate).startOf('day') : null))

const esPasado = (d) => !!min.value && d.startOf('day').isBefore(min.value)
const esSeleccionado = (d) => props.modelValue === d.format('YYYY-MM-DD')
const esHoy = (d) => d.isSame(dayjs(), 'day')

const esDelRango = (d) => {
  if (!props.rangeStart || !props.rangeEnd) return false
  const key = d.format('YYYY-MM-DD')
  return key >= props.rangeStart && key <= props.rangeEnd
}

// No se puede retroceder más allá del mes de `minDate`: un mes entero de días
// deshabilitados no le sirve a nadie. Sin `minDate` no hay tope.
const puedeRetroceder = computed(() => !min.value || cursor.value.isAfter(min.value, 'month'))

const mover = (meses) => {
  if (meses < 0 && !puedeRetroceder.value) return
  cursor.value = cursor.value.add(meses, 'month')
}

const elegir = (d) => {
  if (esPasado(d)) return
  emit('update:modelValue', d.format('YYYY-MM-DD'))
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between px-1 pb-2">
      <button
        type="button"
        :disabled="!puedeRetroceder"
        class="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
        aria-label="Mes anterior"
        @click="mover(-1)"
      >
        <i class="icon-[material-symbols--chevron-left] text-base"></i>
      </button>
      <span class="text-sm font-semibold text-brand-green-900">{{ titulo }}</span>
      <button
        type="button"
        class="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 cursor-pointer"
        aria-label="Mes siguiente"
        @click="mover(1)"
      >
        <i class="icon-[material-symbols--chevron-right] text-base"></i>
      </button>
    </div>

    <div class="grid grid-cols-7 gap-0.5">
      <span
        v-for="(d, i) in DIAS"
        :key="`h-${i}`"
        class="flex h-7 items-center justify-center text-[11px] font-semibold text-stone-400"
      >
        {{ d }}
      </span>

      <template v-for="(celda, i) in celdas" :key="i">
        <span v-if="!celda"></span>
        <button
          v-else
          type="button"
          :disabled="esPasado(celda)"
          class="flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:text-stone-300 cursor-pointer"
          :class="
            esSeleccionado(celda)
              ? 'bg-brand-green-500 text-white'
              : esDelRango(celda)
                ? 'bg-brand-green-50 text-brand-green-700 hover:bg-brand-green-100'
                : esHoy(celda)
                  ? 'text-brand-green-600 ring-1 ring-brand-green-200 hover:bg-brand-green-50'
                  : 'text-stone-700 hover:bg-stone-100'
          "
          @click="elegir(celda)"
        >
          {{ celda.date() }}
        </button>
      </template>
    </div>
  </div>
</template>
