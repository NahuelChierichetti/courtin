<script setup>
import { ref, onMounted } from 'vue'
import { waLink } from '@/utils/whatsapp'
import WhatsappIcon from '@/components/common/WhatsappIcon.vue'

// Botón flotante de WhatsApp para la landing de complejos.
//
// Es el atajo para el que no quiere llenar el formulario de "Agendar demo" ni
// escribir un mail: abre el chat con el mensaje ya redactado, así del otro lado
// llega alguien que ya dijo qué necesita. Como el resto de los WhatsApp del
// sistema, esto no manda nada: arma un link `wa.me` (ver utils/whatsapp.js).
//
// El número es el de ventas y va escrito acá, no en el club ni en una variable
// de entorno: la landing es una sola y le habla a quien todavía no es cliente.
const TELEFONO = '5492216714060'
const MENSAJE = 'Hola, tengo un complejo deportivo y me interesa recibir más información sobre CourtIn'

const LINK = waLink(TELEFONO, MENSAJE)

// La burbuja con el texto entra sola unos segundos después de cargar la página:
// si apareciera junto con el hero compite con el título, y si no apareciera
// nunca el botón sería un ícono verde sin explicación.
const visible = ref(false)
const globoAbierto = ref(false)

onMounted(() => {
  setTimeout(() => { visible.value = true }, 900)
  setTimeout(() => { globoAbierto.value = true }, 1800)
})

// Cerrar oculta sólo el texto; el botón se queda. Que el visitante lo baje no
// significa que no vaya a escribir después.
const cerrarGlobo = () => { globoAbierto.value = false }
</script>

<template>
  <div
    v-if="LINK"
    class="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 transition-all duration-500 sm:right-6 sm:bottom-6"
    :class="visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'"
  >
    <!-- Globo con el mensaje -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="translate-y-2 scale-95 opacity-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-to-class="translate-y-1 scale-95 opacity-0"
    >
      <div v-if="globoAbierto" class="relative max-w-[16rem] sm:max-w-xs">
        <a
          :href="LINK"
          target="_blank"
          rel="noopener"
          class="relative block rounded-2xl rounded-br-sm bg-white py-3 pr-8 pl-3.5 no-underline shadow-lg transition-shadow hover:shadow-xl"
        >
          <p class="text-[15px] leading-snug text-[#111B21]">
            ¿Tenés un complejo deportivo y querés automatizarlo?
            <span class="font-medium">Hablemos</span>
          </p>

          <!-- El pico que apunta al botón. Es un cuadrado rotado tapado a medias
               por el globo, que es como se dibuja la colita de un chat sin
               pelearse con el `rounded` del contenedor. -->
          <span
            class="pointer-events-none absolute right-[-3px] bottom-1.5 h-3 w-3 rotate-45 bg-white"
          ></span>
        </a>

        <button
          type="button"
          aria-label="Cerrar mensaje"
          class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-[#111B21]"
          @click="cerrarGlobo"
        >
          <i class="icon-[material-symbols--close] text-sm"></i>
        </button>
      </div>
    </Transition>

    <!-- Botón -->
    <a
      :href="LINK"
      target="_blank"
      rel="noopener"
      aria-label="Escribinos por WhatsApp: 1 mensaje sin leer"
      class="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
      @click="cerrarGlobo"
    >
      <WhatsappIcon class="h-7 w-7" />

      <!-- Contador de mensaje sin leer. -->
      <span
        class="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-[11px] font-semibold text-white"
      >1</span>
    </a>
  </div>
</template>
