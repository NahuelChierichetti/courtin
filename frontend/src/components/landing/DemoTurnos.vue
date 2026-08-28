<script setup>
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import ReservationCalendar from '@/components/turnos/ReservationCalendar.vue'
import {
  DAY_END_MIN,
  DAY_START_MIN,
  DEMO_DATE_KEY,
  DEMO_NOW_MIN,
  GUTTER_WIDTH,
  SLOT_NUEVO,
  DURACIONES,
} from '@/composables/useDemoPanel'
import { formatCurrency } from '@/utils/datetime'
import { minutesToTime } from '@/utils/turnos'

const {
  columns,
  reservations,
  openRanges,
  hotspot,
  draft,
  duracionesPosibles,
  courts,
  openDraft,
  cancelDraft,
  confirmDraft,
  moveReservation,
} = inject('demoPanel')

// El overlay del punto pulsante se dibuja sobre el calendario, así que necesita
// saber dónde termina su fila de encabezados. Se mide en vez de hardcodearse:
// el alto depende de la tipografía y del sublabel de cada cancha.
const wrap = ref(null)
const headerH = ref(53)

let ro
const measure = () => {
  const el = wrap.value?.querySelector('[data-cal-header]')
  if (el) headerH.value = el.offsetHeight
}

onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (wrap.value) ro.observe(wrap.value)
})
onBeforeUnmount(() => ro?.disconnect())

// Las columnas del calendario son `flex-1` en partes iguales después del canal
// de horas, así que su geometría se reproduce con un calc en vez de medirlas.
const colStyle = (h) => ({
  top: `${headerH.value + h.top}px`,
  height: `${h.height}px`,
  left: `calc(${GUTTER_WIDTH}px + (100% - ${GUTTER_WIDTH}px) * ${h.colIndex} / ${h.cols})`,
  width: `calc((100% - ${GUTTER_WIDTH}px) / ${h.cols})`,
})

const draftCourt = () => courts.value.find((c) => c._id === draft.value?.columnKey)

const draftPrecio = () => {
  const court = draftCourt()
  if (!court || !draft.value) return 0
  return Math.round((court.precio * draft.value.duracion) / 60)
}
</script>

<template>
  <div ref="wrap" class="relative">
    <ReservationCalendar
      mode="day"
      :columns="columns"
      :reservations="reservations"
      :day-start-min="DAY_START_MIN"
      :day-end-min="DAY_END_MIN"
      :open-ranges="openRanges"
      :now-min="DEMO_NOW_MIN"
      :today-key="DEMO_DATE_KEY"
      :view-date-key="DEMO_DATE_KEY"
      @create="openDraft"
      @move="moveReservation"
    />

    <!-- Punto pulsante del paso en curso.
         En "crear" es un botón: el hueco vacío se toca. En "mover" es sólo un
         resaltado inerte (`pointer-events-none`), porque debajo está la tarjeta
         que el visitante tiene que poder agarrar y arrastrar. -->
    <button
      v-if="hotspot && hotspot.clickable"
      type="button"
      class="absolute z-20 cursor-pointer rounded-lg border-2 border-dashed border-brand-lime-600 bg-brand-lime-100/70 p-1 transition-colors hover:bg-brand-lime-200/80"
      :style="colStyle(hotspot)"
      aria-label="Cargar un turno a las 20:30"
      @click="openDraft(SLOT_NUEVO)"
    >
      <span class="flex h-full w-full items-center justify-center gap-1.5 text-xs font-semibold text-brand-green-800">
        <span class="relative flex h-2.5 w-2.5">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green-500 opacity-75"></span>
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-green-600"></span>
        </span>
        Tocá acá
      </span>
    </button>

    <div
      v-else-if="hotspot"
      class="pointer-events-none absolute z-20 rounded-lg ring-2 ring-brand-lime-500 ring-offset-2"
      :style="colStyle(hotspot)"
    >
      <span
        class="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand-green-600 px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap text-white shadow"
      >
        <i class="icon-[material-symbols--drag-pan] text-xs"></i>
        Arrastrame
      </span>
    </div>

    <!-- Cajón de alta. Es la versión corta del cajón real del panel: alcanza
         para mostrar que cargar un turno son dos campos, sin arrastrar a la
         landing las dependencias del formulario completo. -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-4 opacity-0"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="translate-x-4 opacity-0"
    >
      <div
        v-if="draft"
        class="absolute right-3 top-3 z-30 w-72 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-xl"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-semibold text-brand-green-900">Nuevo turno</p>
            <p class="mt-0.5 text-xs text-stone-500">
              {{ draftCourt()?.nombre }} ·
              {{ minutesToTime(draft.startMin) }}–{{ minutesToTime(draft.startMin + draft.duracion) }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            aria-label="Cerrar"
            @click="cancelDraft"
          >
            <i class="icon-[material-symbols--close] text-base"></i>
          </button>
        </div>

        <label class="mt-4 block text-xs font-medium text-stone-500">Cliente</label>
        <input
          v-model="draft.nombre"
          type="text"
          class="mt-1 h-9 w-full rounded-lg border border-black/[0.08] px-3 text-sm text-brand-green-900 outline-none focus:ring-2 focus:ring-brand-green-200"
        />

        <p class="mt-3 text-xs font-medium text-stone-500">Duración</p>
        <div class="mt-1 flex gap-1.5">
          <!-- Las duraciones que pisarían el turno siguiente se muestran
               deshabilitadas y no se pueden elegir: el límite se ve antes de
               chocar con él, que es justo lo que hace la grilla del panel. -->
          <button
            v-for="d in DURACIONES"
            :key="d"
            type="button"
            :disabled="!duracionesPosibles[d]"
            :title="duracionesPosibles[d] ? null : 'No entra: se pisa con otro turno'"
            class="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed"
            :class="
              !duracionesPosibles[d]
                ? 'border border-black/[0.04] bg-stone-50 text-stone-300 line-through'
                : draft.duracion === d
                  ? 'cursor-pointer bg-brand-green-500 text-white'
                  : 'cursor-pointer border border-black/[0.08] text-stone-600 hover:bg-stone-50'
            "
            @click="draft.duracion = d"
          >
            {{ d }} min
          </button>
        </div>

        <div class="mt-4 flex items-center justify-between rounded-lg bg-brand-sand-500 px-3 py-2">
          <span class="text-xs text-stone-500">Total</span>
          <span class="font-secondary text-sm font-bold text-brand-green-900">{{ formatCurrency(draftPrecio()) }}</span>
        </div>

        <button
          type="button"
          class="mt-3 w-full cursor-pointer rounded-xl bg-brand-lime-500 py-2.5 text-sm font-bold text-brand-green-900 transition-colors hover:bg-brand-lime-600"
          @click="confirmDraft"
        >
          Confirmar turno
        </button>
      </div>
    </Transition>
  </div>
</template>
