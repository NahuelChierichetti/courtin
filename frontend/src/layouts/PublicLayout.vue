<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const { isAuthenticated, user } = useAuth()

const isExplorar = computed(() => route.name === 'public-buscar' || route.name === 'public-club')

const initials = computed(() => {
  const n = user.value?.nombre
  if (!n) return ''
  return n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-slate-50">
    <!-- Top bar -->
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div class="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div class="flex items-center gap-7">
          <RouterLink :to="{ name: 'public-buscar' }" class="flex items-center gap-2 no-underline">
            <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primitive-orange-500">
              <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span class="text-lg font-bold text-primitive-dark-500">CourtIn</span>
          </RouterLink>

          <nav class="hidden items-center gap-1 sm:flex">
            <RouterLink
              :to="{ name: 'public-buscar' }"
              class="rounded-lg px-3 py-1.5 text-sm font-medium no-underline transition-colors"
              :class="isExplorar ? 'bg-primitive-dark-500 text-white' : 'text-slate-600 hover:bg-slate-50'"
            >
              Explorar
            </RouterLink>
            <RouterLink
              :to="isAuthenticated ? '/dashboard' : '/login'"
              class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 no-underline transition-colors hover:bg-slate-50"
            >
              Mis reservas
            </RouterLink>
            <span class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400">Cómo funciona</span>
          </nav>
        </div>

        <div class="flex items-center gap-3">
          <RouterLink
            v-if="isAuthenticated"
            to="/dashboard"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-primitive-orange-100 text-xs font-bold text-primitive-orange-600 no-underline"
          >
            {{ initials }}
          </RouterLink>
          <RouterLink
            v-else
            to="/login"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 no-underline transition-colors hover:bg-slate-50"
          >
            Ingresar
          </RouterLink>
        </div>
      </div>
    </header>

    <!-- Page content -->
    <main class="flex-1">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="mt-10 bg-primitive-dark-500">
      <div class="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4">
        <div class="col-span-2 sm:col-span-1">
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primitive-orange-500">
              <svg class="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <span class="text-base font-bold text-white">CourtIn</span>
          </div>
          <p class="mt-3 text-xs leading-relaxed text-primitive-gray-600">
            Reservá tu cancha de pádel, tenis o fútbol en segundos.
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-primitive-gray-600 uppercase">Jugadores</p>
          <ul class="mt-3 space-y-2 text-sm text-slate-300">
            <li><RouterLink :to="{ name: 'public-buscar' }" class="no-underline text-slate-300 hover:text-white">Explorar complejos</RouterLink></li>
            <li>Cómo funciona</li>
            <li>Ayuda</li>
          </ul>
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-primitive-gray-600 uppercase">Complejos</p>
          <ul class="mt-3 space-y-2 text-sm text-slate-300">
            <li>Sumá tu complejo</li>
            <li><RouterLink to="/login" class="no-underline text-slate-300 hover:text-white">Panel de gestión</RouterLink></li>
            <li>Precios</li>
          </ul>
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-primitive-gray-600 uppercase">Empresa</p>
          <ul class="mt-3 space-y-2 text-sm text-slate-300">
            <li>Nosotros</li>
            <li>Contacto</li>
            <li>Términos</li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/10">
        <div class="mx-auto w-full max-w-6xl px-4 py-4 text-center text-xs text-primitive-gray-600">
          © {{ new Date().getFullYear() }} CourtIn. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  </div>
</template>
