<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DemoWindow from './DemoWindow.vue'

// Visor de la demo para celulares.
//
// El panel de un complejo es una pantalla ancha: tiene menú a la izquierda,
// grilla de tres canchas y un cajón que entra por la derecha. En un teléfono
// vertical eso no entra, y encogerlo hasta que entre lo convierte en otra cosa
// —justo lo contrario de lo que la demo tiene que probar—.
//
// Entonces acá no se rediseña el panel: se le da toda la pantalla, girada.
// La cuenta es una sola: la ventana se dibuja siempre a `ANCHO_LOGICO` px y se
// escala hasta el ancho real. Así el visitante ve el mismo panel que vería en
// una computadora, un 20% más chico.
//
// Dos caminos para llegar a la pantalla apaisada:
//   • Android deja pedir pantalla completa + bloqueo de orientación, así que se
//     gira solo.
//   • iOS no deja ninguna de las dos. Ahí se le pide al visitante que gire el
//     teléfono; y si tiene la rotación bloqueada, se gira el contenido por CSS
//     (`girado`) para que igual pueda hacerlo a mano.

const emit = defineEmits(['close'])

const { step, stepIndex, finished, pasos, reset } = inject('demoPanel')

// Terminar la demo es el momento en que el visitante ya vio lo que hace el
// sistema y todavía tiene el teléfono en la mano: el alta va acá, no dos
// secciones más abajo.
const router = useRouter()
const registrarse = () => {
  emit('close')
  router.push('/panel/registro')
}

// El ancho al que se dibuja el panel antes de escalar, y de ahí sale la escala.
// 1180 no es un número redondo por casualidad: es el ancho con el que, en un
// teléfono acostado típico (844×390), el alto que queda alcanza para las seis
// horas enteras de la grilla sin scrollear. Más chico se lee mejor pero hay que
// scrollear; más grande entra todo pero la letra se va a 9px.
const ANCHO_LOGICO = 1180
const ALTO_BARRA = 36

const vw = ref(0)
const vh = ref(0)
// Contenido rotado por CSS: el plan B para quien tiene la rotación bloqueada.
const girado = ref(false)

const apaisado = computed(() => vw.value > vh.value)
// La caja útil: apaisada de verdad, o la pantalla vertical dada vuelta.
const cajaW = computed(() => (girado.value ? vh.value : vw.value))
const cajaH = computed(() => (girado.value ? vw.value : vh.value))

const escala = computed(() => Math.min(cajaW.value / ANCHO_LOGICO, 1))
// El alto se despeja de la escala en vez de fijarse: la ventana ocupa lo que
// queda de pantalla, y adentro cada pantalla scrollea sola.
const altoLogico = computed(() => Math.max((cajaH.value - ALTO_BARRA) / escala.value, 320))

const cajaStyle = computed(() =>
  girado.value
    ? {
        width: `${vh.value}px`,
        height: `${vw.value}px`,
        transform: 'rotate(90deg) translateY(-100%)',
        transformOrigin: 'top left',
      }
    : { width: `${vw.value}px`, height: `${vh.value}px` },
)

// --- Medición -------------------------------------------------------------
// Se usa `visualViewport` cuando está: en iOS la barra de direcciones se come
// alto y `innerHeight` miente hasta que el usuario scrollea.
const medir = () => {
  const v = window.visualViewport
  vw.value = Math.round(v?.width || window.innerWidth)
  vh.value = Math.round(v?.height || window.innerHeight)
  // Si el teléfono terminó girando de verdad, el truco de CSS sobra.
  if (vw.value > vh.value) girado.value = false
}

const onKey = (e) => {
  if (e.key === 'Escape') emit('close')
}

let scrollPrevio = ''
onMounted(() => {
  medir()
  window.addEventListener('resize', medir)
  window.addEventListener('orientationchange', medir)
  window.visualViewport?.addEventListener('resize', medir)
  window.addEventListener('keydown', onKey)
  scrollPrevio = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  reset()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', medir)
  window.removeEventListener('orientationchange', medir)
  window.visualViewport?.removeEventListener('resize', medir)
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = scrollPrevio
})

// El paso en curso, con el texto que corresponde al dedo y no al mouse.
const hint = computed(() => step.value?.hintTouch || step.value?.hint || '')
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] overflow-hidden overscroll-none bg-brand-green-900">
      <div class="absolute top-0 left-0 flex flex-col" :style="cajaStyle">
        <!-- ---------- Aviso de girar el teléfono ------------------------- -->
        <div
          v-if="!apaisado && !girado"
          class="flex h-full w-full flex-col items-center justify-center px-8 text-center"
        >
          <span class="gira flex h-24 w-24 items-center justify-center rounded-3xl bg-white/10">
            <i class="icon-[material-symbols--smartphone] text-5xl text-brand-lime-500"></i>
          </span>

          <p class="mt-8 text-xl font-semibold text-white">Girá el teléfono</p>
          <p class="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
            La demo es el panel de verdad, con el menú y la grilla de las tres canchas.
            Acostado entra entero.
          </p>

          <button
            type="button"
            class="mt-8 cursor-pointer rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            @click="girado = true"
          >
            Tengo la rotación bloqueada
          </button>
          <button
            type="button"
            class="mt-3 cursor-pointer p-2 text-sm text-white/50 transition-colors hover:text-white"
            @click="emit('close')"
          >
            Salir
          </button>
        </div>

        <!-- ---------- Demo -------------------------------------------------- -->
        <template v-else>
          <!-- Barra del narrador. Es la misma guía que en desktop está arriba de
               la ventana, apretada a un renglón: es el alto que sobra. -->
          <div
            class="flex shrink-0 items-center gap-3 bg-brand-green-900 px-3 text-white"
            :style="{ height: `${ALTO_BARRA}px` }"
          >
            <button
              type="button"
              class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Salir de la demo"
              @click="emit('close')"
            >
              <i class="icon-[material-symbols--close] text-base"></i>
            </button>

            <div class="flex shrink-0 items-center gap-1">
              <span
                v-for="(p, i) in pasos"
                :key="p.id"
                class="h-1.5 rounded-full transition-all"
                :class="
                  finished || i < stepIndex
                    ? 'w-4 bg-brand-lime-500'
                    : i === stepIndex
                      ? 'w-4 bg-white'
                      : 'w-1.5 bg-white/25'
                "
              ></span>
            </div>

            <p v-if="step" class="truncate text-xs text-white/70">
              <span class="font-medium text-white">{{ step.titulo }}.</span>
              {{ hint }}
            </p>
            <p v-else class="truncate text-xs font-medium text-white">
              Eso es todo. Así se maneja el complejo.
            </p>

            <div class="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                class="cursor-pointer rounded-full px-3 py-1 text-xs font-medium text-white/60 transition-colors hover:text-white"
                @click="reset"
              >
                {{ finished ? 'De nuevo' : 'Reiniciar' }}
              </button>
              <button
                v-if="finished"
                type="button"
                class="cursor-pointer rounded-full bg-brand-lime-500 px-3 py-1 text-xs font-medium text-brand-green-900 transition-colors hover:bg-brand-lime-600"
                @click="registrarse"
              >
                Probar gratis
              </button>
            </div>
          </div>

          <!-- La ventana, dibujada a tamaño de escritorio y encogida hasta el
               ancho del teléfono. -->
          <div class="flex min-h-0 flex-1 justify-center overflow-hidden bg-brand-sand-500">
            <!-- El envoltorio mide lo que la ventana ya escalada, que es lo que
                 la centra: `scale` no cambia el lugar que ocupa el elemento, así
                 que sin él una pantalla más ancha que el panel lo deja pegado a
                 la izquierda con un vacío al lado. -->
            <div class="h-full" :style="{ width: `${Math.round(ANCHO_LOGICO * escala)}px` }">
              <div
                class="origin-top-left"
                :style="{
                  width: `${ANCHO_LOGICO}px`,
                  height: `${altoLogico}px`,
                  transform: `scale(${escala})`,
                }"
              >
                <DemoWindow fill :chrome="false" />
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* El teléfono que se acuesta y vuelve: dice qué hacer sin una sola palabra. */
@keyframes gira {
  0%, 15% { transform: rotate(0deg); }
  45%, 70% { transform: rotate(-90deg); }
  100% { transform: rotate(0deg); }
}

.gira {
  animation: gira 3s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .gira {
    animation: none;
  }
}
</style>
