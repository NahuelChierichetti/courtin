<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import clubService from '@/services/clubService'

const route = useRoute()
const router = useRouter()
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

onMounted(() => {
  fetchClubs()
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
  <div class="flex h-screen bg-[#faf5ef]">
    <!-- Sidebar -->
    <aside class="flex w-64 shrink-0 flex-col bg-primitive-dark-500">
      <!-- Logo -->
      <div class="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primitive-orange-500">
          <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5 3.5 19h17L12 4.5Zm0 4.8 3.1 5.3-1.6.9-1.5-1-1.5 1-1.6-.9L12 9.3Z" />
          </svg>
        </div>
        <div class="leading-none">
          <p class="text-lg font-bold tracking-tight text-white">
            Court<span class="text-primitive-orange-500">In</span>
          </p>
          <p class="mt-0.5 text-[10px] font-semibold tracking-[0.22em] text-slate-500">SPORT COMPLEX</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors"
          :class="
            isActive(item.to)
              ? 'bg-white/10 text-white'
              : 'text-primitive-gray-600 hover:bg-white/5 hover:text-white'
          "
        >
          <i
            :class="[
              item.icon,
              isActive(item.to) ? 'text-primitive-orange-400' : 'text-primitive-gray-600 group-hover:text-white',
            ]"
            class="text-lg"
          ></i>
          <span class="flex-1">{{ item.label }}</span>
          <span v-if="item.dot" class="h-2 w-2 rounded-full bg-error-500"></span>
        </RouterLink>
      </nav>

      <!-- Backoffice link (superadmin only) -->
      <div v-if="isSuperadmin" class="px-3 pb-1">
        <RouterLink
          to="/admin"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-neutral-400 no-underline transition-colors hover:bg-white/5 hover:text-white"
        >
          <i class="icon-[material-symbols--shield] text-lg text-slate-500"></i>
          <span>Backoffice</span>
        </RouterLink>
      </div>

      <!-- User profile -->
      <div class="border-t border-white/10 p-3">
        <div class="flex items-center gap-2.5 rounded-xl px-3 py-2">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primitive-orange-500 text-xs font-bold text-white"
          >
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white">{{ userShortName }}</p>
            <p class="text-xs text-slate-500">Administrador</p>
          </div>
          <RouterLink
            to="/panel/configuracion"
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 no-underline transition-colors hover:bg-white/10 hover:text-slate-300"
            :class="{ 'bg-white/10 text-white': isActive('/panel/configuracion') }"
          >
            <i class="icon-[material-symbols--settings] text-sm"></i>
          </RouterLink>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white/10 hover:text-error-400 cursor-pointer"
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
      <header class="flex h-[72px] shrink-0 items-center justify-between border-b border-black/[0.06] bg-[#faf5ef]/90 px-6 backdrop-blur">
        <div class="flex items-center gap-2">
          <!-- Club selector -->
          <div class="relative">
            <button
              class="flex min-w-[220px] items-center gap-2.5 rounded-full border border-black/[0.06] bg-white px-4 py-2 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
              @click.stop="clubSelectorOpen = !clubSelectorOpen"
            >
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primitive-orange-50 text-primitive-orange-500">
                <i class="icon-[material-symbols--apartment] text-base"></i>
              </span>
              <div class="min-w-0 flex-1 text-left">
                <p class="text-[10px] font-semibold tracking-wider text-primitive-orange-500 uppercase">Complejo</p>
                <p class="truncate text-sm font-semibold text-primitive-dark-500">
                  {{ selectedClubName || 'Seleccionar club' }}
                </p>
              </div>
              <i class="icon-[material-symbols--keyboard-arrow-down] text-sm text-slate-400 transition-transform" :class="{ 'rotate-180': clubSelectorOpen }"></i>
            </button>

            <!-- Dropdown -->
            <div
              v-if="clubSelectorOpen"
              class="absolute left-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg"
            >
              <div v-if="availableClubs.length === 0" class="px-4 py-3 text-sm text-slate-500">
                No hay clubes disponibles
              </div>
              <button
                v-for="club in availableClubs"
                :key="club._id"
                class="flex w-full items-center gap-2 rounded-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 cursor-pointer"
                :class="club._id === currentClubId ? 'bg-primitive-orange-50 font-medium text-primitive-orange-700' : 'text-slate-700'"
                @click.stop="handleClubChange(club._id)"
              >
                <span class="flex-1 truncate">{{ club.nombre }}</span>
                <i v-if="club._id === currentClubId" class="icon-[material-symbols--check] text-sm text-primitive-orange-500"></i>
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <button
            class="relative flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.06] bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 cursor-pointer"
          >
            <i class="icon-[material-symbols--notifications] text-base"></i>
            <span class="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-error-500"></span>
          </button>
          <RouterLink
            to="/panel/turnos"
            class="flex items-center gap-2 rounded-full bg-primitive-orange-500 px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-primitive-orange-600"
          >
            <i class="icon-[material-symbols--add] text-base"></i> Nueva reserva
          </RouterLink>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
