<script setup>
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { useDemoPanel } from '@/composables/useDemoPanel'
import DemoTurnos from './DemoTurnos.vue'
import DemoReportes from './DemoReportes.vue'
import DemoCanchas from './DemoCanchas.vue'

const demo = useDemoPanel()
provide('demoPanel', demo)

const { tab, step, stepIndex, finished, toast, pasos, setTab, reset, start } = demo

// El menú completo del panel real (espejo de `ALL_NAV_ITEMS` en AppLayout), con
// las tres pantallas que la demo sabe abrir. Las otras se muestran deshabilitadas
// en vez de esconderse: el menú entero es parte del argumento —el sistema es más
// grande que lo que se puede probar acá— y recortarlo lo haría parecer más chico
// de lo que es.
const NAV = [
  { label: 'Dashboard', icon: 'icon-[material-symbols--home]', tab: null },
  { label: 'Turnos', icon: 'icon-[material-symbols--calendar-month]', tab: 'turnos' },
  { label: 'Clientes', icon: 'icon-[material-symbols--group]', tab: null },
  { label: 'Control de caja', icon: 'icon-[material-symbols--account-balance-wallet]', tab: null },
  { label: 'Canchas', icon: 'icon-[material-symbols--grid-view]', tab: 'canchas' },
  { label: 'Horarios', icon: 'icon-[material-symbols--schedule]', tab: null },
  { label: 'Reportes', icon: 'icon-[material-symbols--bar-chart]', tab: 'reportes' },
  { label: 'Equipo', icon: 'icon-[material-symbols--badge-outline]', tab: null },
  { label: 'Suscripción', icon: 'icon-[material-symbols--credit-card-outline]', tab: null },
  { label: 'Notificaciones', icon: 'icon-[material-symbols--notifications]', tab: null },
]

const TITULOS = {
  turnos: 'Turnos',
  reportes: 'Reportes',
  canchas: 'Canchas',
}

// El paso al que le toca el brillo en el menú, para que se vea dónde hay que ir.
const navHint = computed(() =>
  step.value && step.value.tab !== tab.value ? step.value.tab : null,
)

// La demo arranca cuando entra en pantalla, no al montar: si arrancara antes,
// quien llega scrolleando se encontraría los cuatro pasos ya jugados.
const root = ref(null)
let io
onMounted(() => {
  io = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        start()
        io.disconnect()
      }
    },
    { threshold: 0.35 },
  )
  if (root.value) io.observe(root.value)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <div ref="root">
    <!-- ---------- Guía (desktop) ---------------------------------------- -->
    <!-- Vive fuera de la ventana del panel a propósito: es el narrador, no
         parte del producto. Adentro se confundiría con la interfaz real. -->
    <div class="hidden lg:block">
      <ol class="flex flex-wrap items-center gap-2">
        <li v-for="(p, i) in pasos" :key="p.id" class="flex items-center gap-2">
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors"
            :class="
              finished || i < stepIndex
                ? 'bg-brand-green-500 text-white'
                : i === stepIndex
                  ? 'bg-brand-purple-500 text-white'
                  : 'bg-white text-stone-400 ring-1 ring-black/[0.06]'
            "
          >
            <i v-if="finished || i < stepIndex" class="icon-[material-symbols--check] text-sm"></i>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span
            class="hidden text-xs sm:block"
            :class="i === stepIndex && !finished ? 'text-brand-green-900' : 'text-stone-400'"
          >{{ p.titulo }}</span>
          <span v-if="i < pasos.length - 1" class="h-px w-6 bg-black/[0.08]"></span>
        </li>
      </ol>

      <p v-if="step" class="mt-4 text-base text-stone-600">
        <span class="font-medium text-brand-green-900">{{ step.titulo }}.</span>
        {{ step.hint }}
      </p>
      <div v-else class="mt-4">
        <p class="text-base font-medium text-brand-green-900">Eso es todo. Así se maneja el complejo.</p>
        <button
          type="button"
          class="mt-2 cursor-pointer text-sm font-medium text-brand-purple-600 underline underline-offset-4 transition-colors hover:text-brand-purple-700"
          @click="reset"
        >
          Probar de nuevo
        </button>
      </div>
    </div>

    <!-- ---------- Ventana del panel (desktop) --------------------------- -->
    <div
      class="mt-6 hidden overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-2xl shadow-brand-green-900/10 lg:block"
    >
      <!-- Barra del navegador: encuadra la demo como "esto es una app web" -->
      <div class="flex items-center gap-2 border-b border-black/[0.06] bg-stone-100 px-4 py-2.5">
        <span class="h-2.5 w-2.5 rounded-full bg-stone-300"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-stone-300"></span>
        <span class="h-2.5 w-2.5 rounded-full bg-stone-300"></span>
        <div
          class="mx-auto flex items-center gap-1.5 rounded-md bg-white px-3 py-1 text-xs text-stone-400"
        >
          <i class="icon-[material-symbols--lock] text-[11px]"></i>
          courtinapp.com/panel/{{ tab }}
        </div>
      </div>

      <div class="flex h-[620px]">
        <!-- Sidebar -->
        <aside class="flex w-56 shrink-0 flex-col bg-brand-green-900">
          <div class="flex items-center gap-2.5 px-5 pt-5 pb-4">
            <img src="/images/logo-lime.svg" alt="" class="h-10 w-auto" />
            <p class="text-xl leading-none text-white">
              Court<span class="text-brand-lime-500">In</span>
            </p>
          </div>
          <nav class="mt-3 flex-1 space-y-0.5 overflow-y-auto px-3">
            <button
              v-for="item in NAV"
              :key="item.label"
              type="button"
              :disabled="!item.tab"
              :title="item.tab ? null : `${item.label} está en el sistema completo`"
              class="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed"
              :class="
                !item.tab
                  ? 'text-white/35'
                  : item.tab === tab
                    ? 'cursor-pointer bg-white/12 text-white'
                    : 'cursor-pointer text-white/70 hover:bg-white/8 hover:text-white'
              "
              @click="setTab(item.tab)"
            >
              <i
                :class="[
                  item.icon,
                  !item.tab ? 'text-white/30' : item.tab === tab ? 'text-brand-lime-500' : 'text-white/60',
                ]"
                class="text-lg"
              ></i>
              <span class="flex-1">{{ item.label }}</span>
              <!-- Anillo pulsante sobre la pantalla a la que hay que ir.
                   El `item.tab &&` no sobra: sin él, las secciones decorativas
                   (`tab: null`) matchean contra un `navHint` nulo y se prenden
                   todas juntas. -->
              <span
                v-if="item.tab && navHint === item.tab"
                class="absolute inset-0 rounded-xl ring-2 ring-brand-lime-500"
              >
                <span class="absolute inset-0 animate-pulse rounded-xl bg-brand-lime-500/15"></span>
              </span>
            </button>
          </nav>
          <div class="border-t border-white/10 px-5 py-4">
            <p class="text-xs font-semibold text-white">Complejo Los Amigos</p>
            <p class="text-[11px] text-white/50">Plan Pro · 3 canchas</p>
          </div>
        </aside>

        <!-- Contenido -->
        <div class="relative flex min-w-0 flex-1 flex-col bg-brand-sand-500">
          <header
            class="flex shrink-0 items-center justify-between border-b border-black/[0.06] bg-white px-6 py-3.5"
          >
            <div>
              <h3 class="text-base font-semibold text-brand-green-900">{{ TITULOS[tab] }}</h3>
              <p class="text-xs text-stone-500">Viernes 13 de marzo</p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="rounded-lg border border-black/[0.08] px-2.5 py-1.5 text-xs font-medium text-stone-500"
              >Hoy</span>
              <span
                class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-purple-100 text-xs font-bold text-brand-purple-700"
              >LP</span>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-auto p-5">
            <DemoTurnos v-if="tab === 'turnos'" />
            <DemoReportes v-else-if="tab === 'reportes'" />
            <DemoCanchas v-else-if="tab === 'canchas'" />
          </div>

          <!-- Aviso de lo que acaba de pasar -->
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="translate-y-2 opacity-0"
            leave-active-class="transition duration-200 ease-in"
            leave-to-class="translate-y-2 opacity-0"
          >
            <div
              v-if="toast"
              class="absolute bottom-4 left-1/2 z-40 flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg"
              :class="toast.tono === 'error' ? 'bg-error-600' : 'bg-ink-500'"
            >
              <i
                :class="
                  toast.tono === 'error'
                    ? 'icon-[material-symbols--block] text-white'
                    : 'icon-[material-symbols--check-circle] text-brand-lime-500'
                "
                class="shrink-0 text-base"
              ></i>
              {{ toast.msg }}
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- ---------- Fallback (mobile) -------------------------------------- -->
    <!-- La grilla de turnos necesita ancho: en un teléfono no se puede
         arrastrar un turno entre tres columnas sin que sea una pelea. En vez de
         encajarla a la fuerza, acá se cuenta lo mismo en cuatro tarjetas. -->
    <div class="lg:hidden">
      <ul class="space-y-3">
        <li
          v-for="(p, i) in pasos"
          :key="p.id"
          class="flex gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-purple-500 text-xs font-medium text-white"
          >{{ i + 1 }}</span>
          <div>
            <p class="text-sm font-medium text-brand-green-900">{{ p.titulo }}</p>
            <p class="mt-0.5 text-sm leading-relaxed text-stone-600">{{ p.logro }}</p>
          </div>
        </li>
      </ul>
      <p class="mt-4 flex items-center justify-center gap-2 text-center text-xs text-stone-500">
        <i class="icon-[material-symbols--desktop-windows-outline] text-sm"></i>
        Abrí esta página en una computadora para probar la demo.
      </p>
    </div>
  </div>
</template>
