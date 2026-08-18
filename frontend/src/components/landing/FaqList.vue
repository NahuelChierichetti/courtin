<script setup>
import { ref } from 'vue'

// Las objeciones reales de un dueño de complejo, en el orden en que aparecen
// cuando uno le muestra el sistema. Las respuestas dicen lo que el producto hace
// de verdad —incluida la aprobación previa del alta y el pago por transferencia—
// porque una promesa que se cae en el primer contacto cuesta más que la venta.
const PREGUNTAS = [
  {
    q: '¿Tengo que cargar todos mis turnos de nuevo?',
    a: 'No. Cargás tus canchas y tus horarios de atención una vez, y listo. Los turnos van entrando a medida que reservás. Si tenés clientes fijos semanales, también podes gestionarlos como "turnos recurrentes".',
  },
  {
    q: '¿Lo va a poder usar el que atiende el mostrador?',
    a: 'Es una grilla: se ve el día completo, se toca un hueco para cargar un turno y se arrastra para moverlo. Cada persona de tu equipo tiene su propio usuario, así sabés quién cargó cada cosa.',
  },
  {
    q: '¿CourtIn se queda con una parte de mis reservas?',
    a: 'No. Cero comisión sobre lo que cobrás. Pagás el abono del plan y nada más. La plata de las reservas va directo a tu cuenta de MercadoPago: nosotros nunca la tocamos.',
  },
  {
    q: '¿Cuánto tarda en estar funcionando?',
    a: 'Te registrás, revisamos la solicitud y te habilitamos el complejo. Después, cargar canchas y horarios te lleva un rato largo la primera vez y nunca más. Desde ahí ya tenés tu link para compartir.',
  },
  {
    q: '¿Hay contrato o permanencia?',
    a: 'No. El primer mes es gratis y después es mes a mes. Si querés dejarlo, lo dejás. El plan anual existe sólo porque sale más barato, no porque te ate.',
  },
  {
    q: 'Si un mes me atraso con el pago, ¿pierdo los turnos?',
    a: 'Nunca. Los turnos que tus clientes ya reservaron siguen funcionando pase lo que pase, y ellos conservan su link para gestionarlos. Si hay una deuda te avisamos por email y vas viendo el detalle en tu panel.',
  },
  {
    q: '¿Funciona desde el celular?',
    a: 'Sí, tanto tu panel como el link de reservas de tus clientes. Y no hay nada que descargar: es una página web, entrás con tu usuario desde cualquier teléfono o computadora.',
  },
  {
    q: '¿Cómo pago el abono?',
    a: 'Te contactamos y lo coordinamos con vos. No te pedimos la tarjeta al registrarte ni te cobramos nada durante el primer mes.',
  },
]

// Arranca todo cerrado menos la primera: deja ver que las respuestas son cortas
// sin obligar a nadie a un primer clic a ciegas.
const abierta = ref(0)

const toggle = (i) => (abierta.value = abierta.value === i ? null : i)
</script>

<template>
  <div class="divide-y divide-black/[0.06] overflow-hidden rounded-3xl border border-black/[0.06] bg-white">
    <div v-for="(p, i) in PREGUNTAS" :key="p.q">
      <button
        type="button"
        class="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-stone-50"
        :aria-expanded="abierta === i"
        @click="toggle(i)"
      >
        <span class="text-base font-medium text-ink-500">{{ p.q }}</span>
        <i
          class="icon-[material-symbols--expand-more] shrink-0 text-xl transition-transform duration-300"
          :class="abierta === i ? 'rotate-180 text-brand-purple-500' : 'text-stone-400'"
        ></i>
      </button>
      <!-- El grid de 0fr→1fr es lo que permite animar la apertura sin saber de
           antemano cuánto mide la respuesta. -->
      <div
        class="grid transition-all duration-300 ease-out"
        :class="abierta === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
      >
        <div class="overflow-hidden">
          <p class="max-w-2xl px-6 pb-5 text-[15px] leading-relaxed text-stone-600">{{ p.a }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
