<script setup>
// La grilla de turnos que se va reservando sola, detrás del encabezado.
//
// El fondo demuestra el titular en vez de decorarlo: si arriba dice "tus
// clientes reservan solos", abajo se ven turnos entrando solos. Es la única
// animación en bucle de la página y se la banca porque significa algo; el
// resto entra una vez y se queda quieta.
//
// Sin fondo de color: sólo las líneas de la grilla y los bloques que se
// reservan. Cualquier relleno debajo convierte esto en un gráfico y deja de
// leerse como la grilla del producto.
//
// Las posiciones y los tiempos están escritos a mano y no salen de `Math.random`
// a propósito: con azar, cada visita compone distinto y algunas veces sale mal
// (tres bloques pegados, media grilla vacía). Escritos, el ritmo es siempre el
// que se eligió.
//
// Cada bloque tiene su propio ciclo desfasado, así que siempre hay algunos
// entrando y otros yéndose. Un llenado y vaciado sincronizado se lee mecánico.

const COL = 80
const FILA = 52

// { c: columna, f: fila, alto: en filas, t: retardo en segundos, lima: acento }
//
// El alto va en filas y no siempre es 1 porque los turnos tampoco duran todos
// lo mismo: hay canchas de 60 minutos y de 90. Que los bloques sean desparejos
// es lo que hace que se lea como una grilla de turnos y no como un damero.
//
// El centro de arriba queda casi vacío a propósito: ahí va el titular, y un
// bloque detrás de una palabra le come el contraste por más tenue que sea.
const TURNOS = [
  { c: 1, f: 1, alto: 2, t: 0.0 },
  { c: 12, f: 4, alto: 1, t: 0.4, lima: true },
  { c: 3, f: 6, alto: 2, t: 0.9 },
  { c: 14, f: 1, alto: 1, t: 1.3 },
  { c: 0, f: 4, alto: 2, t: 1.8, lima: true },
  { c: 11, f: 7, alto: 1, t: 2.2 },
  { c: 2, f: 0, alto: 1, t: 2.7 },
  { c: 13, f: 2, alto: 2, t: 3.1, lima: true },
  { c: 5, f: 7, alto: 1, t: 3.6 },
  { c: 1, f: 5, alto: 1, t: 4.0 },
  { c: 10, f: 5, alto: 2, t: 4.5, lima: true },
  { c: 3, f: 3, alto: 1, t: 4.9 },
  { c: 14, f: 6, alto: 2, t: 5.4 },
  { c: 9, f: 0, alto: 1, t: 5.8, lima: true },
  { c: 0, f: 7, alto: 1, t: 6.3 },
  { c: 12, f: 0, alto: 2, t: 6.7 },
  { c: 4, f: 4, alto: 1, t: 7.2, lima: true },
  { c: 6, f: 7, alto: 1, t: 7.6 },
  { c: 2, f: 2, alto: 1, t: 8.1 },
  { c: 13, f: 5, alto: 1, t: 8.5, lima: true },
  { c: 5, f: 0, alto: 1, t: 9.0 },
  { c: 10, f: 2, alto: 1, t: 9.4 },
  { c: 1, f: 7, alto: 1, t: 9.9, lima: true },
  { c: 14, f: 3, alto: 1, t: 10.3 },
]
</script>

<template>
  <div
    class="pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_80%_86%_at_50%_50%,black_38%,transparent_86%)]"
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 1200 416"
      preserveAspectRatio="xMidYMid slice"
      class="absolute inset-0 h-full w-full"
    >
      <defs>
        <!-- Las líneas van como patrón y no como 80 elementos sueltos: es la
             misma grilla y un nodo en vez de una lista. -->
        <pattern id="grillaTurnos" width="80" height="52" patternUnits="userSpaceOnUse">
          <path d="M80 0 V52 M0 52 H80" fill="none" stroke="#122419" stroke-opacity="0.07" stroke-width="1" />
        </pattern>
      </defs>

      <rect width="1200" height="416" fill="url(#grillaTurnos)" />

      <rect
        v-for="t in TURNOS"
        :key="`${t.c}-${t.f}`"
        class="turno"
        :x="t.c * COL + 4"
        :y="t.f * FILA + 4"
        :width="COL - 8"
        :height="t.alto * FILA - 8"
        rx="7"
        :fill="t.lima ? '#b9cf32' : '#347048'"
        :fill-opacity="t.lima ? 0.14 : 0.11"
        :style="{ animationDelay: `${t.t}s` }"
      />
    </svg>
  </div>
</template>

<style scoped>
/* Crece desde su propio centro y se apaga. Sin borde y sin salto: un bloque
   que aparece y desaparece, no uno que se anuncia. La entrada es más corta que
   la salida, que es como se percibe algo que llega de golpe y se va de a poco. */
@keyframes reservar {
  0% {
    opacity: 0;
    transform: scale(0.82);
  }

  6% {
    opacity: 1;
    transform: scale(1);
  }

  34% {
    opacity: 1;
    transform: scale(1);
  }

  48%,
  100% {
    opacity: 0;
    transform: scale(1.04);
  }
}

.turno {
  opacity: 0;
  /* Sin `fill-box` el origen del `scale` es el del SVG entero y el bloque se
     encoge hacia la esquina superior izquierda del lienzo, no hacia su centro. */
  transform-box: fill-box;
  transform-origin: center;
  animation: reservar 9s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

/* Puestos, no entrando. La grilla sigue contando lo mismo sin moverse. */
@media (prefers-reduced-motion: reduce) {
  .turno {
    animation: none;
    opacity: 1;
  }
}
</style>
