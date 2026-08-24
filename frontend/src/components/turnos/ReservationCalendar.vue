<template>
  <div class="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
    <div ref="scrollEl" class="max-h-[calc(100dvh-19rem)] overflow-auto lg:max-h-[calc(100vh-13rem)]">
      <div class="min-w-max">
        <!-- Header row -->
        <div
          data-cal-header
          class="sticky top-0 z-20 flex border-b border-black/[0.06] bg-white"
        >
          <!-- z-30: la esquina tiene que tapar tanto a la fila de canchas como
               a la columna de horas cuando el scroll va en las dos direcciones. -->
          <div class="sticky left-0 z-30 w-12 shrink-0 border-r border-black/[0.06] bg-white px-2 py-3 text-center sm:w-16">
            <span class="text-[10px] font-semibold tracking-wider text-stone-400 uppercase">Hora</span>
          </div>
          <div
            v-for="col in columns"
            :key="col.key"
            class="flex-1 border-r border-black/[0.06] px-3 py-3 last:border-r-0 sm:px-4"
            :style="{ minWidth: colMinWidth }"
          >
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :class="sportMeta(col.tipo).bgStrong" v-if="col.tipo" />
              <span class="text-sm font-semibold text-ink-500">{{ col.label }}</span>
            </div>
            <p v-if="col.sublabel" class="mt-0.5 truncate text-xs text-stone-400">{{ col.sublabel }}</p>
          </div>
        </div>

        <!-- Body (pt para que no se corte la primera etiqueta de hora) -->
        <div class="flex">
          <!-- Time gutter (queda fija al scrollear las canchas en horizontal) -->
          <!-- z-20: por encima de las tarjetas de las columnas, que vienen
               después en el DOM y si no le pasarían por arriba al scrollear. -->
          <div class="sticky left-0 z-20 w-12 shrink-0 border-r border-black/[0.06] bg-white sm:w-16">
            <div
              v-for="h in hourMarks"
              :key="h.min"
              class="relative border-b border-black/[0.06] flex items-center justify-center"
              :style="{ height: hourHeight + 'px' }"
            >
              <span class="-top-2 right-2 text-[11px] font-medium text-stone-400 font-secondary sm:text-xs">
                {{ h.label }}
              </span>
            </div>
          </div>

          <!-- Columns -->
          <div
            v-for="(col, colIndex) in columns"
            :key="col.key"
            :ref="(el) => setColRef(el, colIndex)"
            class="relative flex-1 border-r border-black/[0.06] last:border-r-0"
            :style="{ minWidth: colMinWidth, height: bodyHeight + 'px' }"
            @dblclick="onColumnDblClick($event, col)"
          >
            <!-- Bandas de horario cerrado -->
            <div
              v-for="(band, bi) in closedBands(col.key)"
              :key="'cb' + bi"
              class="pointer-events-none absolute inset-x-0 bg-stone-100/80 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(148,163,184,0.08)_6px,rgba(148,163,184,0.08)_12px)]"
              :style="{ top: band.top + 'px', height: band.height + 'px' }"
            />

            <!-- Hour grid lines -->
            <div
              v-for="h in hourMarks"
              :key="h.min"
              class="pointer-events-none absolute inset-x-0 border-b border-black/[0.06]"
              :style="{ top: yFor(h.min) + 'px' }"
            />

            <!-- Now line -->
            <div
              v-if="showNowLine(col)"
              class="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              :style="{ top: yFor(nowMin) + 'px' }"
            >
              <span class="-ml-1 h-2 w-2 rounded-full bg-brand-green-500" />
              <span class="h-px flex-1 bg-brand-green-500" />
            </div>

            <!-- Reservations -->
            <div
              v-for="r in columnReservations(col.key)"
              :key="r._id"
              class="absolute select-none overflow-hidden rounded-lg border-l-[3px] px-2 py-1 transition-shadow sm:px-2.5 sm:py-1.5"
              :class="[
                cardClasses(r),
                draggable(r)
                  ? (draggingId === r._id ? 'z-30 cursor-grabbing shadow-lg ring-2 ring-offset-1' : 'cursor-grab hover:shadow-md')
                  : 'cursor-default',
                draggingId === r._id ? sportMeta(r.tipo).ring : '',
                isFocused(r) ? 'z-20 shadow-lg ring-2 ring-brand-lime-500 ring-offset-2' : '',
              ]"
              :style="cardStyle(r)"
              @pointerdown="onPointerDown($event, r, colIndex)"
              @click.stop="onCardClick(r)"
              @dblclick.stop="emit('edit', r)"
            >
              <div class="flex items-start justify-between gap-1">
                <p class="truncate text-[11px] font-medium font-secondary leading-tight" :class="textColor(r, 'time')">
                  {{ rangeLabel(r) }}
                </p>
                <span
                  class="shrink-0 rounded-full px-1.5 py-px text-[9px] font-bold uppercase leading-tight"
                  :class="badgeClasses(r)"
                >{{ badgeLabel(r) }}</span>
              </div>
              <p class="flex items-center gap-1 truncate text-[13px] font-semibold leading-tight" :class="textColor(r, 'name')">
                <!-- Turno fijo: el complejo tiene que poder distinguirlo de un
                     turno suelto de un vistazo, sin abrirlo. -->
                <i
                  v-if="r.esFijo"
                  class="icon-[material-symbols--push-pin] shrink-0 text-[10px] opacity-70"
                  title="Turno fijo"
                ></i>
                <span class="truncate">{{ reservationLabel(r) }}</span>
              </p>
              <p v-if="r.precioFinal != null" class="mt-0.5 truncate text-[11px]" :class="textColor(r, 'price')">
                {{ formatCurrency(r.precioFinal, currency) }}
                <span v-if="isInProgress(r)" class="ml-1 font-medium text-brand-green-500">· En curso</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { sportMeta, minutesToTime, reservationLabel } from '@/utils/turnos'
import { formatCurrency } from '@/utils/datetime'

const props = defineProps({
  // 'day' = columnas por cancha; 'week' = columnas por día.
  mode: { type: String, default: 'day' },
  columns: { type: Array, default: () => [] },
  // Reservas enriquecidas: { _id, columnKey, startMin, endMin, tipo, estado, _fechaKey, ... }
  reservations: { type: Array, default: () => [] },
  dayStartMin: { type: Number, default: 0 },
  dayEndMin: { type: Number, default: 24 * 60 },
  // Minuto del día actual (en tz del club) y día de hoy "YYYY-MM-DD".
  nowMin: { type: Number, default: null },
  todayKey: { type: String, default: null },
  // Día mostrado en vista diaria (para ubicar la línea de hora actual).
  viewDateKey: { type: String, default: null },
  // Rango abierto por columna: { [colKey]: { startMin, endMin } | null }
  openRanges: { type: Object, default: () => ({}) },
  // Turno a resaltar y centrar al abrir (viene del dashboard por la URL).
  focusId: { type: String, default: null },
  currency: { type: String, default: 'ARS' },
})

const emit = defineEmits(['create', 'edit', 'move'])

const SLOT = 30 // minutos por slot
const hourHeight = 64
const slotHeight = hourHeight / 2

// En mobile las columnas se angostan para que entren ~2 canchas en pantalla sin
// quedar ilegibles; el resto se alcanza scrolleando en horizontal.
const NARROW_QUERY = '(max-width: 639px)'
const narrowMq = typeof window !== 'undefined' ? window.matchMedia(NARROW_QUERY) : null
const isNarrow = ref(narrowMq ? narrowMq.matches : false)
const onNarrowChange = (e) => (isNarrow.value = e.matches)
onMounted(() => narrowMq?.addEventListener('change', onNarrowChange))
onUnmounted(() => narrowMq?.removeEventListener('change', onNarrowChange))

const colMinWidth = computed(() => {
  if (props.mode === 'week') return isNarrow.value ? '96px' : '120px'
  return isNarrow.value ? '132px' : '160px'
})

const bodyHeight = computed(
  () => ((props.dayEndMin - props.dayStartMin) / 60) * hourHeight,
)

const hourMarks = computed(() => {
  const marks = []
  for (let m = props.dayStartMin; m < props.dayEndMin; m += 60) {
    marks.push({ min: m, label: minutesToTime(m) })
  }
  return marks
})

const yFor = (min) => ((min - props.dayStartMin) / 60) * hourHeight

// Bandas grises para las horas cerradas de cada columna.
const closedBands = (colKey) => {
  const range = props.openRanges[colKey]
  // Sin rango definido = cerrado todo el día.
  if (!range) {
    return [{ top: 0, height: bodyHeight.value }]
  }
  const bands = []
  if (range.startMin > props.dayStartMin) {
    bands.push({ top: 0, height: yFor(range.startMin) })
  }
  if (range.endMin < props.dayEndMin) {
    bands.push({ top: yFor(range.endMin), height: yFor(props.dayEndMin) - yFor(range.endMin) })
  }
  return bands
}

// --- Auto-scroll al abrir/cambiar de vista ---
// Por defecto centra el horario actual; si vienen apuntando a un turno concreto
// (`focusId`), ese gana: llegar de un click y tener que buscarlo en la grilla
// sería no haber llegado.
const scrollEl = ref(null)

const centerVertically = (min) => {
  const el = scrollEl.value
  if (!el) return
  const headerH = el.querySelector('[data-cal-header]')?.offsetHeight || 0
  el.scrollTop = Math.max(0, headerH + yFor(min) - el.clientHeight / 2)
}

const scrollToNow = () => {
  if (props.nowMin == null) return
  centerVertically(props.nowMin)
}

// Devuelve false si el turno todavía no está en la grilla (las reservas llegan
// después del primer render), para poder reintentar cuando aparezca.
const scrollToFocus = () => {
  const el = scrollEl.value
  if (!el || !props.focusId) return false
  const r = props.reservations.find((x) => x._id === props.focusId)
  if (!r) return false

  centerVertically((r.startMin + r.endMin) / 2)

  // En horizontal hay que traer la columna del turno: con varias canchas puede
  // estar fuera de pantalla.
  const colIndex = props.columns.findIndex((c) => c.key === r.columnKey)
  const colEl = colEls[colIndex]
  if (colEl) {
    const delta = colEl.getBoundingClientRect().left - el.getBoundingClientRect().left
    el.scrollLeft = Math.max(0, el.scrollLeft + delta - (el.clientWidth - colEl.offsetWidth) / 2)
  }
  return true
}

const scrollToTarget = () => {
  if (scrollToFocus()) return
  scrollToNow()
}

onMounted(() => nextTick(scrollToTarget))
watch(
  () => [props.mode, props.viewDateKey, props.columns[0]?.key],
  () => nextTick(scrollToTarget),
)
watch(
  () => [props.focusId, props.reservations.length],
  () => nextTick(scrollToFocus),
)

const isFocused = (r) => props.focusId != null && r._id === props.focusId

// --- Derivación de estado según la fecha/hora actual ---
// Una reserva pasada se muestra como "completada" y en gris; una en curso no
// puede arrastrarse.
const isPast = (r) => {
  const dk = r._fechaKey
  if (!dk || props.todayKey == null) return false
  if (dk < props.todayKey) return true
  if (dk === props.todayKey && props.nowMin != null) return r.endMin <= props.nowMin
  return false
}

const isInProgress = (r) => {
  if (r._fechaKey !== props.todayKey || props.nowMin == null) return false
  return r.startMin <= props.nowMin && props.nowMin < r.endMin
}

const displayStatus = (r) => {
  if (r.estado === 'cancelada') return 'cancelada'
  if (isPast(r)) return 'completada'
  return r.estado || 'confirmada'
}

// Las canceladas son inertes en la UI. El resto puede arrastrarse; si la regla
// no lo permite (p. ej. turno en curso), el backend lo rechaza y se revierte.
const draggable = (r) => r.estado !== 'cancelada'

const BADGE = {
  pendiente: { label: 'Pendiente', cls: 'bg-warning-100 text-warning-700' },
  confirmada: { label: 'Confirmada', cls: 'bg-success-100 text-success-700' },
  completada: { label: 'Completada', cls: 'bg-stone-200 text-stone-600' },
  cancelada: { label: 'Cancelada', cls: 'bg-stone-200 text-stone-500' },
}
const badgeLabel = (r) => BADGE[displayStatus(r)].label
const badgeClasses = (r) => BADGE[displayStatus(r)].cls

const textColor = (r, part) => {
  const st = displayStatus(r)
  if (st === 'cancelada') return part === 'name' ? 'text-stone-400 line-through' : 'text-stone-400'
  if (st === 'completada') return 'text-stone-500'
  if (part === 'time') return sportMeta(r.tipo).textSoft
  if (part === 'name') return 'text-ink-500'
  return 'text-stone-500'
}

// --- Refs de columnas (para drag entre columnas) ---
const colEls = []
const setColRef = (el, index) => {
  if (el) colEls[index] = el
}

// --- Estado de arrastre ---
const draggingId = ref(null)
const dragPreview = ref(null) // { startMin, colKey }
let dragCtx = null

const effective = (r) => {
  if (draggingId.value === r._id && dragPreview.value) {
    const dur = r.endMin - r.startMin
    return {
      startMin: dragPreview.value.startMin,
      endMin: dragPreview.value.startMin + dur,
      colKey: dragPreview.value.colKey,
    }
  }
  return { startMin: r.startMin, endMin: r.endMin, colKey: r.columnKey }
}

const columnReservations = (colKey) =>
  props.reservations.filter((r) => effective(r).colKey === colKey)

// Layout en carriles para solapamientos dentro de una misma columna.
const laneInfo = (r) => {
  const colKey = effective(r).colKey
  const items = columnReservations(colKey)
    .map((x) => ({ x, ...effective(x) }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  const lanes = [] // fin de cada carril
  const placement = new Map()
  let maxLane = 0
  for (const it of items) {
    let lane = lanes.findIndex((end) => end <= it.startMin)
    if (lane === -1) {
      lane = lanes.length
      lanes.push(it.endMin)
    } else {
      lanes[lane] = it.endMin
    }
    placement.set(it.x._id, lane)
    maxLane = Math.max(maxLane, lane + 1)
  }
  // total de carriles = máximo simultáneo
  return { lane: placement.get(r._id) || 0, total: Math.max(maxLane, 1) }
}

const cardStyle = (r) => {
  const eff = effective(r)
  const top = yFor(eff.startMin)
  const height = ((eff.endMin - eff.startMin) / 60) * hourHeight
  const { lane, total } = laneInfo(r)
  const widthPct = 100 / total
  return {
    top: `${top}px`,
    height: `${Math.max(height - 2, 24)}px`,
    left: `calc(${lane * widthPct}% + 4px)`,
    width: `calc(${widthPct}% - 8px)`,
  }
}

const cardClasses = (r) => {
  const st = displayStatus(r)
  if (st === 'cancelada') return ['border-stone-300', 'bg-stone-50', 'opacity-70']
  if (st === 'completada') return ['border-stone-300', 'bg-stone-100']
  const meta = sportMeta(r.tipo)
  if (r.estado === 'pendiente') return [meta.border, meta.bg, 'border-dashed', 'border']
  return [meta.border, meta.bg]
}

const rangeLabel = (r) => {
  const eff = effective(r)
  return `${minutesToTime(eff.startMin)} – ${minutesToTime(eff.endMin)}`
}

const showNowLine = (col) => {
  if (props.nowMin == null) return false
  if (props.nowMin < props.dayStartMin || props.nowMin > props.dayEndMin) return false
  if (props.mode === 'week') return col.key === props.todayKey
  return props.viewDateKey === props.todayKey
}

// --- Drag con pointer events ---
const DRAG_THRESHOLD = 5

// Último tipo de puntero que tocó una tarjeta. Con mouse el gesto es arrastrar
// y se abre con doble click; con dedo/lápiz el gesto vertical es el scroll de la
// grilla, así que no se arrastra y un tap abre el turno.
let lastPointerType = 'mouse'

const onCardClick = (r) => {
  if (lastPointerType !== 'mouse') emit('edit', r)
}

const onPointerDown = (e, r, colIndex) => {
  lastPointerType = e.pointerType || 'mouse'
  if (lastPointerType !== 'mouse') return
  if (e.button !== 0) return
  if (!draggable(r)) return
  dragCtx = {
    r,
    startX: e.clientX,
    startY: e.clientY,
    origStartMin: r.startMin,
    origColKey: r.columnKey,
    started: false,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

const colKeyFromPoint = (clientX) => {
  for (let i = 0; i < colEls.length; i++) {
    const el = colEls[i]
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (clientX >= rect.left && clientX <= rect.right) {
      return props.columns[i]?.key ?? null
    }
  }
  return null
}

const onPointerMove = (e) => {
  if (!dragCtx) return
  const dx = e.clientX - dragCtx.startX
  const dy = e.clientY - dragCtx.startY
  if (!dragCtx.started) {
    if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return
    dragCtx.started = true
    draggingId.value = dragCtx.r._id
    document.body.style.userSelect = 'none'
  }
  // Delta vertical -> minutos (snap a 30')
  const deltaSlots = Math.round(dy / slotHeight)
  const dur = dragCtx.r.endMin - dragCtx.r.startMin
  let newStart = dragCtx.origStartMin + deltaSlots * SLOT
  newStart = Math.max(props.dayStartMin, Math.min(props.dayEndMin - dur, newStart))
  // Columna destino según X
  const targetCol = colKeyFromPoint(e.clientX) || dragCtx.origColKey
  dragPreview.value = { startMin: newStart, colKey: targetCol }
}

const onPointerUp = () => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  document.body.style.userSelect = ''
  if (dragCtx && dragCtx.started && dragPreview.value) {
    const { r, origStartMin, origColKey } = dragCtx
    const { startMin, colKey } = dragPreview.value
    if (startMin !== origStartMin || colKey !== origColKey) {
      emit('move', { reservation: r, columnKey: colKey, startMin })
    }
  }
  draggingId.value = null
  dragPreview.value = null
  dragCtx = null
}

// --- Crear con doble click en zona vacía ---
const onColumnDblClick = (e, col) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top
  let min = props.dayStartMin + Math.floor(y / slotHeight) * SLOT
  min = Math.max(props.dayStartMin, Math.min(props.dayEndMin - SLOT, min))
  emit('create', { columnKey: col.key, startMin: min })
}
</script>
