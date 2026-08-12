<script setup>
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useUserNotifications } from '@/composables/useUserNotifications'
import { useFavorites } from '@/composables/useFavorites'
import UserMenu from '@/components/public/UserMenu.vue'

const router = useRouter()
const { isAuthenticated } = useAuth()
const { unreadCount, fetch: fetchNotifications } = useUserNotifications()
const { load: loadFavorites } = useFavorites()

// El layout público es el único punto por el que pasan todas las vistas del
// jugador, así que es donde se siembran los dos estados compartidos. Con
// `immediate` cubre tanto la carga inicial con sesión abierta como el login
// posterior, sin que cada vista tenga que acordarse de pedirlos.
watch(
  isAuthenticated,
  (auth) => {
    if (!auth) return
    fetchNotifications()
    loadFavorites()
  },
  { immediate: true },
)

const q = ref('')

const onSearch = () => {
  router.push({ name: 'public-buscar', query: q.value.trim() ? { q: q.value.trim() } : {} })
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-brand-sand-500">
    <!-- Top bar -->
    <header class="sticky top-0 z-30 border-b border-black/[0.06] bg-brand-sand-500/90 backdrop-blur">
      <div class="mx-auto flex h-[72px] w-full max-w-7xl items-center gap-4 px-4 sm:gap-6">
        <!-- Brand -->
        <RouterLink :to="{ name: 'public-home' }" class="flex shrink-0 items-center gap-2.5 no-underline">
          <img src="/images/logo-green.svg" alt="CourtIn" class="h-10 w-auto" />
          <div class="hidden leading-none sm:block">
            <p class="text-lg font-bold tracking-tight text-ink-500">
              Court<span class="text-brand-green-500">In</span>
            </p>
          </div>
        </RouterLink>

        <!-- Search pill -->
        <form class="relative flex-1" @submit.prevent="onSearch">
          <i class="icon-[material-symbols--search] absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400"></i>
          <input
            v-model="q"
            type="text"
            placeholder="Buscá canchas, deportes o complejos"
            class="h-11 w-full rounded-full border border-black/[0.06] bg-white pl-11 pr-4 text-sm text-ink-500 outline-none transition-shadow placeholder:text-stone-400 focus:ring-2 focus:ring-brand-green-200"
          />
        </form>

        <!-- Actions -->
        <!--
          Con sesión, todo cuelga del menú del avatar y lo que hay adentro
          depende del rol: un jugador no ve accesos al backoffice. Sin sesión,
          una sola puerta de entrada ("Ingresar") para jugadores y complejos por
          igual; después del login, `resolveLanding()` manda a cada uno a lo suyo.
        -->
        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <template v-if="isAuthenticated">
            <RouterLink
              :to="{ name: 'mis-notificaciones' }"
              class="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white text-stone-500 no-underline transition-colors hover:bg-stone-50"
              title="Notificaciones"
            >
              <i class="icon-[material-symbols--notifications-outline] text-base"></i>
              <span
                v-if="unreadCount"
                class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white"
              >
                {{ unreadCount > 9 ? '9+' : unreadCount }}
              </span>
            </RouterLink>
            <UserMenu />
          </template>
          <template v-else>
            <RouterLink
              to="/panel/registro"
              class="hidden text-sm font-medium text-stone-600 no-underline transition-colors hover:text-ink-500 lg:block"
            >
              Sumá tu complejo
            </RouterLink>
            <RouterLink
              to="/login"
              class="rounded-full bg-brand-lime-500 px-4 py-2 text-sm font-semibold text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
            >
              Ingresar
            </RouterLink>
          </template>
        </div>
      </div>
    </header>

    <!-- Page content -->
    <main class="flex-1">
      <RouterView />
    </main>

    <!-- Footer -->
    <footer class="mt-16 bg-brand-green-800">
      <div class="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        <div class="col-span-2 sm:col-span-1">
          <div class="flex items-center gap-2.5">
            <img src="/images/logo-lime.svg" alt="CourtIn" class="h-9 w-auto" />
            <span class="text-base font-bold text-white">Court<span class="text-brand-lime-500">In</span></span>
          </div>
          <p class="mt-3 text-sm leading-relaxed text-white/60">
            Reservá tu cancha de pádel, tenis o fútbol en segundos.
          </p>
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-white/60 uppercase">Jugadores</p>
          <ul class="mt-3 space-y-2 text-sm text-white/80">
            <li><RouterLink :to="{ name: 'public-buscar' }" class="no-underline text-white/80 hover:text-white">Explorar complejos</RouterLink></li>
            <li>Cómo funciona</li>
            <li>Ayuda</li>
          </ul>
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-white/60 uppercase">Complejos</p>
          <ul class="mt-3 space-y-2 text-sm text-white/80">
            <li><RouterLink to="/panel/registro" class="no-underline text-white/80 hover:text-white">Sumá tu complejo</RouterLink></li>
            <li><RouterLink to="/panel/login" class="no-underline text-white/80 hover:text-white">Panel de gestión</RouterLink></li>
            <li>Precios</li>
          </ul>
        </div>
        <div>
          <p class="text-xs font-semibold tracking-wider text-white/60 uppercase">Empresa</p>
          <ul class="mt-3 space-y-2 text-sm text-white/80">
            <li>Nosotros</li>
            <li>Contacto</li>
            <li>Términos</li>
          </ul>
        </div>
      </div>
      <div class="border-t border-white/10">
        <div class="mx-auto w-full max-w-7xl px-4 py-4 text-center text-xs text-white/60">
          © {{ new Date().getFullYear() }} CourtIn. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  </div>
</template>
