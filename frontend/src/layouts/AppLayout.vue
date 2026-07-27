<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useSidebar, useSidebarShortcut } from '@/composables/useSidebar'
import clubService from '@/services/clubService'
import notificationService from '@/services/notificationService'

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

const closeSelector = (e) => {
  if (clubSelectorOpen.value) {
    clubSelectorOpen.value = false
  }
}

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
  document.addEventListener('click', closeSelector)
})

onUnmounted(() => {
  document.removeEventListener('click', closeSelector)
})

const handleLogout = () => {
  logout()
  router.push({ name: 'panel-login' })
}

const navItems = [
  { label: 'Dashboard', icon: 'icon-[material-symbols--home]', to: '/panel/dashboard' },
  { label: 'Turnos', icon: 'icon-[material-symbols--calendar-month]', to: '/panel/turnos' },
  { label: 'Clientes', icon: 'icon-[material-symbols--group]', to: '/panel/clientes' },
  { label: 'Control de caja', icon: 'icon-[material-symbols--account-balance-wallet]', to: '/panel/caja' },
  { label: 'Canchas', icon: 'icon-[material-symbols--grid-view]', to: '/panel/canchas' },
  { label: 'Horarios', icon: 'icon-[material-symbols--schedule]', to: '/panel/horarios' },
  { label: 'Reportes', icon: 'icon-[material-symbols--bar-chart]', to: '/panel/reportes' },
  { label: 'Notificaciones', icon: 'icon-[material-symbols--notifications]', to: '/panel/notificaciones', dot: true },
]

const isActive = (to) => route.path === to || route.path.startsWith(to + '/')

const currentPageTitle = computed(() => {
  const item = navItems.find((i) => isActive(i.to))
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

      <!-- Backoffice link (superadmin only) -->
      <div v-if="isSuperadmin" class="px-3 pb-1">
        <RouterLink
          to="/admin"
          :title="collapsed ? 'Backoffice' : null"
          class="flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-white/70 no-underline transition-colors hover:bg-white/8 hover:text-white"
          :class="collapsed ? 'justify-center px-0' : 'gap-3 px-3'"
        >
          <i class="icon-[material-symbols--shield] text-lg text-white/60"></i>
          <span v-if="!collapsed">Backoffice</span>
        </RouterLink>
      </div>

      <!-- User profile -->
      <div class="border-t border-white/10 p-3">
        <div
          class="flex rounded-xl"
          :class="collapsed ? 'flex-col items-center gap-2 py-2' : 'items-center gap-2.5 px-3 py-2'"
        >
          <div
            :title="collapsed ? userShortName : null"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-lime-500 text-xs font-bold text-brand-green-900"
          >
            {{ userInitials }}
          </div>
          <div v-if="!collapsed" class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white">{{ userShortName }}</p>
            <p class="text-xs text-white/60">Administrador</p>
          </div>
          <RouterLink
            to="/panel/configuracion"
            title="Configuración"
            class="flex h-8 w-8 items-center justify-center rounded-md text-white/60 no-underline transition-colors hover:bg-white/10 hover:text-white"
            :class="{ 'bg-white/10 text-white': isActive('/panel/configuracion') }"
          >
            <i class="icon-[material-symbols--settings] text-sm"></i>
          </RouterLink>
          <button
            title="Cerrar sesión"
            class="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-error-300 cursor-pointer"
            @click="handleLogout"
          >
            <i class="icon-[material-symbols--logout] text-sm"></i>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <header class="flex h-[72px] shrink-0 items-center justify-between border-b border-black/[0.06] bg-brand-sand-500/90 px-6 backdrop-blur print:hidden">
        <div class="flex items-center gap-2.5">
          <!-- Colapsar / expandir sidebar -->
          <button
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white text-stone-500 shadow-sm transition-colors hover:bg-stone-50 hover:text-brand-green-500 cursor-pointer"
            :title="`${collapsed ? 'Expandir' : 'Colapsar'} menú (${shortcutLabel})`"
            :aria-label="collapsed ? 'Expandir menú' : 'Colapsar menú'"
            :aria-keyshortcuts="shortcutAria"
            :aria-expanded="!collapsed"
            @click="toggleSidebar"
          >
            <i
              :class="collapsed ? 'icon-[material-symbols--left-panel-open]' : 'icon-[material-symbols--left-panel-close]'"
              class="text-base"
            ></i>
          </button>

          <!-- Club selector -->
          <div class="relative">
            <button
              class="flex min-w-[220px] items-center gap-2.5 rounded-full border border-black/[0.06] bg-white px-4 py-2 shadow-sm transition-colors hover:bg-stone-50 cursor-pointer"
              @click.stop="clubSelectorOpen = !clubSelectorOpen"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-green-50 text-brand-green-500">
                <i class="icon-[material-symbols--apartment] text-base"></i>
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
                class="flex w-full items-center gap-2 rounded-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-stone-50 cursor-pointer"
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
            class="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white text-stone-500 no-underline shadow-sm transition-colors hover:bg-stone-50"
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
          <RouterLink
            to="/panel/turnos"
            class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-4 py-2.5 text-sm font-semibold text-brand-green-900 no-underline transition-colors hover:bg-brand-lime-600"
          >
            <i class="icon-[material-symbols--add] text-base"></i> Nueva reserva
          </RouterLink>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
        <RouterView />
      </main>
    </div>
  </div>
</template>
