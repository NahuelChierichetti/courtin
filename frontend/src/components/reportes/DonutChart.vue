<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  segments: { type: Array, default: () => [] }, // [{ label, value, color }]
  centerLabel: { type: String, default: '' },
  format: { type: Function, default: (v) => v },
  centerFormat: { type: Function, default: null },
})
const fmtCenter = (v) => (props.centerFormat ? props.centerFormat(v) : props.format(v))

const SIZE = 168
const C = SIZE / 2
const R_OUT = 74
const R_IN = 50
const GAP = 0.04 // separación angular entre segmentos

const total = computed(() => props.segments.reduce((a, s) => a + s.value, 0))

const polar = (r, ang) => [C + r * Math.cos(ang), C + r * Math.sin(ang)]
const segPath = (rOut, rIn, a0, a1) => {
  const large = a1 - a0 > Math.PI ? 1 : 0
  const [x0o, y0o] = polar(rOut, a0)
  const [x1o, y1o] = polar(rOut, a1)
  const [x1i, y1i] = polar(rIn, a1)
  const [x0i, y0i] = polar(rIn, a0)
  return `M ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rIn} ${rIn} 0 ${large} 0 ${x0i} ${y0i} Z`
}

const arcs = computed(() => {
  const t = total.value || 1
  const multi = props.segments.length > 1
  let ang = -Math.PI / 2
  return props.segments.map((s) => {
    const sweep = (s.value / t) * Math.PI * 2
    const a0 = ang + (multi ? GAP / 2 : 0)
    const a1 = ang + sweep - (multi ? GAP / 2 : 0)
    ang += sweep
    return { ...s, d: segPath(R_OUT, R_IN, a0, Math.max(a0 + 0.001, a1)), pct: Math.round((s.value / t) * 100) }
  })
})

const active = ref(-1)
const center = computed(() => {
  if (active.value >= 0 && props.segments[active.value]) {
    const s = props.segments[active.value]
    return { value: s.value, label: s.label }
  }
  return { value: total.value, label: props.centerLabel }
})
</script>

<template>
  <div class="flex flex-col items-center gap-5 sm:flex-row sm:gap-7">
    <div class="relative shrink-0" :style="{ width: SIZE + 'px', height: SIZE + 'px' }">
      <svg :width="SIZE" :height="SIZE" :viewBox="`0 0 ${SIZE} ${SIZE}`">
        <path
          v-for="(a, i) in arcs"
          :key="i"
          :d="a.d"
          :fill="a.color"
          class="transition-opacity duration-150"
          :style="{ opacity: active === -1 || active === i ? 1 : 0.35 }"
          @mouseenter="active = i"
          @mouseleave="active = -1"
        />
      </svg>
      <div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p class="text-xl font-bold font-secondary text-primitive-dark-500">{{ fmtCenter(center.value) }}</p>
        <p class="text-xs text-neutral-400">{{ center.label }}</p>
      </div>
    </div>

    <!-- Leyenda (etiquetas directas) -->
    <div class="w-full space-y-2.5">
      <div
        v-for="(a, i) in arcs"
        :key="'l' + i"
        class="flex items-center gap-2.5"
        @mouseenter="active = i"
        @mouseleave="active = -1"
      >
        <span class="h-3 w-3 shrink-0 rounded-[4px]" :style="{ background: a.color }"></span>
        <span class="flex-1 text-sm text-slate-600">{{ a.label }}</span>
        <span class="text-sm font-semibold font-secondary text-slate-700">{{ format(a.value) }}</span>
        <span class="w-10 text-right text-xs text-neutral-400">{{ a.pct }}%</span>
      </div>
    </div>
  </div>
</template>
