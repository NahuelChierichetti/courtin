<script setup>
import { vReveal } from '@/composables/useReveal'

// Las mismas ocho preguntas de siempre, pero abiertas.
//
// Un acordeón esconde justo lo que acá tiene que estar a la vista: son las
// objeciones del que todavía no confía ("¿se quedan con una parte?", "¿pierdo
// los turnos si me atraso?"), y una respuesta que hay que ir a buscar con un
// clic pesa menos que una respuesta que ya está escrita. Las respuestas son
// cortas, así que entran las ocho sin que la sección se vuelva un muro.
const PREGUNTAS = [
  {
    q: '¿Tengo que cargar todos mis turnos de nuevo?',
    a: 'No. Cargás tus canchas y tus horarios de atención una vez, y listo. Los turnos van entrando a medida que reservás. Si tenés clientes fijos semanales, también podés gestionarlos como turnos recurrentes.',
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
</script>

<template>
  <div class="grid gap-x-14 gap-y-9 md:grid-cols-2">
    <!-- Escalonadas de a pares, que es como caen en dos columnas. -->
    <div v-for="(p, i) in PREGUNTAS" :key="p.q" v-reveal="Math.floor(i / 2) * 80">
      <p class="text-base font-medium text-brand-green-900">{{ p.q }}</p>
      <p class="mt-2 text-[15px] leading-relaxed text-neutral-600">{{ p.a }}</p>
    </div>
  </div>
</template>
