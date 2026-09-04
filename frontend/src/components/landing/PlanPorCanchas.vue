<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { formatCurrency } from '@/utils/datetime'

// Precios de /complejos.
//
// Los números espejan `backend/src/config/plans.js`. Lo que cambia frente a la
// versión anterior es la forma de mostrarlos: no hay tres torres para comparar
// sino UNA pregunta, que es la única que define el precio: cuántas canchas
// tenés. Las torres invitan a elegir, y acá
// no hay nada que elegir; el que tiene dos canchas no puede contratar Pro
// aunque quiera. Preguntar primero y mostrar un solo precio después es lo que
// pasa de verdad.
//
// ⚠️ Sincronizar con backend/src/config/plans.js al cambiar precios.
//
// El ciclo anual es un 20% parejo sobre el mensual (anual = mensual × 12 × 0,8).
const PLANES = [
  {
    key: 'start',
    label: 'Start',
    rango: '1 a 3 canchas',
    canchas: 'Hasta 3 canchas',
    mensual: 40000,
    anualPorMes: 32000,
    anualTotal: 384000,
  },
  {
    key: 'pro',
    label: 'Pro',
    rango: '4 a 6 canchas',
    canchas: 'De 4 a 6 canchas',
    mensual: 60000,
    anualPorMes: 48000,
    anualTotal: 576000,
  },
  {
    key: 'elite',
    label: 'Elite',
    rango: '7 o más',
    canchas: '7 canchas o más',
    mensual: 80000,
    anualPorMes: 64000,
    anualTotal: 768000,
  },
]

// Idéntico en los tres planes. Que la lista no cambie al mover el selector es
// justamente el argumento: no hay funciones bloqueadas por precio.
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

const elegido = ref(0)
const anual = ref(false)

const plan = computed(() => PLANES[elegido.value])
const precio = computed(() => (anual.value ? plan.value.anualPorMes : plan.value.mensual))
const ahorro = computed(() => plan.value.mensual * 12 - plan.value.anualTotal)
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-12">
    <!-- La única pregunta que define el precio -->
    <div class="lg:col-start-1 lg:row-start-1">
      <p class="text-sm font-medium text-brand-green-900">¿Cuántas canchas tenés?</p>
      <div class="mt-3 inline-flex flex-wrap gap-1 rounded-full border border-black/[0.07] bg-white p-1">
        <button
          v-for="(p, i) in PLANES"
          :key="p.key"
          type="button"
          :aria-pressed="elegido === i"
          :class="[
            'cursor-pointer rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors duration-200',
            elegido === i
              ? 'bg-brand-green-500 font-medium text-white'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-brand-green-900',
          ]"
          @click="elegido = i"
        >
          {{ p.rango }}
        </button>
      </div>
    </div>

    <!-- El precio de lo que eligió.
         En el DOM va segundo, pegado al selector, y no al final: en celular
         las tres partes se apilan en este orden y el número tiene que aparecer
         apenas se elige, no después de leer las ocho funciones incluidas. En
         escritorio la grilla lo manda a la derecha y lo estira las dos filas. -->
    <div
      class="rounded-2xl border border-black/[0.08] bg-white p-7 shadow-xl shadow-brand-green-900/5 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start"
    >
      <div class="flex items-center justify-between gap-3">
        <p class="text-lg font-medium text-brand-green-900">{{ plan.label }}</p>
        <div class="inline-flex rounded-full bg-neutral-100 p-0.5 text-xs">
          <button
            type="button"
            :aria-pressed="!anual"
            :class="[
              'cursor-pointer rounded-full px-3 py-1.5 transition-colors',
              !anual ? 'bg-white font-medium text-brand-green-900 shadow-sm' : 'text-neutral-500',
            ]"
            @click="anual = false"
          >
            Mensual
          </button>
          <button
            type="button"
            :aria-pressed="anual"
            :class="[
              'cursor-pointer rounded-full px-3 py-1.5 transition-colors',
              anual ? 'bg-white font-medium text-brand-green-900 shadow-sm' : 'text-neutral-500',
            ]"
            @click="anual = true"
          >
            Anual
          </button>
        </div>
      </div>

      <p class="mt-1 text-sm text-neutral-500">{{ plan.canchas }}</p>

      <!-- El número no cambia de golpe: el anterior sale y el nuevo entra. Es
           lo que hace ver que se reemplazó un precio por otro, y no que la
           pantalla se redibujó. La `key` es el valor, así que Vue rehace el
           nodo cada vez que el número cambia de verdad. -->
      <div class="mt-6 flex items-baseline gap-1.5">
        <Transition name="precio" mode="out-in">
          <span
            :key="precio"
            class="text-5xl font-semibold tracking-tight tabular-nums text-brand-green-900"
          >
            {{ formatCurrency(precio) }}
          </span>
        </Transition>
        <span class="text-base text-neutral-500">/ mes</span>
      </div>

      <!-- Alto fijo para que el precio no salte al cambiar de ciclo. -->
      <p class="mt-2 flex min-h-[2.5rem] items-start text-sm leading-relaxed text-neutral-500">
        <template v-if="anual">
          {{ formatCurrency(plan.anualTotal) }} por año en un pago.
          Te ahorrás {{ formatCurrency(ahorro) }}.
        </template>
        <template v-else>
          Mes a mes. El plan anual sale un 20% menos.
        </template>
      </p>

      <RouterLink
        to="/panel/registro"
        class="mt-5 block rounded-full bg-brand-lime-500 py-3.5 text-center text-base font-medium text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
      >
        Probar gratis 1 mes
      </RouterLink>

      <ul class="mt-6 space-y-2.5 border-t border-black/[0.07] pt-5 text-sm text-neutral-600">
        <li class="flex items-start gap-2.5">
          <i class="icon-[material-symbols--check-circle-outline] mt-px shrink-0 text-base text-brand-green-500"></i>
          El primer mes no se cobra y no te pedimos la tarjeta.
        </li>
        <li class="flex items-start gap-2.5">
          <i class="icon-[material-symbols--check-circle-outline] mt-px shrink-0 text-base text-brand-green-500"></i>
          CourtIn no cobra comisión por tus reservas.
        </li>
        <li class="flex items-start gap-2.5">
          <i class="icon-[material-symbols--check-circle-outline] mt-px shrink-0 text-base text-brand-green-500"></i>
          Sin permanencia. Lo dejás cuando quieras.
        </li>
      </ul>
    </div>

    <!-- Lo que incluye. La lista es idéntica en los tres planes a propósito:
         que no cambie al mover el selector es el argumento de la sección. -->
    <div class="border-t border-black/[0.07] pt-8 lg:col-start-1 lg:row-start-2 lg:border-t-0 lg:pt-0">
      <p class="text-base font-medium text-brand-green-900">
        Los tres planes traen exactamente lo mismo
      </p>
      <p class="mt-1.5 text-[15px] leading-relaxed text-neutral-600">
        No hay funciones reservadas para el plan de arriba. Lo único que cambia con el precio es
        cuántas canchas podés cargar.
      </p>

      <ul class="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        <li v-for="f in INCLUIDO" :key="f" class="flex items-start gap-2.5 text-[15px] text-neutral-700">
          <i class="icon-[material-symbols--check] mt-0.5 shrink-0 text-base text-brand-green-500"></i>
          {{ f }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* 140ms de ida y de vuelta: es un cambio de dato, no una escena. Más largo y
   el precio se siente lento justo cuando la persona está comparando planes. */
.precio-enter-active,
.precio-leave-active {
  transition:
    opacity 140ms ease-out,
    transform 140ms ease-out;
}

.precio-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.precio-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .precio-enter-active,
  .precio-leave-active {
    transition: none;
  }
}
</style>
