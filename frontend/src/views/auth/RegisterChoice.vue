<script setup>
import { RouterLink } from 'vue-router'

// Bifurcación del registro.
//
// Antes las dos altas convivían en la misma pantalla con un link chiquito al
// pie, y se prestaba a la peor confusión posible: el dueño de un complejo
// creándose una cuenta de jugador. Son dos productos distintos (uno reserva, el
// otro cobra) y ahora se eligen antes de escribir un solo dato.
const opciones = [
  {
    to: '/registro/jugador',
    icon: 'icon-[material-symbols--sports-tennis]',
    titulo: 'Soy jugador',
    bajada: 'Reservá canchas, guardá tus complejos favoritos y llevá tus partidos en un solo lugar.',
    puntos: ['Reservás online en segundos', 'Ves tus turnos y los cancelás', 'Es gratis'],
    cta: 'Crear mi cuenta',
    destacado: false,
  },
  {
    to: '/panel/registro',
    icon: 'icon-[material-symbols--stadium-outline]',
    titulo: 'Tengo un complejo',
    bajada: 'Gestioná canchas, turnos, clientes y cobros, y recibí reservas online las 24 horas.',
    puntos: ['30 días de prueba gratis', 'Agenda, caja y reportes', 'Cobrás con MercadoPago'],
    cta: 'Registrar mi complejo',
    destacado: true,
  },
]
</script>

<template>
  <section class="min-h-screen bg-brand-sand-500 lg:grid lg:grid-cols-2">
    <!-- Columna selección -->
    <div class="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16">
      <RouterLink :to="{ name: 'public-home' }" class="inline-flex items-center gap-2.5 no-underline">
        <img src="/images/logo-lime.svg" alt="CourtIn" class="h-10 w-auto" />
        <div class="leading-none">
          <p class="text-lg font-normal tracking-tight text-brand-green-900">
            Court<span class="text-brand-lime-500">in</span>
          </p>
        </div>
      </RouterLink>

      <div class="flex flex-1 flex-col justify-center py-10">
        <div class="mx-auto w-full max-w-md">
          <h1 class="text-3xl font-bold text-brand-green-900 sm:text-4xl">¿Cómo querés usar CourtIn?</h1>
          <p class="mt-3 text-sm leading-relaxed text-stone-500">
            Elegí el tipo de cuenta que necesitás. Podés cambiar de idea más adelante.
          </p>

          <div class="mt-8 space-y-4">
            <RouterLink
              v-for="opcion in opciones"
              :key="opcion.to"
              :to="opcion.to"
              class="group block rounded-2xl border bg-white p-6 no-underline transition-all hover:-translate-y-0.5 hover:shadow-lg"
              :class="
                opcion.destacado
                  ? 'border-brand-green-200 shadow-sm'
                  : 'border-black/[0.08] shadow-sm'
              "
            >
              <div class="flex items-start gap-4">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors"
                  :class="
                    opcion.destacado
                      ? 'bg-brand-green-500 text-white'
                      : 'bg-brand-lime-100 text-brand-green-700'
                  "
                >
                  <i :class="opcion.icon" class="text-2xl"></i>
                </div>

                <div class="min-w-0 flex-1">
                  <h2 class="text-lg font-bold text-brand-green-900">{{ opcion.titulo }}</h2>
                  <p class="mt-1.5 text-sm leading-relaxed text-stone-500">{{ opcion.bajada }}</p>

                  <ul class="mt-3 space-y-1.5">
                    <li
                      v-for="punto in opcion.puntos"
                      :key="punto"
                      class="flex items-center gap-2 text-xs text-stone-500"
                    >
                      <i class="icon-[material-symbols--check-circle] shrink-0 text-sm text-brand-green-500"></i>
                      {{ punto }}
                    </li>
                  </ul>

                  <p class="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-green-600">
                    {{ opcion.cta }}
                    <i class="icon-[material-symbols--arrow-forward] text-base transition-transform group-hover:translate-x-1"></i>
                  </p>
                </div>
              </div>
            </RouterLink>
          </div>

          <p class="mt-8 text-center text-sm text-stone-500">
            ¿Ya tenés cuenta?
            <RouterLink class="font-semibold text-brand-green-500 hover:underline" to="/login">
              Ingresá acá
            </RouterLink>
          </p>
        </div>
      </div>
    </div>

    <!-- Columna branding -->
    <div class="relative hidden overflow-hidden bg-brand-green-700 lg:block">
      <img src="/images/banner-web.jpg" alt="" aria-hidden="true" class="absolute inset-0 h-full w-full object-cover object-[72%_50%] mix-blend-luminosity" />
      <div class="absolute inset-0 bg-gradient-to-t from-brand-green-900 via-brand-green-900/40 to-brand-green-900/10"></div>

      <div class="relative flex h-full flex-col justify-end p-12">
        <h2 class="text-4xl font-bold leading-tight text-white">
          Todo el deporte,<br />en <span class="text-brand-lime-500">un solo lugar.</span>
        </h2>
        <p class="mt-4 text-sm font-semibold tracking-[0.15em] text-white/70 uppercase">Gestioná · Reservá · Jugá</p>
        <p class="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          Jugadores que reservan en segundos y complejos que llenan su agenda. De los dos lados del
          mostrador.
        </p>
      </div>
    </div>
  </section>
</template>
