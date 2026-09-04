<script setup>
// Por dónde te llegan hoy las reservas, y dónde terminan.
//
// Es el bloque de integraciones de aikido.dev dado vuelta: ellos muestran que
// se enchufan a las herramientas que ya usás, y acá el argumento es el
// contrario, que todos esos canales dejan de ser cinco lugares distintos para
// pasar a ser uno. Por eso las líneas convergen en CourtIn en vez de salir de
// él, y por eso los pulsos viajan siempre hacia adentro.
//
// El pulso es un segundo trazo encima del primero con un `stroke-dasharray`
// muy desparejo: un guion corto contra un hueco larguísimo. Al animar el
// `stroke-dashoffset` ese guion recorre la línea entera y se lee como un dato
// que se está moviendo, sin tener que animar la posición de nada.
//
// Hay DOS armados, no uno responsive. El recorrido de izquierda a derecha
// necesita ancho: apretarlo en 400px deja las cajas pegadas y las líneas
// encimadas. En celular el mismo recorrido va de arriba hacia abajo, que es la
// dirección que sobra en un teléfono.

// Cada canal con su fila en la grilla del SVG de escritorio y el retardo de su
// pulso. El retardo se reusa en las dos versiones.
const CANALES = [
  { nombre: 'WhatsApp', icon: 'icon-[material-symbols--chat-outline]', y: 60, t: 0 },
  { nombre: 'Instagram', icon: 'icon-[material-symbols--photo-camera-outline]', y: 150, t: 0.9 },
  { nombre: 'Teléfono', icon: 'icon-[material-symbols--call-outline]', y: 240, t: 1.8 },
  { nombre: 'El mostrador', icon: 'icon-[material-symbols--storefront-outline]', y: 330, t: 2.7 },
  { nombre: 'Tu link público', icon: 'icon-[material-symbols--link]', y: 420, t: 3.6 },
]

const RESULTADOS = [
  { nombre: 'Turnos', icon: 'icon-[material-symbols--calendar-month-outline]', y: 105, t: 0.45 },
  { nombre: 'Cobros', icon: 'icon-[material-symbols--payments-outline]', y: 195, t: 1.35 },
  { nombre: 'Caja', icon: 'icon-[material-symbols--account-balance-wallet-outline]', y: 285, t: 2.25 },
  { nombre: 'Reportes', icon: 'icon-[material-symbols--bar-chart]', y: 375, t: 3.15 },
]

// Los caminos del armado vertical. Las tres ramas de arriba nacen sobre las
// columnas de la lista (izquierda, centro y derecha), se juntan en el travesaño
// de y=30 y bajan juntas al centro. Abajo pasa lo inverso: sale una y se abre
// en las dos columnas de resultados.
const ENTRADAS = [
  { d: 'M 44 0 V 30 H 160 V 76', t: 0 },
  { d: 'M 160 0 V 76', t: 0.7 },
  { d: 'M 276 0 V 30 H 160 V 76', t: 1.4 },
]

const SALIDAS = [
  { d: 'M 160 0 V 44 H 44 V 76', t: 0.35 },
  { d: 'M 160 0 V 44 H 276 V 76', t: 1.05 },
]

// Codo en L en vez de curva: se lee como un cable y no como una guirnalda.
const haciaCentro = (y) => `M 236 ${y} H 320 V 240 H 404`
const desdeCentro = (y) => `M 596 240 H 680 V ${y} H 764`
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl border border-black/[0.07] bg-white p-4 sm:p-8">
    <!-- ---------- Celular: de arriba hacia abajo ------------------------- -->
    <div class="sm:hidden">
      <ul class="grid grid-cols-2 gap-2">
        <li
          v-for="(c, i) in CANALES"
          :key="c.nombre"
          class="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(18,36,26,0.06)]"
          :class="i === CANALES.length - 1 ? 'col-span-2' : ''"
        >
          <i :class="c.icon" class="shrink-0 text-base text-neutral-500"></i>
          <span class="truncate text-[13px] font-medium text-brand-green-900">{{ c.nombre }}</span>
        </li>
      </ul>

      <!-- Los canales convergen: tres ramas que nacen sobre las columnas de la
           lista, se juntan en un travesaño y bajan como una sola al centro.
           `preserveAspectRatio="none"` estira el dibujo al ancho que haya, y
           `vector-effect` evita que al estirarse se deforme el grosor. -->
      <svg viewBox="0 0 320 76" preserveAspectRatio="none" class="block h-[76px] w-full" fill="none" aria-hidden="true">
        <path
          v-for="r in ENTRADAS"
          :key="`me-${r.d}`"
          :d="r.d"
          stroke="#122419"
          stroke-opacity="0.13"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        />
        <path
          v-for="r in ENTRADAS"
          :key="`mp-${r.d}`"
          class="pulso"
          :d="r.d"
          pathLength="1"
          stroke="#347048"
          stroke-width="3"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
          :style="{ animationDelay: `${r.t}s` }"
        />
      </svg>

      <div
        class="mx-auto flex w-40 flex-col items-center gap-2 rounded-2xl bg-brand-green-900 px-3 py-4 shadow-[0_18px_40px_-20px_rgba(18,36,26,0.55)] ring-1 ring-brand-green-800"
      >
        <img src="/images/logo-lime.svg" alt="" class="h-8 w-auto" />
        <span class="text-sm font-medium text-white">
          Court<span class="text-brand-lime-500">in</span>
        </span>
      </div>

      <!-- Y se abre: una sola línea que sale del centro y se reparte en las dos
           columnas de resultados. -->
      <svg viewBox="0 0 320 76" preserveAspectRatio="none" class="block h-[76px] w-full" fill="none" aria-hidden="true">
        <path
          v-for="r in SALIDAS"
          :key="`ms-${r.d}`"
          :d="r.d"
          stroke="#122419"
          stroke-opacity="0.13"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
        />
        <path
          v-for="r in SALIDAS"
          :key="`msp-${r.d}`"
          class="pulso"
          :d="r.d"
          pathLength="1"
          stroke="#9cb026"
          stroke-width="3"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
          :style="{ animationDelay: `${r.t}s` }"
        />
      </svg>

      <ul class="grid grid-cols-2 gap-2">
        <li
          v-for="r in RESULTADOS"
          :key="r.nombre"
          class="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(18,36,26,0.06)]"
        >
          <i :class="r.icon" class="shrink-0 text-base text-brand-green-600"></i>
          <span class="truncate text-[13px] font-medium text-brand-green-900">{{ r.nombre }}</span>
        </li>
      </ul>
    </div>

    <!-- ---------- Escritorio: de izquierda a derecha --------------------- -->
    <!-- Las etiquetas van en HTML y no dentro del SVG: así heredan la
         tipografía de la página y los íconos son los mismos del resto del
         sistema, en vez de trazos redibujados a mano. -->
    <div class="relative mx-auto hidden w-full max-w-[1000px] sm:block">
      <svg viewBox="0 0 1000 480" class="block w-full" fill="none" aria-hidden="true">
        <template v-for="c in CANALES" :key="`e-${c.nombre}`">
          <path :d="haciaCentro(c.y)" stroke="#122419" stroke-opacity="0.12" stroke-width="1.5" />
          <path
            class="pulso"
            :d="haciaCentro(c.y)"
            stroke="#347048"
            stroke-width="3"
            stroke-linecap="round"
            :style="{ animationDelay: `${c.t}s` }"
          />
        </template>

        <template v-for="r in RESULTADOS" :key="`s-${r.nombre}`">
          <path :d="desdeCentro(r.y)" stroke="#122419" stroke-opacity="0.12" stroke-width="1.5" />
          <path
            class="pulso"
            :d="desdeCentro(r.y)"
            stroke="#9cb026"
            stroke-width="3"
            stroke-linecap="round"
            :style="{ animationDelay: `${r.t}s` }"
          />
        </template>
      </svg>

      <div
        v-for="c in CANALES"
        :key="c.nombre"
        class="absolute flex -translate-y-1/2 items-center gap-2.5 rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(18,36,26,0.06)]"
        :style="{ top: `${(c.y / 480) * 100}%`, left: '0%', width: '23.6%' }"
      >
        <i :class="c.icon" class="shrink-0 text-lg text-neutral-500"></i>
        <span class="truncate text-sm font-medium text-brand-green-900">{{ c.nombre }}</span>
      </div>

      <div
        class="absolute top-1/2 left-[40.4%] flex w-[19.2%] -translate-y-1/2 flex-col items-center gap-2.5 rounded-2xl bg-brand-green-900 px-3 py-6 shadow-[0_20px_44px_-18px_rgba(18,36,26,0.55)] ring-1 ring-brand-green-800"
      >
        <img src="/images/logo-lime.svg" alt="" class="h-9 w-auto" />
        <span class="text-sm font-medium text-white">
          Court<span class="text-brand-lime-500">in</span>
        </span>
      </div>

      <div
        v-for="r in RESULTADOS"
        :key="r.nombre"
        class="absolute flex -translate-y-1/2 items-center gap-2.5 rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(18,36,26,0.06)]"
        :style="{ top: `${(r.y / 480) * 100}%`, right: '0%', width: '23.6%' }"
      >
        <i :class="r.icon" class="shrink-0 text-lg text-brand-green-600"></i>
        <span class="truncate text-sm font-medium text-brand-green-900">{{ r.nombre }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Un guion corto contra un hueco larguísimo: por la línea viaja un solo trazo.
   En el armado de escritorio los caminos miden distinto y el pulso tiene que
   conservar su largo, así que van en unidades del lienzo. En el vertical los
   caminos llevan `pathLength="1"`, que normaliza el largo de todos a 1, y ahí
   el dasharray se expresa como fracción. */
.pulso {
  stroke-dasharray: 26 1000;
  stroke-dashoffset: 1026;
  animation: pulso 4.5s linear infinite;
}

svg[preserveAspectRatio='none'] .pulso {
  stroke-dasharray: 0.16 1;
  stroke-dashoffset: 1.16;
}

@keyframes pulso {
  to {
    stroke-dashoffset: 0;
  }
}

/* Quietas. Las líneas siguen contando el recorrido sin que nada se mueva. */
@media (prefers-reduced-motion: reduce) {
  .pulso {
    animation: none;
    stroke-dashoffset: 1026;
  }

  svg[preserveAspectRatio='none'] .pulso {
    stroke-dashoffset: 1.16;
  }
}
</style>
