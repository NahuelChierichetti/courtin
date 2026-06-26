<template>
  <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <div ref="scrollEl" class="max-h-[calc(100vh-13rem)] overflow-auto">
      <div class="min-w-max">
        <!-- Header row -->
        <div
          data-cal-header
          class="sticky top-0 z-20 flex border-b border-slate-200 bg-white"
        >
          <div class="w-16 text-center shrink-0 border-r border-slate-200 px-2 py-3">
            <span class="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Hora</span>
          </div>
          <div
            v-for="col in columns"
            :key="col.key"
            class="flex-1 border-r border-slate-200 px-4 py-3 last:border-r-0"
            :style="{ minWidth: colMinWidth }"
          >
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 shrink-0 rounded-sm" :class="sportMeta(col.tipo).bgStrong" v-if="col.tipo" />
              <span class="text-sm font-semibold text-slate-900">{{ col.label }}</span>
            </div>
            <p v-if="col.sublabel" class="mt-0.5 truncate text-xs text-neutral-400">{{ col.sublabel }}</p>
          </div>
        </div>

        <!-- Body (pt para que no se corte la primera etiqueta de hora) -->
        <div class="flex">
          <!-- Time gutter -->
          <div class="w-16 shrink-0 border-r border-slate-200">
            <div
              v-for="h in hourMarks"
              :key="h.min"
              class="relative border-b border-slate-200 flex items-center justify-center"
              :style="{ height: hourHeight + 'px' }"
            >
              <span class="-top-2 right-2 text-xs font-medium text-neutral-400 font-secondary">
                {{ h.label }}
              </span>
            </div>
          </div>

          <!-- Columns -->
          <div
            v-for="(col, colIndex) in columns"
            :key="col.key"
            :ref="(el) => setColRef(el, colIndex)"
            class="relative flex-1 border-r border-slate-300 last:border-r-0"
            :style="{ minWidth: colMinWidth, height: bodyHeight + 'px' }"
            @dblclick="onColumnDblClick($event, col)"
          >
            <!-- Bandas de horario cerrado -->
            <div
              v-for="(band, bi) in closedBands(col.key)"
              :key="'cb' + bi"
              class="pointer-events-none absolute inset-x-0 bg-slate-100/80 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(148,163,184,0.08)_6px,rgba(148,163,184,0.08)_12px)]"
              :style="{ top: band.top + 'px', height: band.height + 'px' }"
            />

            <!-- Hour grid lines -->
            <div
              v-for="h in hourMarks"
              :key="h.min"
              class="pointer-events-none absolute inset-x-0 border-b border-slate-200"
              :style="{ top: yFor(h.min) + 'px' }"
            />

            <!-- Now line -->
            <div
              v-if="showNowLine(col)"
              class="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              :style="{ top: yFor(nowMin) + 'px' }"
            >
              <span class="-ml-1 h-2 w-2 rounded-full bg-primitive-orange-500" />
              <span class="h-px flex-1 bg-primitive-orange-500" />
            </div>

            <!-- Reservations -->
            <div
              v-for="r in columnReservations(col.key)"
              :key="r._id"
              class="absolute select-none overflow-hidden rounded-lg border-l-[3px] px-2.5 py-1.5 transition-shadow"
              :class="[
                cardClasses(r),
                draggable(r)
                  ? (draggingId === r._id ? 'z-30 cursor-grabbing shadow-lg ring-2 ring-offset-1' : 'cursor-grab hover:shadow-md')
                  : 'cursor-default',
                draggingId === r._id ? sportMeta(r.tipo).ring : '',
              ]"
              :style="cardStyle(r)"
              @pointerdown="onPointerDown($event, r, colIndex)"
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
              <p class="truncate text-[13px] font-semibold leading-tight" :class="textColor(r, 'name')">
                {{ reservationLabel(r) }}
              </p>
              <p v-if="r.precioFinal != null" class="mt-0.5 truncate text-[11px]" :class="textColor(r, 'price')">
                {{ formatCurrency(r.precioFinal, currency) }}
                <span v-if="isInProgress(r)" class="ml-1 font-medium text-primitive-orange-500">· En curso</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
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
  currency: { type: String, default: 'ARS' },
})

const emit = defineEmits(['create', 'edit', 'move'])

const SLOT = 30 // minutos por slot
const hourHeight = 64
const slotHeight = hourHeight / 2

const colMinWidth = computed(() => (props.mode === 'week' ? '120px' : '160px'))

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

// --- Auto-scroll al horario actual al abrir/cambiar de vista ---
const scrollEl = ref(null)

const scrollToNow = () => {
  if (!scrollEl.value || props.nowMin == null) return
  const headerH = scrollEl.value.querySelector('[data-cal-header]')?.offsetHeight || 0
  const target = headerH + yFor(props.nowMin) - scrollEl.value.clientHeight / 2
  scrollEl.value.scrollTop = Math.max(0, target)
}

onMounted(() => nextTick(scrollToNow))
watch(
  () => [props.mode, props.viewDateKey, props.columns[0]?.key],
  () => nextTick(scrollToNow),
)

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
  completada: { label: 'Completada', cls: 'bg-slate-200 text-slate-600' },
  cancelada: { label: 'Cancelada', cls: 'bg-slate-200 text-slate-500' },
}
const badgeLabel = (r) => BADGE[displayStatus(r)].label
const badgeClasses = (r) => BADGE[displayStatus(r)].cls

const textColor = (r, part) => {
  const st = displayStatus(r)
  if (st === 'cancelada') return part === 'name' ? 'text-neutral-400 line-through' : 'text-neutral-400'
  if (st === 'completada') return 'text-slate-500'
  if (part === 'time') return sportMeta(r.tipo).textSoft
  if (part === 'name') return 'text-slate-900'
  return 'text-slate-500'
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
  if (st === 'cancelada') return ['border-slate-300', 'bg-slate-50', 'opacity-70']
  if (st === 'completada') return ['border-slate-300', 'bg-slate-100']
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

const onPointerDown = (e, r, colIndex) => {
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
