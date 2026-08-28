<script setup>
import { RouterLink } from 'vue-router'
import { vReveal } from '@/composables/useReveal'
import DemoPanel from '@/components/landing/DemoPanel.vue'
import HeroVisual from '@/components/landing/HeroVisual.vue'
import ProblemasSwitcher from '@/components/landing/ProblemasSwitcher.vue'
import PhoneMockup from '@/components/landing/PhoneMockup.vue'
import SenaSimulador from '@/components/landing/SenaSimulador.vue'
import PricingPlans from '@/components/landing/PricingPlans.vue'
import FaqList from '@/components/landing/FaqList.vue'
import DemoRequestForm from '@/components/landing/DemoRequestForm.vue'

// Página de venta para dueños de complejo.
//
// Es la única pantalla de CourtIn que no le habla al jugador sino a quien paga,
// y por eso no usa `PublicLayout`: ese layout tiene el buscador de canchas en el
// encabezado, que acá sería ruido. Va con su propio encabezado y pie.
//
// Tres reglas de la página, para que no se desarmen al editarla:
//   • Todo alineado a la izquierda. Ningún `text-center`.
//   • Poco bold: los títulos van en `font-semibold` y el resto en `font-medium`
//     o normal. El peso deja de significar algo si está en todos lados.
//   • El violeta de marca es el acento secundario (etiquetas de sección,
//     estados activos); el verde sigue siendo el primario y el lima, el CTA.

const VENTAJAS_LINK = [
  { icon: 'icon-[material-symbols--nightlight-outline]', texto: 'Toma reservas a las 3 de la mañana, cuando vos dormís' },
  { icon: 'icon-[material-symbols--mobile-friendly-outline]', texto: 'Tu cliente no descarga ninguna app: entra y reserva' },
  { icon: 'icon-[material-symbols--photo-camera-outline]', texto: 'Con tus fotos, tus precios y el nombre de tu complejo' },
]

// Los textos son cortos a propósito: antes eran tres renglones cada uno sobre
// fondo verde oscuro y no se distinguía dónde terminaba uno y empezaba el otro.
const PUNTOS_COBRO = [
  {
    titulo: 'La plata es tuya',
    texto: 'Va directo a tu cuenta de MercadoPago. Nosotros nunca la tocamos.',
    icon: 'icon-[material-symbols--account-balance-wallet]',
    tono: 'bg-brand-green-50 text-brand-green-600',
  },
  {
    titulo: '0% de comisión',
    texto: 'No nos quedamos con nada de tus reservas. Cobramos el abono y listo.',
    icon: 'icon-[material-symbols--percent]',
    tono: 'bg-brand-purple-50 text-brand-purple-600',
  },
  {
    titulo: 'El turno se reserva mientras paga',
    texto: 'Le queda bloqueado 15 minutos. Si no paga, se libera solo.',
    icon: 'icon-[material-symbols--timer-outline]',
    tono: 'bg-warning-50 text-warning-600',
  },
  {
    titulo: 'El pago al llegar sigue estando',
    texto: 'Si preferís cobrar en el mostrador, lo dejás prendido.',
    icon: 'icon-[material-symbols--storefront-outline]',
    tono: 'bg-brand-lime-100 text-brand-green-700',
  },
]
</script>

<template>
  <div class="min-h-screen bg-brand-sand-500">
    <!-- ---------- Encabezado -------------------------------------------- -->
    <header class="sticky top-0 z-40 border-b border-black/[0.06] bg-brand-sand-500/90 backdrop-blur">
      <div class="mx-auto flex h-[72px] w-full max-w-7xl items-center gap-6 px-4">
        <RouterLink to="/complejos" class="flex shrink-0 items-center gap-2.5 no-underline">
          <img src="/images/logo-lime.svg" alt="CourtIn" class="h-10 w-auto" />
          <p class="text-lg font-normal tracking-tight text-brand-green-900">
            Court<span class="text-brand-lime-500">in</span>
          </p>
        </RouterLink>

        <nav class="ml-4 hidden items-center gap-6 md:flex">
          <a href="#demo" class="text-sm text-stone-600 no-underline transition-colors hover:text-brand-green-900">
            Probar demo
          </a>
          <a href="#precios" class="text-sm text-stone-600 no-underline transition-colors hover:text-brand-green-900">
            Precios
          </a>
          <a href="#agendar" class="text-sm text-stone-600 no-underline transition-colors hover:text-brand-green-900">
            Agendar demo
          </a>
          <RouterLink to="/" class="text-sm text-stone-600 no-underline transition-colors hover:text-brand-green-900">
            Soy jugador
          </RouterLink>
        </nav>

        <div class="ml-auto flex shrink-0 items-center gap-3">
          <RouterLink
            to="/panel/login"
            class="hidden text-sm text-stone-600 no-underline transition-colors hover:text-brand-green-900 sm:block"
          >
            Ingresar
          </RouterLink>
          <RouterLink
            to="/panel/registro"
            class="rounded-full bg-brand-lime-500 px-4 py-2 text-sm font-medium text-brand-green-900 no-underline transition-all hover:bg-brand-lime-600 hover:shadow-md"
          >
            Probar gratis
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- ---------- Hero --------------------------------------------------- -->
    <section class="overflow-hidden px-4 pt-16 pb-24 sm:pt-20">
      <div class="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,44%)] lg:gap-16">
        <div>
          <span
            v-reveal
            class="inline-flex items-center gap-2 rounded-full border border-brand-purple-200 bg-brand-purple-50 px-3 py-1 text-sm text-brand-purple-700"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-brand-purple-500"></span>
            Sistema de gestión para complejos deportivos
          </span>

          <h1
            v-reveal="80"
            class="mt-6 text-4xl leading-[1.12] font-semibold tracking-tight text-brand-green-900 sm:text-5xl"
          >
            Dejá de anotar turnos en el cuaderno
            <span class="text-brand-green-500">y de perder reservas por WhatsApp</span>
          </h1>

          <p v-reveal="160" class="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
            CourtIn te ordena la grilla, te cobra las señas y te dice cuánto facturaste.
            Tus clientes reservan solos desde tu link, a cualquier hora.
          </p>

          <div v-reveal="240" class="mt-9 flex flex-col gap-3 sm:flex-row">
            <RouterLink
              to="/panel/registro"
              class="rounded-full bg-brand-lime-500 px-7 py-3.5 text-center text-base font-medium text-brand-green-900 no-underline transition-all hover:-translate-y-0.5 hover:bg-brand-lime-600 hover:shadow-lg"
            >
              Probar gratis 1 mes
            </RouterLink>
            <a
              href="#demo"
              class="rounded-full border border-black/[0.1] bg-white px-7 py-3.5 text-center text-base text-brand-green-900 no-underline transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              Ver la demo
            </a>
          </div>

          <p v-reveal="320" class="mt-5 text-sm text-stone-500">
            Sin tarjeta · Sin instalación · Cancelás cuando quieras
          </p>
        </div>

        <div v-reveal.right="120" class="mt-6 lg:mt-0">
          <HeroVisual />
        </div>
      </div>
    </section>

    <!-- ---------- Demo interactiva --------------------------------------- -->
    <section id="demo" class="scroll-mt-24 border-t border-black/[0.06] bg-white px-4 py-20">
      <div class="mx-auto w-full max-w-6xl">
        <div v-reveal class="mb-10 max-w-2xl">
          <span class="text-sm font-medium text-brand-purple-600">Probalo sin registrarte</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Probá el sistema ahora mismo, con un complejo de ejemplo
          </h2>
          <p class="mt-4 text-base leading-relaxed text-stone-600">
            Este es el panel de verdad. Tocá lo que quieras — no hay nada que romper.
          </p>
        </div>

        <div v-reveal="100">
          <DemoPanel />
        </div>
      </div>
    </section>

    <!-- ---------- Problemas ----------------------------------------------- -->
    <section class="px-4 py-20">
      <div class="mx-auto w-full max-w-6xl">
        <div v-reveal class="mb-12 max-w-2xl">
          <span class="text-sm font-medium text-brand-purple-600">Lo que se resuelve</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Cuatro problemas que ya no vas a tener
          </h2>
          <p class="mt-4 text-base leading-relaxed text-stone-600">
            Ninguno es grave por sí solo. Juntos son la razón por la que administrar el
            complejo te come el día. Tocá cada uno para ver cómo se ve resuelto.
          </p>
        </div>

        <div v-reveal="80">
          <ProblemasSwitcher />
        </div>
      </div>
    </section>

    <!-- ---------- Link público -------------------------------------------- -->
    <section class="border-t border-black/[0.06] bg-white px-4 py-20">
      <div
        class="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div v-reveal.left>
          <span class="text-sm font-medium text-brand-purple-600">Tu link de reservas</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Tus clientes reservan solos,
            <span class="text-brand-green-500">sin escribirte</span>
          </h2>
          <p class="mt-5 max-w-lg text-lg leading-relaxed text-stone-600">
            Cada complejo tiene su propia página. La pegás en tu Instagram, en el estado de
            WhatsApp o en Google, y el que quiere jugar elige día, cancha y horario. Vos te
            enterás con el turno ya cargado en la grilla.
          </p>

          <div
            class="mt-6 inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-brand-purple-200 bg-brand-purple-50 px-4 py-2.5"
          >
            <i class="icon-[material-symbols--link] shrink-0 text-sm text-brand-purple-500"></i>
            <span class="font-secondary truncate text-sm text-stone-600">
              courtinapp.com/club/<span class="font-bold text-brand-purple-800">tu-complejo</span>
            </span>
          </div>

          <ul class="mt-8 space-y-3.5">
            <li
              v-for="(v, i) in VENTAJAS_LINK"
              :key="v.texto"
              v-reveal="100 + i * 90"
              class="flex items-start gap-3"
            >
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-green-50 text-brand-green-500"
              >
                <i :class="v.icon" class="text-base"></i>
              </span>
              <span class="text-[15px] leading-relaxed text-stone-600">{{ v.texto }}</span>
            </li>
          </ul>
        </div>

        <div v-reveal.right="120">
          <PhoneMockup />
        </div>
      </div>
    </section>

    <!-- ---------- Cobros --------------------------------------------------- -->
    <!-- Verde clarito y no el verde oscuro de antes: sobre el oscuro los cuatro
         puntos se empastaban entre sí y con el fondo. Acá cada uno es una
         tarjeta blanca, que es lo que los separa de verdad. -->
    <section class="px-4 py-20">
      <div
        v-reveal
        class="mx-auto w-full max-w-6xl rounded-3xl border border-brand-green-100 bg-brand-green-50 px-6 py-14 sm:px-12"
      >
        <div class="max-w-2xl">
          <span class="text-sm font-medium text-brand-purple-600">Cobros online</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Cobrá la seña antes de que lleguen
          </h2>
          <p class="mt-4 text-lg leading-relaxed text-stone-600">
            El que no vino y no avisó te costó un turno vacío. Con la seña cobrada, o viene
            o al menos no perdiste el día.
          </p>
        </div>

        <div class="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <ul class="grid gap-4 sm:grid-cols-2">
            <li
              v-for="(p, i) in PUNTOS_COBRO"
              :key="p.titulo"
              v-reveal="80 + i * 80"
              class="rounded-2xl border border-black/[0.05] bg-white p-5 transition-transform duration-300 hover:-translate-y-1"
            >
              <span
                class="flex h-9 w-9 items-center justify-center rounded-xl"
                :class="p.tono"
              >
                <i :class="p.icon" class="text-lg"></i>
              </span>
              <p class="mt-3.5 text-base font-medium text-brand-green-900">{{ p.titulo }}</p>
              <p class="mt-1 text-sm leading-relaxed text-stone-600">{{ p.texto }}</p>
            </li>
          </ul>

          <div v-reveal.right="120">
            <SenaSimulador />
          </div>
        </div>
      </div>
    </section>

    <!-- ---------- Precios --------------------------------------------------- -->
    <section id="precios" class="scroll-mt-24 border-t border-black/[0.06] bg-white px-4 py-20">
      <div class="mx-auto w-full max-w-6xl">
        <div v-reveal class="mb-10 max-w-2xl">
          <span class="text-sm font-medium text-brand-purple-600">Precios</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Un precio por tamaño de complejo
          </h2>
          <p class="mt-4 text-base leading-relaxed text-stone-600">
            Todas nuestras funcionalidades son accesibles sin importar el plan que elijas.
          </p>
        </div>

        <PricingPlans />
      </div>
    </section>

    <!-- ---------- Preguntas -------------------------------------------------- -->
    <section class="px-4 py-20">
      <div class="mx-auto flex flex-col w-full max-w-6xl gap-10">
        <div v-reveal.left class="lg:top-28 lg:self-start">
          <span class="text-sm font-medium text-brand-purple-600">Preguntas</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Lo que todos preguntan
          </h2>
          <p class="mt-4 text-base leading-relaxed text-stone-600">
            ¿Te quedó otra duda?
            <a
              href="mailto:courtinapp@gmail.com"
              class="font-medium text-brand-purple-600 underline underline-offset-4 transition-colors hover:text-brand-purple-700"
            >Escribinos</a>
            y te la sacamos.
          </p>
        </div>

        <div v-reveal="80">
          <FaqList />
        </div>
      </div>
    </section>

    <!-- ---------- Agendar demo ----------------------------------------------- -->
    <!--
      Va justo después de precios a propósito: es el momento en que aparece la
      duda ("¿esto me sirve a mí?"), y la respuesta acá no es otro botón de
      registro sino hablar con alguien. El alta por cuenta propia sigue viva en
      el cierre, para quien ya se decidió.
    -->
    <section id="agendar" class="scroll-mt-24 border-t border-black/[0.06] px-4 py-20">
      <div class="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-16">
        <div v-reveal.left class="lg:top-28 lg:self-start">
          <span class="text-sm font-medium text-brand-purple-600">Demo</span>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-brand-green-900 sm:text-4xl">
            Te lo mostramos funcionando
          </h2>
          <p class="mt-4 text-base leading-relaxed text-stone-600">
            Una llamada de 20 minutos con el sistema andando: la grilla de turnos, la caja del
            día y el link público. Hacemos una reserva de punta a punta y vos preguntás lo que
            quieras sobre tu caso.
          </p>
        </div>

        <div v-reveal="80">
          <DemoRequestForm />
        </div>
      </div>
    </section>

    <!-- ---------- Cierre -------------------------------------------------- -->
    <section class="px-4 pb-20">
      <div
        v-reveal
        class="mx-auto grid w-full max-w-6xl items-center gap-10 rounded-3xl bg-brand-green-800 px-6 py-14 sm:px-12 lg:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div>
          <h2 class="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Probalo con tus canchas
          </h2>
          <p class="mt-4 max-w-lg text-base leading-relaxed text-white/70">
            Un mes gratis, con todas las funciones y sin tarjeta. Cargás tus canchas y tus
            horarios, y ya tenés tu link para empezar a compartir.
          </p>
        </div>

        <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center lg:justify-self-end">
          <RouterLink
            to="/panel/registro"
            class="rounded-full bg-brand-lime-500 px-8 py-3.5 text-base font-medium text-brand-green-900 no-underline transition-all hover:-translate-y-0.5 hover:bg-brand-lime-600 hover:shadow-lg"
          >
            Crear mi cuenta
          </RouterLink>
          <a
            href="#agendar"
            class="rounded-full border border-white/25 px-8 py-3.5 text-base font-medium text-white no-underline transition-colors hover:bg-white/10"
          >
            Agendar una demo
          </a>
        </div>
      </div>
    </section>

    <!-- ---------- Pie ----------------------------------------------------- -->
    <footer class="border-t border-black/[0.06]">
      <div
        class="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-center gap-2.5">
          <img src="/images/logo-lime.svg" alt="" class="h-8 w-auto" />
          <span class="text-sm font-medium text-brand-green-900">
            Court<span class="text-brand-lime-500">In</span>
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-6 text-sm text-stone-500">
          <a href="#precios" class="text-stone-500 no-underline transition-colors hover:text-brand-green-900">Precios</a>
          <a href="#agendar" class="text-stone-500 no-underline transition-colors hover:text-brand-green-900">Agendar demo</a>
          <RouterLink to="/" class="text-stone-500 no-underline transition-colors hover:text-brand-green-900">Buscar canchas</RouterLink>
          <RouterLink to="/panel/login" class="text-stone-500 no-underline transition-colors hover:text-brand-green-900">Ingresar</RouterLink>
        </div>
        <p class="text-xs text-stone-400">© {{ new Date().getFullYear() }} CourtIn</p>
      </div>
    </footer>
  </div>
</template>
