<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useSidebar, useSidebarShortcut } from '@/composables/useSidebar'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()
const { collapsed, railed, toggleSidebar, mobileOpen, openMobile, closeMobile, shortcutLabel, shortcutAria } =
  useSidebar()
useSidebarShortcut()

const userMenuOpen = ref(false)
const closeMenus = () => {
  userMenuOpen.value = false
}

// Al navegar el dropdown y el drawer mobile tienen que cerrarse solos: los
// RouterLink de adentro no disparan el click-outside.
watch(() => route.path, () => {
  closeMenus()
  closeMobile()
})

onMounted(() => document.addEventListener('click', closeMenus))
onUnmounted(() => document.removeEventListener('click', closeMenus))

const handleLogout = () => {
  logout()
  router.push({ name: 'login' })
}

const navItems = [
  { label: 'Complejos', icon: 'icon-[material-symbols--apartment]', to: '/admin/complejos' },
  { label: 'Usuarios', icon: 'icon-[material-symbols--group]', to: '/admin/usuarios' },
  { label: 'Suscripciones', icon: 'icon-[material-symbols--credit-card]', to: '/admin/suscripciones' },
  { label: 'Reportes', icon: 'icon-[material-symbols--bar-chart]', to: '/admin/reportes' },
]

const isActive = (to) => route.path === to || route.path.startsWith(to + '/')

const currentPageTitle = computed(() => {
  const item = navItems.find((i) => isActive(i.to))
  return item?.label || 'Backoffice'
})

const userInitials = computed(() => {
  if (!user.value?.nombre) return '??'
  const parts = user.value.nombre.split(' ')
  return parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase()
})

const userShortName = computed(() => {
  if (!user.value?.nombre) return ''
  const parts = user.value.nombre.split(' ')
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`
  return parts[0]
})

const goToApp = () => {
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <div class="flex h-dvh bg-brand-sand-500">
    <!-- Backdrop del drawer mobile -->
    <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/40 lg:hidden" @click="closeMobile"></div>

    <!-- Sidebar: drawer en mobile, columna fija desde lg -->
    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-brand-green-700 transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0 lg:transition-[width]"
      :class="[
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        railed ? 'lg:w-[76px]' : 'lg:w-64',
      ]"
    >
      <!-- Logo -->
      <div class="flex items-center pt-5 pb-4" :class="railed ? 'justify-center px-2' : 'gap-2.5 px-5'">
        <img src="/images/logo-lime.svg" alt="CourtIn" class="h-12 w-auto" />
        <div v-if="!railed" class="flex flex-col text-start">
          <p class="text-2xl font-normal text-white">
            Court<span class="text-brand-lime-500">In</span>
          </p>
          <span class="max-w-[50px] rounded bg-brand-lime-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-lime-400">Admin</span>
        </div>
        <!-- Cerrar (sólo drawer) -->
        <button
          class="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer lg:hidden"
          aria-label="Cerrar menú"
          @click="closeMobile"
        >
          <i class="icon-[lucide--x] text-lg"></i>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto px-3 mt-6">
        <div v-for="item in navItems" :key="item.label" class="mb-1">
          <RouterLink
            :to="item.to"
            :title="railed ? item.label : null"
            class="group flex items-center rounded-md p-3 text-sm font-medium no-underline transition-colors"
            :class="[
              isActive(item.to)
                ? 'bg-white/12 text-white'
                : 'text-white/70 hover:bg-white/8 hover:text-white',
              railed ? 'justify-center' : 'gap-3',
            ]"
          >
            <i
              :class="[
                item.icon,
                isActive(item.to) ? 'text-brand-lime-500' : 'text-white/60',
              ]"
              class="text-base"
            ></i>
            <span v-if="!railed" class="flex-1">{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <!-- Colapsar / expandir sidebar (en mobile el drawer no se colapsa) -->
      <div class="hidden border-t border-white/10 p-3 lg:block">
        <button
          class="flex w-full items-center rounded-md p-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white cursor-pointer"
          :class="railed ? 'justify-center' : 'gap-3'"
          :title="`${collapsed ? 'Expandir' : 'Colapsar'} menú (${shortcutLabel})`"
          :aria-label="collapsed ? 'Expandir menú' : 'Colapsar menú'"
          :aria-keyshortcuts="shortcutAria"
          :aria-expanded="!collapsed"
          @click="toggleSidebar"
        >
          <i
            :class="railed ? 'icon-[lucide--panel-left-open]' : 'icon-[lucide--panel-left-close]'"
            class="text-base"
          ></i>
          <span v-if="!railed">Colapsar menú</span>
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <header class="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-white px-3 sm:px-6">
        <div class="flex min-w-0 items-center gap-1.5 text-sm text-stone-500 sm:gap-2.5">
          <!-- Abrir menú (mobile) -->
          <button
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-brand-green-500 cursor-pointer lg:hidden"
            aria-label="Abrir menú"
            :aria-expanded="mobileOpen"
            @click.stop="openMobile"
          >
            <i class="icon-[lucide--menu] text-xl"></i>
          </button>
          <!-- En mobile sólo la página actual: el breadcrumb completo no entra. -->
          <span class="hidden font-medium text-stone-700 sm:inline">Backoffice</span>
          <i class="icon-[material-symbols--chevron-right] hidden text-[10px] text-stone-300 sm:inline"></i>
          <span class="truncate font-medium text-stone-700 sm:font-normal sm:text-stone-500">{{ currentPageTitle }}</span>
        </div>

        <!-- Usuario -->
        <div class="relative shrink-0">
          <button
            class="flex items-center gap-1 rounded-xl py-1.5 pl-1.5 pr-1.5 transition-colors hover:bg-stone-50 cursor-pointer sm:gap-2.5 sm:pr-2"
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
              <span class="block text-xs text-stone-500">Superadmin</span>
            </span>
            <i
              class="icon-[lucide--chevron-down] shrink-0 text-sm text-stone-400 transition-transform"
              :class="{ 'rotate-180': userMenuOpen }"
            ></i>
          </button>

          <!-- Dropdown -->
          <div
            v-if="userMenuOpen"
            class="absolute right-0 top-full z-50 mt-1.5 w-56 overflow-hidden rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg"
          >
            <button
              class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
              @click="goToApp"
            >
              <i class="icon-[lucide--arrow-left] text-base text-stone-400"></i>
              Volver a la app
            </button>
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
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-4 sm:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
