<script setup>
import { ref, computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { isAuthenticated, user } = useAuth()

const q = ref('')

const initials = computed(() => {
  const n = user.value?.nombre
  if (!n) return ''
  return n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')
})

const onSearch = () => {
  router.push({ name: 'public-buscar', query: q.value.trim() ? { q: q.value.trim() } : {} })
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#faf5ef]">
    <!-- Top bar -->
    <header class="sticky top-0 z-30 border-b border-black/[0.06] bg-[#faf5ef]/90 backdrop-blur">
      <div class="mx-auto flex h-[72px] w-full max-w-7xl items-center gap-4 px-4 sm:gap-6">
        <!-- Brand -->
        <RouterLink :to="{ name: 'public-home' }" class="flex shrink-0 items-center gap-2.5 no-underline">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primitive-orange-500">
            <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4.5 3.5 19h17L12 4.5Zm0 4.8 3.1 5.3-1.6.9-1.5-1-1.5 1-1.6-.9L12 9.3Z" />
            </svg>
          </div>
          <div class="hidden leading-none sm:block">
            <p class="text-lg font-bold tracking-tight text-primitive-dark-500">
              Court<span class="text-primitive-orange-500">In</span>
            </p>
            <p class="mt-0.5 text-[10px] font-semibold tracking-[0.22em] text-slate-400">SPORT COMPLEX</p>
          </div>
        </RouterLink>

        <!-- Search pill -->
        <form class="relative flex-1" @submit.prevent="onSearch">
          <i class="icon-[material-symbols--search] absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400"></i>
          <input
            v-model="q"
            type="text"
            placeholder="Buscá canchas, deportes o complejos"
            class="h-11 w-full rounded-full border border-black/[0.06] bg-white pl-11 pr-4 text-sm text-primitive-dark-500 outline-none transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-primitive-orange-200"
          />
        </form>

        <!-- Actions -->
        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <RouterLink
            to="/panel"
            class="hidden items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-sm font-semibold text-primitive-dark-500 no-underline transition-colors hover:bg-slate-50 sm:flex"
          >
            <i class="icon-[material-symbols--grid-view] text-xs text-primitive-orange-500"></i> Panel
          </RouterLink>
          <RouterLink
            to="/mis-reservas"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white text-slate-500 no-underline transition-colors hover:bg-slate-50"
            title="Mis reservas"
          >
            <i class="icon-[material-symbols--calendar-month] text-sm"></i>
          </RouterLink>

          <RouterLink
            v-if="isAuthenticated"
            to="/mis-reservas"
            class="flex h-10 items-center gap-2 rounded-full bg-white pl-1 pr-3 no-underline shadow-sm ring-1 ring-black/[0.06]"
          >
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primitive-orange-500 text-xs font-bold text-white">
              {{ initials }}
            </span>
            <span class="hidden text-sm font-semibold text-primitive-dark-500 sm:block">{{ user?.nombre?.split(' ')[0] }}</span>
          </RouterLink>
          <RouterLink
            v-else
            to="/login"
            class="rounded-full bg-primitive-orange-500 px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-primitive-orange-600"
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
    <footer class="mt-16 bg-primitive-dark-500">
      <div class="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        <div class="col-span-2 sm:col-span-1">
          <div class="flex items-center gap-2.5">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primitive-orange-500">
              <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5 3.5 19h17L12 4.5Z" />
              </svg>
            </div>
            <span class="text-base font-bold text-white">Court<span class="text-primitive-orange-500">In</span></span>
          </div>
          <p class="mt-3 text-sm leading-relaxed text-primitive-gray-600">
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
            <li><RouterLink to="/panel/registro" class="no-underline text-slate-300 hover:text-white">Sumá tu complejo</RouterLink></li>
            <li><RouterLink to="/panel/login" class="no-underline text-slate-300 hover:text-white">Panel de gestión</RouterLink></li>
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
        <div class="mx-auto w-full max-w-7xl px-4 py-4 text-center text-xs text-primitive-gray-600">
          © {{ new Date().getFullYear() }} CourtIn. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  </div>
</template>
