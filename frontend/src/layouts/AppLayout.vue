<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useSidebar, useSidebarShortcut } from '@/composables/useSidebar'
import clubService from '@/services/clubService'
import notificationService from '@/services/notificationService'
import VerifyEmailBanner from '@/components/common/VerifyEmailBanner.vue'

const route = useRoute()
const router = useRouter()
const { collapsed, toggleSidebar, shortcutLabel, shortcutAria } = useSidebar()
useSidebarShortcut()
const {
  user,
  logout,
  isSuperadmin,
  currentClubId,
  currentClub,
  memberships,
  superadminClubs,
  setCurrentClubId,
  setSuperadminClubs,
} = useAuth()

const clubSelectorOpen = ref(false)
const userMenuOpen = ref(false)

const availableClubs = computed(() => {
  if (isSuperadmin.value) return superadminClubs.value
  return memberships.value.map((m) => m.club).filter(Boolean)
})

const selectedClubName = computed(() => currentClub.value?.nombre || null)

const fetchClubs = async () => {
  if (!isSuperadmin.value) return
  try {
    const clubs = await clubService.getClubs()
    setSuperadminClubs(clubs)
    if (currentClubId.value) {
      const stillValid = clubs.some((c) => c._id === currentClubId.value)
      if (!stillValid) setCurrentClubId(null)
    }
  } catch (err) {
    console.error('Error fetching clubs:', err)
  }
}

const handleClubChange = (clubId) => {
  setCurrentClubId(clubId)
  clubSelectorOpen.value = false
}

// Un único listener global cierra cualquier menú abierto del header.
const closeMenus = () => {
  clubSelectorOpen.value = false
  userMenuOpen.value = false
}

// Al navegar el dropdown de usuario tiene que cerrarse solo: los RouterLink de
// adentro no disparan el click-outside.
watch(() => route.path, closeMenus)

// --- Notificaciones sin leer (campanita + sidebar) ---
const unreadCount = ref(0)
const fetchUnread = async () => {
  if (!currentClubId.value) {
    unreadCount.value = 0
    return
  }
  try {
    const data = await notificationService.getNotifications(currentClubId.value)
    unreadCount.value = data.unreadCount
  } catch (err) {
    console.error(err)
  }
}
watch(currentClubId, fetchUnread)
// Refresca el contador al navegar (p.ej. después de marcar leídas).
watch(() => route.path, fetchUnread)

onMounted(() => {
  fetchClubs()
  fetchUnread()
  document.addEventListener('click', closeMenus)
})

onUnmounted(() => {
  document.removeEventListener('click', closeMenus)
})

const handleLogout = () => {
  logout()
  router.push({ name: 'panel-login' })
}

// `adminOnly`: sólo para el dueño del complejo. Un empleado no gestiona el
// equipo, y el backend igual le respondería 403.
const ALL_NAV_ITEMS = [
  { label: 'Dashboard', icon: 'icon-[material-symbols--home]', to: '/panel/dashboard' },
  { label: 'Turnos', icon: 'icon-[material-symbols--calendar-month]', to: '/panel/turnos' },
  { label: 'Clientes', icon: 'icon-[material-symbols--group]', to: '/panel/clientes' },
  { label: 'Control de caja', icon: 'icon-[material-symbols--account-balance-wallet]', to: '/panel/caja' },
  { label: 'Canchas', icon: 'icon-[material-symbols--grid-view]', to: '/panel/canchas' },
  { label: 'Horarios', icon: 'icon-[material-symbols--schedule]', to: '/panel/horarios' },
  { label: 'Reportes', icon: 'icon-[material-symbols--bar-chart]', to: '/panel/reportes' },
  { label: 'Equipo', icon: 'icon-[material-symbols--badge-outline]', to: '/panel/equipo', adminOnly: true },
  { label: 'Suscripción', icon: 'icon-[material-symbols--credit-card-outline]', to: '/panel/suscripcion', adminOnly: true },
  { label: 'Notificaciones', icon: 'icon-[material-symbols--notifications]', to: '/panel/notificaciones', dot: true },
]

// El rol depende del club activo: la misma persona puede ser dueña de uno y
// empleada de otro.
const isClubAdmin = computed(() => {
  if (isSuperadmin.value) return true
  return memberships.value.some(
    (m) =>
      (m.club?._id || m.club) === currentClubId.value &&
      m.role === 'tenant_admin' &&
      m.estado === 'activo',
  )
})

const navItems = computed(() => ALL_NAV_ITEMS.filter((i) => !i.adminOnly || isClubAdmin.value))

const isActive = (to) => route.path === to || route.path.startsWith(to + '/')

const currentPageTitle = computed(() => {
  // Se busca sobre la lista completa: el título tiene que resolverse igual en
  // una ruta que no esté en el menú visible.
  const item = ALL_NAV_ITEMS.find((i) => isActive(i.to))
  return item?.label || ''
})

const userInitials = computed(() => {
  if (!user.value?.nombre) return '??'
  const parts = user.value.nombre.split(' ')
  return parts
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
})

const userShortName = computed(() => {
  if (!user.value?.nombre) return ''
  const parts = user.value.nombre.split(' ')
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`
  return parts[0]
})

const userRoleLabel = computed(() => (isClubAdmin.value ? 'Administrador' : 'Empleado'))
</script>

<template>
  <div class="flex h-screen bg-brand-sand-500 print:block print:h-auto">
    <!-- Sidebar -->
    <aside
      class="flex shrink-0 flex-col bg-brand-green-500 transition-[width] duration-200 ease-out print:hidden"
      :class="collapsed ? 'w-[76px]' : 'w-64'"
    >
      <!-- Logo -->
      <div class="flex items-center pt-5 pb-4" :class="collapsed ? 'justify-center px-2' : 'gap-2.5 px-5'">
        <img src="/images/logo-lime.svg" alt="CourtIn" class="h-12 w-auto" />
        <div v-if="!collapsed" class="leading-none">
          <p class="text-2xl font-normal text-white">
            Court<span class="text-brand-lime-500">In</span>
          </p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :title="collapsed ? item.label : null"
          class="group relative flex items-center rounded-xl py-2.5 text-sm font-medium no-underline transition-colors"
          :class="[
            isActive(item.to)
              ? 'bg-white/12 text-white'
              : 'text-white/70 hover:bg-white/8 hover:text-white',
            collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          ]"
        >
          <i
            :class="[
              item.icon,
              isActive(item.to) ? 'text-brand-lime-500' : 'text-white/60 group-hover:text-white',
            ]"
            class="text-lg"
          ></i>
          <span v-if="!collapsed" class="flex-1">{{ item.label }}</span>
          <template v-if="item.to === '/panel/notificaciones' && unreadCount">
            <!-- Colapsado no hay lugar para el contador: sólo un punto sobre el ícono. -->
            <span
              v-if="collapsed"
              class="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-error-500 ring-2 ring-brand-green-500"
            ></span>
            <span
              v-else
              class="flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1.5 text-[10px] font-bold text-white"
            >
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </template>
        </RouterLink>
      </nav>

      <!-- Colapsar / expandir sidebar -->
      <div class="border-t border-white/10 p-3">
        <button
          class="flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white cursor-pointer"
          :class="collapsed ? 'justify-center px-0' : 'gap-3 px-3'"
          :title="`${collapsed ? 'Expandir' : 'Colapsar'} menú (${shortcutLabel})`"
          :aria-label="collapsed ? 'Expandir menú' : 'Colapsar menú'"
          :aria-keyshortcuts="shortcutAria"
          :aria-expanded="!collapsed"
          @click="toggleSidebar"
        >
          <i
            :class="collapsed ? 'icon-[lucide--panel-left-open]' : 'icon-[lucide--panel-left-close]'"
            class="text-lg"
          ></i>
          <span v-if="!collapsed">Colapsar menú</span>
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <header class="flex h-[72px] shrink-0 items-center justify-between border-b border-black/[0.06] bg-white px-6 print:hidden">
        <div class="flex items-center gap-2.5">
          <!-- Club selector -->
          <div class="relative">
            <button
              class="flex min-w-[220px] items-center gap-2.5 rounded-xl border border-black/[0.06] bg-white px-4 py-2 transition-colors hover:bg-stone-50 cursor-pointer"
              @click.stop="clubSelectorOpen = !clubSelectorOpen"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green-50 text-brand-green-500">
                <i class="icon-[lucide--flag-triangle-right] text-base"></i>
              </span>
              <div class="min-w-0 flex-1 text-left">
                <p class="text-[10px] font-semibold tracking-wider text-brand-green-500 uppercase">Complejo</p>
                <p class="truncate text-sm font-semibold text-ink-500">
                  {{ selectedClubName || 'Seleccionar club' }}
                </p>
              </div>
              <i class="icon-[material-symbols--keyboard-arrow-down] text-sm text-stone-400 transition-transform" :class="{ 'rotate-180': clubSelectorOpen }"></i>
            </button>

            <!-- Dropdown -->
            <div
              v-if="clubSelectorOpen"
              class="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg"
            >
              <div v-if="availableClubs.length === 0" class="px-4 py-3 text-sm text-stone-500">
                No hay clubes disponibles
              </div>
              <button
                v-for="club in availableClubs"
                :key="club._id"
                class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-stone-50 cursor-pointer"
                :class="club._id === currentClubId ? 'bg-brand-green-50 font-medium text-brand-green-700' : 'text-stone-700'"
                @click.stop="handleClubChange(club._id)"
              >
                <span class="flex-1 truncate">{{ club.nombre }}</span>
                <i v-if="club._id === currentClubId" class="icon-[material-symbols--check] text-sm text-brand-green-500"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <RouterLink
            to="/panel/notificaciones"
            class="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white text-stone-500 no-underline transition-colors hover:bg-stone-50"
            title="Notificaciones"
          >
            <i class="icon-[material-symbols--notifications] text-base"></i>
            <span
              v-if="unreadCount"
              class="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-bold text-white"
            >
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </RouterLink>

          <!-- Usuario -->
          <div class="relative">
            <button
              class="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors hover:bg-stone-50 cursor-pointer"
              :aria-expanded="userMenuOpen"
              aria-haspopup="menu"
              @click.stop="userMenuOpen = !userMenuOpen"
            >
              <span
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-lime-500 text-xs font-bold text-brand-green-900"
              >
                {{ userInitials }}
              </span>
              <span class="hidden min-w-0 text-left sm:block">
                <span class="block truncate text-sm font-semibold text-ink-500">{{ userShortName }}</span>
                <span class="block text-xs text-stone-500">{{ userRoleLabel }}</span>
              </span>
              <i
                class="icon-[lucide--chevron-down] text-sm text-stone-400 transition-transform"
                :class="{ 'rotate-180': userMenuOpen }"
              ></i>
            </button>

            <!-- Dropdown -->
            <div
              v-if="userMenuOpen"
              class="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg"
            >
              <RouterLink
                to="/panel/configuracion"
                class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-stone-700 no-underline transition-colors hover:bg-stone-50"
                :class="{ 'bg-brand-green-50 font-medium text-brand-green-700': isActive('/panel/configuracion') }"
              >
                <i class="icon-[lucide--settings] text-base text-stone-400"></i>
                Configuración
              </RouterLink>
              <RouterLink
                v-if="isSuperadmin"
                to="/admin"
                class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-stone-700 no-underline transition-colors hover:bg-stone-50"
              >
                <i class="icon-[lucide--shield] text-base text-stone-400"></i>
                Backoffice
              </RouterLink>
              <div class="my-1 h-px bg-black/[0.06]"></div>
              <button
                class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-stone-700 transition-colors hover:bg-error-50 hover:text-error-600 cursor-pointer"
                @click="handleLogout"
              >
                <i class="icon-[lucide--log-out] text-base text-stone-400"></i>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
        <VerifyEmailBanner class="mb-6 print:hidden" />
        <RouterView />
      </main>
    </div>
  </div>
</template>
