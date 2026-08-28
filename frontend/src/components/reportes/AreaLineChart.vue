<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  points: { type: Array, default: () => [] }, // [{ label, value }]
  format: { type: Function, default: (v) => v },
  color: { type: String, default: '#347048' },
  height: { type: Number, default: 220 },
  labelStep: { type: Number, default: 1 },
})

const wrap = ref(null)
const width = ref(640)
let ro
onMounted(() => {
  if (!wrap.value) return
  width.value = wrap.value.clientWidth || 640
  ro = new ResizeObserver((entries) => {
    width.value = entries[0].contentRect.width
  })
  ro.observe(wrap.value)
})
onUnmounted(() => ro && ro.disconnect())

const pad = { t: 16, r: 16, b: 26, l: 48 }
const plotW = computed(() => Math.max(10, width.value - pad.l - pad.r))
const plotH = computed(() => props.height - pad.t - pad.b)
const n = computed(() => props.points.length)

const niceNum = (v) => {
  if (v <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / pow
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nf * pow
}
const maxV = computed(() => Math.max(1, ...props.points.map((p) => p.value)))
const niceMax = computed(() => niceNum(maxV.value))

const xAt = (i) => pad.l + (n.value <= 1 ? plotW.value / 2 : (i / (n.value - 1)) * plotW.value)
const yAt = (v) => pad.t + plotH.value * (1 - v / niceMax.value)

const coords = computed(() => props.points.map((p, i) => ({ x: xAt(i), y: yAt(p.value), ...p })))

// Suavizado Catmull-Rom → Bézier.
const linePath = computed(() => {
  const pts = coords.value
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }
  return d
})
const areaPath = computed(() => {
  const pts = coords.value
  if (pts.length < 2) return ''
  const baseY = pad.t + plotH.value
  return `${linePath.value} L ${pts[pts.length - 1].x},${baseY} L ${pts[0].x},${baseY} Z`
})

const gridLines = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((k) => ({ y: yAt(niceMax.value * k), v: niceMax.value * k })),
)
const compact = (v) => {
  if (v >= 1000000) return `${Math.round(v / 100000) / 10}M`
  if (v >= 1000) return `${Math.round(v / 1000)}k`
  return `${v}`
}

const maxIndex = computed(() => {
  let idx = 0
  props.points.forEach((p, i) => { if (p.value > props.points[idx].value) idx = i })
  return props.points.length ? idx : -1
})

// --- Hover ---
const active = ref(-1)
const onMove = (e) => {
  const rect = wrap.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const frac = Math.min(1, Math.max(0, (x - pad.l) / plotW.value))
  active.value = Math.round(frac * (n.value - 1))
}
const onLeave = () => { active.value = -1 }
const activePoint = computed(() => (active.value >= 0 ? coords.value[active.value] : null))
const tooltipStyle = computed(() => {
  if (!activePoint.value) return {}
  const left = Math.min(Math.max(activePoint.value.x, 60), width.value - 60)
  return { left: `${left}px`, top: `${Math.max(0, activePoint.value.y - 52)}px` }
})
</script>

<template>
  <div ref="wrap" class="relative w-full select-none" :style="{ height: height + 'px' }">
    <svg
      :width="width"
      :height="height"
      class="block overflow-visible"
      @mousemove="onMove"
      @mouseleave="onLeave"
    >
      <defs>
        <linearGradient :id="'areaGrad'" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.22" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- Grillas + eje Y -->
      <g>
        <line
          v-for="g in gridLines"
          :key="g.v"
          :x1="pad.l"
          :x2="width - pad.r"
          :y1="g.y"
          :y2="g.y"
          stroke="#16241b"
          stroke-opacity="0.08"
          stroke-width="1"
        />
        <text
          v-for="g in gridLines"
          :key="'t' + g.v"
          :x="pad.l - 8"
          :y="g.y + 3"
          text-anchor="end"
          class="fill-stone-400"
          style="font-size: 10px"
        >${{ compact(g.v) }}</text>
      </g>

      <!-- Área + línea -->
      <path :d="areaPath" :fill="'url(#areaGrad)'" />
      <path :d="linePath" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

      <!-- Punto máximo (etiqueta directa) -->
      <template v-if="maxIndex >= 0 && n > 1">
        <circle :cx="coords[maxIndex].x" :cy="coords[maxIndex].y" r="3.5" :fill="color" />
      </template>

      <!-- Hover: crosshair + marcador -->
      <template v-if="activePoint">
        <line :x1="activePoint.x" :x2="activePoint.x" :y1="pad.t" :y2="pad.t + plotH" stroke="#16241b" stroke-opacity="0.18" stroke-width="1" />
        <circle :cx="activePoint.x" :cy="activePoint.y" r="5" fill="white" :stroke="color" stroke-width="2.5" />
      </template>

      <!-- Etiquetas eje X -->
      <text
        v-for="(p, i) in coords"
        :key="'x' + i"
        :x="p.x"
        :y="height - 6"
        text-anchor="middle"
        class="fill-stone-400"
        style="font-size: 10px"
      >{{ i % labelStep === 0 ? p.label : '' }}</text>
    </svg>

    <!-- Tooltip -->
    <div
      v-if="activePoint"
      class="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-black/[0.06] bg-white px-2.5 py-1.5 text-center shadow-md"
      :style="tooltipStyle"
    >
      <p class="text-[10px] text-stone-400">{{ activePoint.label }}</p>
      <p class="text-xs font-bold font-secondary text-brand-green-900">{{ format(activePoint.value) }}</p>
    </div>
  </div>
</template>
