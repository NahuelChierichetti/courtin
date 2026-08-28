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
          <img src="/images/logo-lime.svg" alt="CourtIn" class="h-10 w-auto" />
          <div class="hidden leading-none sm:block">
            <p class="text-lg font-normal tracking-tight text-brand-green-900">
              Court<span class="text-brand-lime-500">in</span>
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
            class="h-11 w-full rounded-full border border-black/[0.06] bg-white pl-11 pr-4 text-sm text-brand-green-900 outline-none transition-shadow placeholder:text-stone-400 focus:ring-2 focus:ring-brand-green-200"
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
            <!-- Va a la página de venta, no al formulario: quien todavía no
                 sabe qué es CourtIn no arranca por el alta. -->
            <RouterLink
              to="/complejos"
              class="hidden text-sm font-medium text-stone-600 no-underline transition-colors hover:text-brand-green-900 lg:block"
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

    <!--
      Footer: cierre en una sola fila de enlaces en vez de columnas por
      categoría. Con esta cantidad de destinos reales las columnas quedaban
      medio vacías y hubo que rellenarlas con ítems que no llevaban a ningún
      lado ("Cómo funciona", "Ayuda"): sin página detrás, era texto disfrazado
      de link. Todo lo que quedó apunta a algo que existe.
    -->
    <footer class="mt-16 bg-brand-green-900">
      <div class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <RouterLink :to="{ name: 'public-home' }" class="flex shrink-0 items-center gap-2.5 no-underline">
          <img src="/images/logo-lime.svg" alt="" class="h-9 w-auto" />
          <span class="text-lg font-normal tracking-tight text-white">
            Court<span class="text-brand-lime-500">in</span>
          </span>
        </RouterLink>

        <nav class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/70">
          <RouterLink :to="{ name: 'public-buscar' }" class="no-underline text-white/70 transition-colors hover:text-white">
            Buscar canchas
          </RouterLink>
          <!-- Sólo con sesión: la ruta está detrás del guard y sin login manda
               al formulario, que es un callejón raro viniendo del pie. -->
          <RouterLink v-if="isAuthenticated" :to="{ name: 'mis-reservas' }" class="no-underline text-white/70 transition-colors hover:text-white">
            Mis reservas
          </RouterLink>
          <RouterLink to="/complejos" class="no-underline text-white/70 transition-colors hover:text-white">
            Sumá tu complejo
          </RouterLink>
          <RouterLink to="/complejos#precios" class="no-underline text-white/70 transition-colors hover:text-white">
            Precios
          </RouterLink>
          <RouterLink to="/panel/login" class="no-underline text-white/70 transition-colors hover:text-white">
            Panel de gestión
          </RouterLink>
          <a href="mailto:courtinapp@gmail.com" class="no-underline text-white/70 transition-colors hover:text-white">
            Contacto
          </a>
        </nav>
      </div>

      <div class="border-t border-white/10">
        <div class="mx-auto flex w-full max-w-7xl flex-col items-center gap-1 px-4 py-4 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>© {{ new Date().getFullYear() }} CourtIn. Todos los derechos reservados.</p>
          <p>Reservá tu cancha de pádel, tenis o fútbol en segundos.</p>
        </div>
      </div>
    </footer>
  </div>
</template>
