<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { formatCurrency } from '@/utils/datetime'

// Espejo de `backend/src/config/plans.js`. Está duplicado a mano y no leído de
// la API a propósito: la landing tiene que renderizar sin backend (es la página
// que más se comparte y la que peor momento elige para fallar). Si los precios
// de allá cambian, hay que tocar acá — por eso el aviso.
//
// ⚠️ Sincronizar con backend/src/config/plans.js al cambiar precios.
//
// El ciclo anual es un 20% parejo sobre el mensual (anual = mensual × 12 × 0,8).
// Antes era un descuento fijo de $5.000/mes, que en porcentaje daba 12,5% en
// Start, 8,3% en Pro y 6,25% en Elite: el incentivo a pagar por adelantado se
// debilitaba justo con los clientes más grandes, que son los que más ayudan al
// flujo de caja. El 20% además es el número que usan Clubo y PlayWith, así que
// es lo que el dueño espera ver.
const PLANES = [
  {
    key: 'start',
    label: 'Start',
    canchas: 'Hasta 3 canchas',
    // para: 'Operación simple, una persona a cargo',
    mensual: 40000,
    anualPorMes: 32000,
    anualTotal: 384000,
  },
  {
    key: 'pro',
    label: 'Pro',
    canchas: 'De 4 a 6 canchas',
    // para: 'Varias canchas y equipo en el mostrador',
    mensual: 60000,
    anualPorMes: 48000,
    anualTotal: 576000,
  },
  {
    key: 'elite',
    label: 'Elite',
    canchas: '7 canchas o más',
    // para: 'Operación grande, sin límite de canchas',
    mensual: 80000,
    anualPorMes: 64000,
    anualTotal: 768000,
  },
]

// Todo esto está en los tres planes: la lista es idéntica a propósito, es el
// argumento de la sección.
const INCLUIDO = [
  'Grilla de turnos y reservas',
  'Tu link público de reservas',
  'Cobros con MercadoPago',
  'Control de caja',
  'Reportes y estadísticas',
  'Clientes',
  'Usuarios para tu equipo',
  'Emails automáticos',
]

const anual = ref(false)

const precio = computed(() => (p) => (anual.value ? p.anualPorMes : p.mensual))
</script>

<template>
  <div>
    <!-- Conmutador de ciclo -->
    <div class="flex">
      <div class="inline-flex rounded-full border border-black/[0.06] bg-white p-1">
        <button
          type="button"
          class="cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-colors"
          :class="!anual ? 'bg-brand-green-500 text-white' : 'text-stone-600 hover:text-brand-green-900'"
          @click="anual = false"
        >
          Mensual
        </button>
        <button
          type="button"
          class="flex cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors"
          :class="anual ? 'bg-brand-green-500 text-white' : 'text-stone-600 hover:text-brand-green-900'"
          @click="anual = true"
        >
          Anual
          <span
            class="rounded-full px-2 py-0.5 text-[10px] font-medium"
            :class="anual ? 'bg-brand-lime-500 text-brand-green-900' : 'bg-brand-lime-100 text-brand-green-700'"
          >20% menos</span>
        </button>
      </div>
    </div>

    <!-- Planes -->
    <!-- Ningún plan va destacado. El plan no se elige por gusto sino por
         cuántas canchas tenés: marcar uno como "el más elegido" empujaba a algo
         que quien tiene dos canchas no puede contratar aunque quiera. -->
    <p class="mt-8 flex items-center gap-2 text-sm text-stone-500">
      <i class="icon-[material-symbols--info-outline] text-base text-brand-purple-400"></i>
      Tu plan lo define la cantidad de canchas que tenés.
    </p>

    <div class="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div
        v-for="p in PLANES"
        :key="p.key"
        class="relative flex flex-col rounded-3xl border border-black/[0.06] bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-purple-200 hover:shadow-lg"
      >
        <p class="text-lg font-medium text-brand-purple-500">{{ p.label }}</p>
        <p class="mt-0.5 text-sm text-stone-500">{{ p.para }}</p>

        <div class="mt-5">
          <span class="font-secondary text-4xl font-semibold text-brand-green-900">
            {{ formatCurrency(precio(p)) }}
          </span>
          <span class="text-sm text-stone-500">/mes</span>
        </div>
        <p class="mt-1 h-4 text-xs text-stone-400">
          <template v-if="anual">{{ formatCurrency(p.anualTotal) }} por año, en un pago</template>
        </p>

        <div class="mt-5 flex items-center gap-2 rounded-xl bg-brand-sand-500 px-3.5 py-2.5">
          <i class="icon-[material-symbols--grid-view] text-base text-brand-green-500"></i>
          <span class="text-sm font-medium text-brand-green-900">{{ p.canchas }}</span>
        </div>

        <RouterLink
          to="/panel/registro"
          class="mt-5 block rounded-full bg-brand-lime-500 py-3 text-center text-sm font-medium text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
        >
          Probar gratis 1 mes
        </RouterLink>
      </div>
    </div>

    <!-- Lo que incluye. Una sola lista para los tres planes: es la forma de
         mostrar que no hay funciones bloqueadas sin tener que decirlo. -->
    <div class="mt-8 rounded-3xl border border-black/[0.06] bg-white p-7">
      <div>
        <span
          class="inline-flex items-center gap-2 rounded-full bg-brand-purple-100 px-3 py-1 text-xs font-medium text-brand-purple-700"
        >
          <i class="icon-[material-symbols--lock-open-right-outline] text-sm"></i>
          Sin funciones bloqueadas
        </span>
        <p class="mt-3 text-lg font-medium text-brand-green-900">
          Los tres planes traen todo. Lo único que cambia es cuántas canchas tenés.
        </p>
      </div>

      <ul class="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="f in INCLUIDO" :key="f" class="flex items-start gap-2 text-sm text-stone-600">
          <i class="icon-[material-symbols--check-circle] mt-0.5 shrink-0 text-base text-brand-purple-400"></i>
          {{ f }}
        </li>
      </ul>
    </div>

    <p class="mt-6 text-sm text-stone-500 font-medium">
      El primer mes es gratis y no te pedimos tarjeta.
      <span class="text-stone-400 font-normal">CourtIn no cobra comisión por tus reservas.</span>
    </p>
  </div>
</template>
