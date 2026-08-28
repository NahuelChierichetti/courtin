<script setup>
// Los cuatro problemas, como selector: la lista a la izquierda y la pantalla
// que los resuelve a la derecha.
//
// Se rota solo hasta que alguien toca algo, y desde ese momento manda la
// persona. Es la misma decisión que en la demo grande: un bloque que espera un
// clic que no llega no cuenta nada, pero seguir moviéndose después de que
// alguien eligió es pelearle al visitante.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import FeatureScreen from './FeatureScreen.vue'

const PROBLEMAS = [
  {
    id: 'grilla',
    queja: 'Se me volvieron a superponer dos turnos.',
    titulo: 'La grilla no te deja pisar un horario',
    texto:
      'Cada cancha con su columna y cada turno en su lugar. Lo que está ocupado se ve ocupado, y mover un turno es arrastrarlo.',
    icon: 'icon-[material-symbols--calendar-month]',
  },
  {
    id: 'reportes',
    queja: 'No tengo idea de cuánto facturé este mes.',
    titulo: 'Llevas un control de los números de tu complejo',
    texto:
      'Ingresos, ocupación, ticket promedio y qué cancha te rinde más. No hay nada que cargar por fuera.',
    icon: 'icon-[material-symbols--bar-chart]',
  },
  {
    id: 'caja',
    queja: 'La plata del día la anoto en un cuaderno.',
    titulo: 'Una caja que siempre cierra',
    texto:
      'Cada cobro y cada gasto queda registrado con fecha y responsable. Lo que se paga online entra sin que nadie lo anote.',
    icon: 'icon-[material-symbols--account-balance-wallet]',
  },
  {
    id: 'reservas',
    queja: 'Tengo el WhatsApp lleno de consultas.',
    titulo: 'Dejás de ser el cuello de botella',
    texto:
      'Hoy cada turno pasa por vos: te preguntan, mirás, respondés, anotás. Con tu link el cliente ve la disponibilidad real y reserva el horario que necesita, sin esperarte.',
    icon: 'icon-[material-symbols--chat-outline]',
  },
]

const ROTACION_MS = 6000

const activo = ref(0)
const manual = ref(false)
const actual = computed(() => PROBLEMAS[activo.value])

let timer = null

const detener = () => {
  clearInterval(timer)
  timer = null
}

const elegir = (i) => {
  activo.value = i
  manual.value = true
  detener()
}

onMounted(() => {
  const reducido =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducido) return
  timer = setInterval(() => {
    if (manual.value) return detener()
    activo.value = (activo.value + 1) % PROBLEMAS.length
  }, ROTACION_MS)
})

onBeforeUnmount(detener)
</script>

<template>
  <div class="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
    <!-- Lista -->
    <ul class="space-y-2">
      <li v-for="(p, i) in PROBLEMAS" :key="p.id">
        <button
          type="button"
          class="group relative w-full cursor-pointer overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300"
          :class="
            activo === i
              ? 'border-brand-purple-200 bg-brand-purple-50'
              : 'border-transparent hover:border-black/[0.06] hover:bg-stone-50'
          "
          :aria-current="activo === i"
          @click="elegir(i)"
        >
          <!-- Barra lateral que marca el activo -->
          <span
            class="absolute inset-y-4 left-0 w-0.5 rounded-full bg-brand-purple-500 transition-opacity duration-300"
            :class="activo === i ? 'opacity-100' : 'opacity-0'"
          ></span>

          <div class="flex items-start gap-3.5">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-300"
              :class="
                activo === i
                  ? 'bg-brand-purple-500 text-white'
                  : 'bg-stone-100 text-stone-400 group-hover:bg-stone-200'
              "
            >
              <i :class="p.icon" class="text-lg"></i>
            </span>

            <div class="min-w-0">
              <p
                class="text-[15px] transition-colors duration-300"
                :class="activo === i ? 'text-stone-500 italic' : 'text-stone-500 italic'"
              >
                “{{ p.queja }}”
              </p>
              <p
                class="mt-1.5 text-base font-medium transition-colors duration-300"
                :class="activo === i ? 'text-brand-purple-800' : 'text-brand-green-900'"
              >
                {{ p.titulo }}
              </p>

              <!-- El detalle sólo en el activo: mantiene la lista corta y hace
                   que elegir uno tenga una consecuencia visible. -->
              <div
                class="grid transition-all duration-400 ease-out"
                :class="activo === i ? 'mt-2 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
              >
                <p class="overflow-hidden text-[15px] leading-relaxed text-stone-600">
                  {{ p.texto }}
                </p>
              </div>
            </div>
          </div>

          <!-- Progreso de la rotación automática -->
          <span
            v-if="activo === i && !manual"
            class="absolute bottom-0 left-0 h-0.5 bg-brand-purple-400"
            :style="{ animation: `pxProgreso ${ROTACION_MS}ms linear forwards` }"
          ></span>
        </button>
      </li>
    </ul>

    <!-- Pantalla -->
    <div class="relative lg:sticky lg:top-28">
      <Transition
        mode="out-in"
        enter-active-class="transition duration-400 ease-out"
        enter-from-class="translate-y-3 opacity-0"
        leave-active-class="transition duration-200 ease-in"
        leave-to-class="-translate-y-3 opacity-0"
      >
        <FeatureScreen :key="actual.id" :variant="actual.id" />
      </Transition>

      <!-- Puntos, para que se lea como algo que cambia -->
      <div class="mt-5 flex gap-1.5">
        <button
          v-for="(p, i) in PROBLEMAS"
          :key="p.id"
          type="button"
          class="h-1.5 cursor-pointer rounded-full transition-all duration-300"
          :class="activo === i ? 'w-7 bg-brand-purple-500' : 'w-1.5 bg-stone-300 hover:bg-stone-400'"
          :aria-label="p.titulo"
          @click="elegir(i)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pxProgreso {
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
}
</style>
