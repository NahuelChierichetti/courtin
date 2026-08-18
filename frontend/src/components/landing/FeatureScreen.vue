<script setup>
// Mini pantallas del panel, para acompañar el texto de cada sección.
//
// A diferencia de la demo grande —que monta los componentes de producción—,
// estas son maquetas: se dibujan a mano porque tienen que entrar en un tercio de
// pantalla y a ese tamaño la interfaz real no se lee. La regla que sí se
// respeta es la del color: todo sale de los tokens de marca y del catálogo de
// deportes, así que ninguna inventa una paleta propia.
import { computed } from 'vue'
import { sportMeta } from '@/utils/sports'

const props = defineProps({
  variant: { type: String, default: 'grilla' },
})

const TITULOS = {
  grilla: 'Turnos',
  reportes: 'Reportes',
  caja: 'Control de caja',
  clientes: 'Clientes',
  reservas: 'Tu link de reservas',
}

const titulo = computed(() => TITULOS[props.variant] || 'Panel')

// --- Datos de cada maqueta -------------------------------------------------

const COLUMNAS = ['Pádel 1', 'Pádel 2', 'Fútbol 5']

// { columna, fila de arranque, alto en filas, deporte }
// El alto mínimo es 2: con una sola fila (23px) los dos renglones de adentro
// no entran y el nombre queda pegado al borde inferior.
const BLOQUES = [
  { col: 0, top: 0, alto: 2, tipo: 'padel', hora: '18:00', quien: 'Laura G.' },
  { col: 0, top: 3, alto: 2, tipo: 'padel', hora: '20:00', quien: 'Martín S.' },
  { col: 1, top: 1, alto: 2, tipo: 'padel', hora: '19:00', quien: 'Diego P.' },
  { col: 1, top: 4, alto: 2, tipo: 'padel', hora: '22:00', quien: 'Flor A.' },
  { col: 2, top: 1, alto: 2, tipo: 'futbol', hora: '19:00', quien: 'Julián R.' },
  { col: 2, top: 3, alto: 2, tipo: 'futbol', hora: '21:00', quien: 'Pablo M.' },
]

const BARRAS = [42, 58, 35, 71, 52, 88, 96]

const MOVIMIENTOS = [
  { concepto: 'Turno Pádel 1 · Laura G.', monto: 33000, tipo: 'ingreso' },
  { concepto: 'Seña online · Nicolás F.', monto: 11000, tipo: 'ingreso' },
  { concepto: 'Pelotas y grip', monto: -18400, tipo: 'egreso' },
  { concepto: 'Turno Fútbol 5 · Pablo M.', monto: 30000, tipo: 'ingreso' },
]

const CLIENTES = [
  { nombre: 'Laura Giménez', iniciales: 'LG', turnos: 24, tono: 'bg-brand-purple-100 text-brand-purple-700' },
  { nombre: 'Martín Suárez', iniciales: 'MS', turnos: 18, tono: 'bg-brand-green-100 text-brand-green-700' },
  { nombre: 'Diego Paz', iniciales: 'DP', turnos: 12, tono: 'bg-brand-lime-100 text-brand-green-800' },
  { nombre: 'Flor Aguirre', iniciales: 'FA', turnos: 9, tono: 'bg-brand-purple-100 text-brand-purple-700' },
]

// Lo que ve el jugador en la ficha pública: horarios libres, uno tomado y el
// que acaba de elegir.
const SLOTS = [
  { hora: '18:00', estado: 'libre' },
  { hora: '19:30', estado: 'tomado' },
  { hora: '21:00', estado: 'elegido' },
  { hora: '22:30', estado: 'libre' },
]

const AVISOS = [
  'Le llegó el mail con su comprobante',
  'A vos te llegó el aviso del turno nuevo',
]

const money = (n) =>
  `${n < 0 ? '−' : ''}$ ${Math.abs(n).toLocaleString('es-AR')}`

const FILA = 26 // alto de una fila de la grilla, en px
</script>

<template>
  <div
    class="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-xl shadow-brand-green-900/10"
  >
    <!-- Barra de la ventana -->
    <div class="flex items-center gap-1.5 border-b border-black/[0.06] bg-stone-50 px-3.5 py-2.5">
      <span class="h-2 w-2 rounded-full bg-stone-300"></span>
      <span class="h-2 w-2 rounded-full bg-stone-300"></span>
      <span class="h-2 w-2 rounded-full bg-stone-300"></span>
      <span class="ml-2 text-[11px] text-stone-400">{{ titulo }}</span>
    </div>

    <!-- ---------- Grilla de turnos ---------- -->
    <div v-if="variant === 'grilla'" class="p-3.5">
      <div class="flex gap-1.5">
        <div class="w-7 shrink-0"></div>
        <div
          v-for="c in COLUMNAS"
          :key="c"
          class="flex-1 truncate text-center text-[10px] font-medium text-stone-500"
        >
          {{ c }}
        </div>
      </div>

      <div class="mt-1.5 flex gap-1.5">
        <!-- Horas -->
        <div class="w-7 shrink-0">
          <div
            v-for="h in 6"
            :key="h"
            class="font-secondary text-[9px] text-stone-300"
            :style="{ height: FILA + 'px', lineHeight: FILA + 'px' }"
          >
            {{ 17 + h }}:00
          </div>
        </div>

        <!-- Columnas -->
        <div
          v-for="(c, ci) in COLUMNAS"
          :key="c"
          class="relative flex-1 rounded-md bg-stone-50"
          :style="{ height: FILA * 6 + 'px' }"
        >
          <div
            v-for="b in BLOQUES.filter((x) => x.col === ci)"
            :key="b.hora + b.quien"
            class="absolute inset-x-0.5 overflow-hidden rounded border-l-2 px-1.5 py-1"
            :class="[sportMeta(b.tipo).border, sportMeta(b.tipo).bg]"
            :style="{ top: b.top * FILA + 'px', height: b.alto * FILA - 3 + 'px' }"
          >
            <p class="font-secondary text-[8px] leading-tight" :class="sportMeta(b.tipo).textSoft">
              {{ b.hora }}
            </p>
            <p class="truncate text-[9px] leading-tight font-medium text-ink-500">{{ b.quien }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ---------- Reportes ---------- -->
    <div v-else-if="variant === 'reportes'" class="space-y-3 p-3.5">
      <div class="grid grid-cols-2 gap-2.5">
        <div class="rounded-xl bg-success-50 p-3">
          <p class="text-[10px] leading-tight text-success-700">Ingresos del mes</p>
          <!-- Abreviado: la maqueta se usa también a 192px de ancho (el collage
               del hero) y ahí el monto completo se corta. -->
          <p class="font-secondary mt-0.5 text-base font-semibold whitespace-nowrap text-success-600">$ 1,84 M</p>
        </div>
        <div class="rounded-xl bg-brand-purple-50 p-3">
          <p class="text-[10px] text-brand-purple-700">Ocupación</p>
          <p class="font-secondary mt-0.5 text-base font-semibold text-brand-purple-600">78%</p>
        </div>
      </div>

      <div class="rounded-xl border border-black/[0.06] p-3">
        <p class="text-[10px] text-stone-500">Ingresos por día</p>
        <div class="mt-2.5 flex h-24 items-end gap-1.5">
          <div
            v-for="(b, i) in BARRAS"
            :key="i"
            class="flex-1 rounded-t transition-all duration-700"
            :class="i === BARRAS.length - 1 ? 'bg-brand-green-500' : 'bg-brand-green-200'"
            :style="{ height: b + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- ---------- Control de caja ---------- -->
    <div v-else-if="variant === 'caja'" class="p-3.5">
      <div class="flex items-baseline justify-between rounded-xl bg-brand-green-50 px-3.5 py-3">
        <span class="text-[10px] text-brand-green-700">Saldo del día</span>
        <span class="font-secondary text-lg font-semibold text-brand-green-700">$ 55.600</span>
      </div>

      <ul class="mt-2.5 space-y-1.5">
        <li
          v-for="m in MOVIMIENTOS"
          :key="m.concepto"
          class="flex items-center gap-2.5 rounded-lg border border-black/[0.06] px-3 py-2"
        >
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
            :class="m.tipo === 'ingreso' ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-500'"
          >
            <i
              :class="
                m.tipo === 'ingreso'
                  ? 'icon-[material-symbols--arrow-downward]'
                  : 'icon-[material-symbols--arrow-upward]'
              "
              class="text-[11px]"
            ></i>
          </span>
          <span class="min-w-0 flex-1 truncate text-[11px] text-stone-600">{{ m.concepto }}</span>
          <span
            class="font-secondary shrink-0 text-[11px] font-medium"
            :class="m.tipo === 'ingreso' ? 'text-success-600' : 'text-error-500'"
          >
            {{ money(m.monto) }}
          </span>
        </li>
      </ul>
    </div>

    <!-- ---------- Clientes ---------- -->
    <div v-else-if="variant === 'clientes'" class="p-3.5">
      <div class="flex items-center gap-2 rounded-lg bg-stone-50 px-3 py-2">
        <i class="icon-[material-symbols--search] text-[13px] text-stone-400"></i>
        <span class="text-[11px] text-stone-400">Buscar cliente…</span>
      </div>

      <ul class="mt-2.5 space-y-1.5">
        <li
          v-for="c in CLIENTES"
          :key="c.nombre"
          class="flex items-center gap-2.5 rounded-lg border border-black/[0.06] px-3 py-2"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
            :class="c.tono"
          >
            {{ c.iniciales }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[11px] font-medium text-ink-500">{{ c.nombre }}</p>
            <p class="text-[10px] text-stone-400">{{ c.turnos }} turnos jugados</p>
          </div>
          <i class="icon-[material-symbols--chevron-right] shrink-0 text-sm text-stone-300"></i>
        </li>
      </ul>
    </div>

    <!-- ---------- Reservas del cliente ----------
         La única maqueta que no es del panel sino de lo que ve el jugador: el
         punto del bloque es que el turno entra sin que el dueño intervenga, así
         que la pantalla tiene que ser la del otro lado del mostrador. -->
    <div v-else class="p-3.5">
      <p class="text-[11px] text-stone-500">Viernes 13 · Pádel 1</p>

      <div class="mt-2.5 grid grid-cols-3 gap-1.5">
        <span
          v-for="s in SLOTS"
          :key="s.hora"
          class="rounded-full border py-1.5 text-center text-[10px] font-medium"
          :class="
            s.estado === 'tomado'
              ? 'border-black/[0.04] bg-stone-50 text-stone-300 line-through'
              : s.estado === 'elegido'
                ? 'border-brand-green-500 bg-brand-green-500 text-white'
                : 'border-black/[0.08] bg-white text-ink-500'
          "
        >
          {{ s.hora }}
        </span>
      </div>

      <div class="mt-3 rounded-xl border border-brand-green-100 bg-brand-green-50 p-3">
        <div class="flex items-center gap-2">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green-500 text-white"
          >
            <i class="icon-[material-symbols--check] text-[13px]"></i>
          </span>
          <div class="min-w-0">
            <p class="text-[11px] font-medium text-brand-green-800">Reservado por el cliente</p>
            <p class="text-[10px] text-brand-green-700">21:00 · Bruno Torres · seña paga</p>
          </div>
        </div>
      </div>

      <ul class="mt-2.5 space-y-1.5">
        <li
          v-for="a in AVISOS"
          :key="a"
          class="flex items-center gap-2 rounded-lg border border-black/[0.06] px-3 py-2 text-[10px] text-stone-500"
        >
          <i class="icon-[material-symbols--notifications-outline] shrink-0 text-[12px] text-brand-purple-400"></i>
          {{ a }}
        </li>
      </ul>
    </div>
  </div>
</template>
