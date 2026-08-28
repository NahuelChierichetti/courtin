<script setup>
// Collage del hero: la grilla de turnos como pantalla principal, la de reportes
// asomando abajo a la izquierda y dos avisos flotando.
//
// Son varias pantallas superpuestas y no una sola centrada porque la idea que
// tiene que quedar en tres segundos es "esto es un sistema con varias
// pantallas", no "esto es una captura".
import FeatureScreen from './FeatureScreen.vue'
</script>

<template>
  <div class="relative">
    <!-- Halo detrás, para despegar el collage del fondo arena -->
    <div
      class="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-brand-purple-100/50 blur-3xl"
    ></div>

    <!-- Pantalla de fondo: la grilla de horarios. -->
    <div class="relative z-0">
      <FeatureScreen variant="grilla" class="rotate-[0.6deg]" />
    </div>

    <!-- Pantalla de adelante: los reportes, montados sobre la grilla. Va
         arriba y no detrás porque es la que trae el gráfico, que es lo que se
         reconoce de lejos; la grilla se lee igual con la esquina tapada.
         Se corre hacia abajo a la izquierda para no comerle las columnas de
         canchas, y queda dentro del ancho de su columna: sacándola más a la
         izquierda se montaba sobre el título. -->
    <div class="absolute -bottom-28 left-0 z-10 hidden w-56 -rotate-6 xl:block">
      <FeatureScreen variant="reportes" />
    </div>

    <!-- Aviso de turno cargado -->
    <div
      class="animate-flotar absolute -top-5 -right-3 z-20 flex items-center gap-2 rounded-full border border-black/[0.06] bg-white py-2 pr-4 pl-2.5 shadow-lg sm:-right-6"
    >
      <span
        class="flex h-6 w-6 items-center justify-center rounded-full bg-brand-lime-500 text-brand-green-900"
      >
        <i class="icon-[material-symbols--check] text-sm"></i>
      </span>
      <span class="text-xs font-medium whitespace-nowrap text-brand-green-900">Turno confirmado</span>
    </div>

    <!-- Aviso de seña cobrada -->
    <div
      class="animate-flotar-lento absolute -right-2 -bottom-10 z-20 flex items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-lg sm:right-8"
    >
      <span
        class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-purple-100 text-brand-purple-600"
      >
        <i class="icon-[material-symbols--payments-outline] text-base"></i>
      </span>
      <div>
        <p class="text-[10px] text-stone-500">Seña acreditada</p>
        <p class="font-secondary text-sm font-medium text-brand-green-900">$ 11.000</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Dos flotaciones con distinta duración para que no vayan en bloque. */
@keyframes flotar {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

.animate-flotar {
  animation: flotar 4s ease-in-out infinite;
}

.animate-flotar-lento {
  animation: flotar 5.5s ease-in-out infinite;
  animation-delay: -1.5s;
}

@media (prefers-reduced-motion: reduce) {
  .animate-flotar,
  .animate-flotar-lento {
    animation: none;
  }
}
</style>
