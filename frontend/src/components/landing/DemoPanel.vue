<script setup>
import { onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { useDemoPanel } from '@/composables/useDemoPanel'
import DemoWindow from './DemoWindow.vue'
import DemoMobileViewer from './DemoMobileViewer.vue'

const demo = useDemoPanel()
provide('demoPanel', demo)

const { step, stepIndex, finished, started, pasos, reset, start } = demo

// La demo se enciende a mano, con el botón de abajo.
//
// Antes arrancaba sola al entrar en pantalla. El problema no era el arranque
// sino lo que venía después: el guión sigue corriendo mientras el visitante
// baja a leer precios, y cada paso que cambia de pantalla mueve cosas —y movía
// también el scroll— atrás de alguien que ya estaba en otra sección. Con el
// botón, la animación empieza cuando alguien decide mirarla.
//
// En celular es igual desde siempre: el visor a pantalla completa se abre con
// "Iniciar demo".
// El corte es el mismo `lg` que usan las clases de abajo, pero acá hace falta en
// JavaScript: en celular la ventana no se esconde con CSS sino que no se monta.
// Montarla escondida costaría un calendario entero de más en el aparato más
// lento de los dos.
const DESKTOP_QUERY = '(min-width: 1024px)'
const desktopMq = window.matchMedia(DESKTOP_QUERY)
const isDesktop = ref(desktopMq.matches)
const onDesktopChange = (e) => {
  isDesktop.value = e.matches
}

onMounted(() => desktopMq.addEventListener('change', onDesktopChange))
onBeforeUnmount(() => desktopMq.removeEventListener('change', onDesktopChange))

// --- Visor de celular -------------------------------------------------------
// El 90% de los que abren esta página llegan de un link de WhatsApp o de
// Instagram, o sea con el teléfono en la mano. Antes ahí la demo no existía:
// decía "abrila en una computadora", que es pedirle al que todavía no confía
// que vuelva más tarde. Ahora se abre a pantalla completa.
const viewerOpen = ref(false)

const openViewer = async () => {
  viewerOpen.value = true
  // Android acepta las dos cosas y la pantalla se acuesta sola. iOS rechaza las
  // dos, y ahí el visor muestra el aviso de girar el teléfono: por eso el
  // `catch` vacío no esconde nada, es el camino previsto.
  try {
    await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })
    await screen.orientation?.lock?.('landscape')
  } catch {
    /* sin pantalla completa ni bloqueo: se gira a mano */
  }
}

const closeViewer = async () => {
  viewerOpen.value = false
  try {
    screen.orientation?.unlock?.()
    if (document.fullscreenElement) await document.exitFullscreen()
  } catch {
    /* nada que deshacer */
  }
}
</script>

<template>
  <div>
    <!-- ---------- Guía (desktop) ---------------------------------------- -->
    <!-- Vive fuera de la ventana del panel a propósito: es el narrador, no
         parte del producto. Adentro se confundiría con la interfaz real. -->
    <div v-if="isDesktop">
      <ol class="flex flex-wrap items-center gap-2">
        <li v-for="(p, i) in pasos" :key="p.id" class="flex items-center gap-2">
          <span
            class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors"
            :class="
              finished || (started && i < stepIndex)
                ? 'bg-brand-green-500 text-white'
                : started && i === stepIndex
                  ? 'bg-brand-purple-500 text-white'
                  : 'bg-white text-stone-400 ring-1 ring-black/[0.06]'
            "
          >
            <i
              v-if="finished || (started && i < stepIndex)"
              class="icon-[material-symbols--check] text-sm"
            ></i>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span
            class="hidden text-xs sm:block"
            :class="
              started && i === stepIndex && !finished ? 'text-brand-green-900' : 'text-stone-400'
            "
          >{{ p.titulo }}</span>
          <span v-if="i < pasos.length - 1" class="h-px w-6 bg-black/[0.08]"></span>
        </li>
      </ol>

      <!-- Antes de arrancar: el botón, y el aviso de que igual se puede tocar
           todo por cuenta propia. El guión es una ayuda, no un riel. -->
      <div v-if="!started" class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button
          type="button"
          class="flex cursor-pointer items-center gap-2 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-medium text-brand-green-900 transition-colors hover:bg-brand-lime-600"
          @click="start"
        >
          <i class="icon-[material-symbols--play-arrow] text-lg"></i>
          Iniciar demo
        </button>
        <p class="text-base text-stone-600">
          Cuatro pasos guiados, o tocá el panel por tu cuenta.
        </p>
      </div>

      <p v-else-if="step" class="mt-4 text-base text-stone-600">
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
    <div v-if="isDesktop" class="mt-6">
      <DemoWindow />
    </div>

    <!-- ---------- Celular ------------------------------------------------ -->
    <!-- La grilla de turnos necesita ancho, así que en el teléfono la demo no
         va incrustada en la página sino a pantalla completa y acostada. Acá
         queda la invitación y el resumen de lo que se va a probar. -->
    <div v-if="!isDesktop">
      <div class="rounded-2xl border border-brand-green-100 bg-brand-green-50 p-5">
        <div class="flex items-start gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-green-600"
          >
            <i class="icon-[material-symbols--screen-rotation] text-xl"></i>
          </span>
          <div>
            <p class="text-base font-medium text-brand-green-900">Probala acá, desde el celular</p>
            <p class="mt-1 text-sm leading-relaxed text-stone-600">
              Se abre a pantalla completa y con el teléfono acostado, para que entre el panel
              entero: el menú, la grilla de las tres canchas y los reportes.
            </p>
          </div>
        </div>

        <button
          type="button"
          class="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-lime-500 py-3 text-base font-medium text-brand-green-900 transition-colors hover:bg-brand-lime-600"
          @click="openViewer"
        >
          <i class="icon-[material-symbols--play-arrow] text-xl"></i>
          Iniciar demo
        </button>
      </div>

      <ul class="mt-4 space-y-3">
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
    </div>

    <DemoMobileViewer v-if="viewerOpen" @close="closeViewer" />
  </div>
</template>
