<script setup>
// Simulador de cobro: armá tu política de pago y mirá cuánto entra por
// adelantado.
//
// Reproduce las tres decisiones que el complejo toma de verdad en su
// configuración (ver docs/pagos.md y el modelo `Club`):
//   1. si cobra el turno completo o sólo una seña;
//   2. si la seña es un porcentaje o un monto fijo (`modo: 'porcentaje' | 'fijo'`);
//   3. cuánto.
//
// La versión anterior sólo tenía el porcentaje y por eso se leía como un juguete:
// mostraba una función más chica que la real.
import { computed, ref } from 'vue'
import { formatCurrency } from '@/utils/datetime'

const PRECIO_TURNO = 22000

const PORCENTAJES = [25, 50, 75]
// Montos fijos redondos, del orden de lo que se usa como seña de un turno.
const MONTOS = [5000, 10000, 15000]

const cobro = ref('sena') // 'total' | 'sena'
const modo = ref('porcentaje') // 'porcentaje' | 'fijo'
const porcentaje = ref(50)
const montoFijo = ref(10000)

const ahora = computed(() => {
  if (cobro.value === 'total') return PRECIO_TURNO
  if (modo.value === 'fijo') return Math.min(montoFijo.value, PRECIO_TURNO)
  return Math.round((PRECIO_TURNO * porcentaje.value) / 100)
})

const alLlegar = computed(() => PRECIO_TURNO - ahora.value)

const proporcion = computed(() => Math.round((ahora.value / PRECIO_TURNO) * 100))

// Resumen de la política elegida, en una línea. Es lo que el complejo vería
// escrito en su configuración.
const resumen = computed(() => {
  if (cobro.value === 'total') return 'Turno completo'
  if (modo.value === 'fijo') return `Seña de ${formatCurrency(montoFijo.value)}`
  return `Seña del ${porcentaje.value}%`
})
</script>

<template>
  <div class="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-lg shadow-brand-green-900/5 sm:p-7">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-base font-medium text-ink-500">Armá tu forma de cobrar</p>
        <p class="mt-1 text-sm text-stone-500">
          Pádel 1 · 90 minutos · {{ formatCurrency(PRECIO_TURNO) }}
        </p>
      </div>
      <span
        class="shrink-0 rounded-full bg-brand-purple-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-brand-purple-700"
      >
        {{ resumen }}
      </span>
    </div>

    <!-- 1. Qué se cobra al reservar -->
    <p class="mt-6 text-xs font-medium tracking-wide text-stone-400 uppercase">
      Al reservar cobrás
    </p>
    <div class="mt-2 grid grid-cols-2 gap-2">
      <button
        v-for="o in [
          { v: 'sena', label: 'Una seña' },
          { v: 'total', label: 'El turno completo' },
        ]"
        :key="o.v"
        type="button"
        class="cursor-pointer rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors"
        :class="
          cobro === o.v
            ? 'border-brand-green-500 bg-brand-green-50 text-brand-green-700'
            : 'border-black/[0.08] text-stone-600 hover:bg-stone-50'
        "
        @click="cobro = o.v"
      >
        {{ o.label }}
      </button>
    </div>

    <!-- 2 y 3. Sólo tienen sentido si hay seña; con el turno completo no hay
         nada que configurar. -->
    <div
      class="grid transition-all duration-300 ease-out"
      :class="cobro === 'sena' ? 'mt-5 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
    >
      <div class="overflow-hidden">
        <p class="text-xs font-medium tracking-wide text-stone-400 uppercase">La seña es</p>
        <div class="mt-2 inline-flex rounded-full border border-black/[0.08] p-1">
          <button
            v-for="m in [
              { v: 'porcentaje', label: 'Un porcentaje' },
              { v: 'fijo', label: 'Un monto fijo' },
            ]"
            :key="m.v"
            type="button"
            class="cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
            :class="modo === m.v ? 'bg-brand-purple-500 text-white' : 'text-stone-600 hover:text-ink-500'"
            @click="modo = m.v"
          >
            {{ m.label }}
          </button>
        </div>

        <!-- Porcentaje -->
        <div v-if="modo === 'porcentaje'" class="mt-4">
          <input
            v-model.number="porcentaje"
            type="range"
            min="5"
            max="95"
            step="5"
            class="sena-range w-full cursor-pointer"
            aria-label="Porcentaje de seña"
          />
          <div class="mt-3 flex gap-2">
            <button
              v-for="p in PORCENTAJES"
              :key="p"
              type="button"
              class="cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
              :class="
                porcentaje === p
                  ? 'border-brand-green-500 bg-brand-green-500 text-white'
                  : 'border-black/[0.08] text-stone-600 hover:bg-stone-50'
              "
              @click="porcentaje = p"
            >
              {{ p }}%
            </button>
          </div>
        </div>

        <!-- Monto fijo -->
        <div v-else class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="m in MONTOS"
            :key="m"
            type="button"
            class="cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
            :class="
              montoFijo === m
                ? 'border-brand-green-500 bg-brand-green-500 text-white'
                : 'border-black/[0.08] text-stone-600 hover:bg-stone-50'
            "
            @click="montoFijo = m"
          >
            {{ formatCurrency(m) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Resultado -->
    <div class="mt-6 rounded-2xl bg-brand-sand-500 p-5">
      <!-- La barra hace visible la proporción sin tener que comparar dos
           números: se ve de un vistazo cuánto del turno ya está cobrado. -->
      <div class="flex h-2.5 overflow-hidden rounded-full bg-stone-200">
        <div
          class="bg-brand-green-500 transition-all duration-300 ease-out"
          :style="{ width: proporcion + '%' }"
        ></div>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p class="flex items-center gap-1.5 text-xs text-stone-500">
            <span class="h-1.5 w-1.5 rounded-full bg-brand-green-500"></span>
            Entra hoy a tu cuenta
          </p>
          <p class="font-secondary mt-1 text-2xl font-semibold text-brand-green-600">
            {{ formatCurrency(ahora) }}
          </p>
        </div>
        <div>
          <p class="flex items-center gap-1.5 text-xs text-stone-500">
            <span class="h-1.5 w-1.5 rounded-full bg-stone-300"></span>
            Cobrás al llegar
          </p>
          <p class="font-secondary mt-1 text-2xl font-semibold text-stone-400">
            {{ formatCurrency(alLlegar) }}
          </p>
        </div>
      </div>
    </div>

    <p class="mt-4 text-xs leading-relaxed text-stone-500">
      Lo configurás una vez y aplica a todas tus canchas.
    </p>
  </div>
</template>

<style scoped>
/* El `range` nativo no se puede estilar con clases, así que la pista y el
   pulgar van acá. Se pintan los dos motores (WebKit y Firefox) porque no
   comparten pseudo-elemento. */
.sena-range {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: var(--color-stone-200, #e7e5e4);
  outline: none;
}

.sena-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--color-brand-green-500);
  border: 3px solid #fff;
  box-shadow: 0 1px 6px rgb(0 0 0 / 0.2);
  cursor: pointer;
  transition: transform 150ms ease;
}

.sena-range::-webkit-slider-thumb:hover {
  transform: scale(1.12);
}

.sena-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--color-brand-green-500);
  border: 3px solid #fff;
  box-shadow: 0 1px 6px rgb(0 0 0 / 0.2);
  cursor: pointer;
}

.sena-range:focus-visible {
  outline: 2px solid var(--color-brand-green-400);
  outline-offset: 3px;
}
</style>
