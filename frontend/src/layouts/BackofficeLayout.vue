<script setup>
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useSidebar, useSidebarShortcut } from '@/composables/useSidebar'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()
const { collapsed, toggleSidebar, shortcutLabel, shortcutAria } = useSidebar()
useSidebarShortcut()

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
  <div class="flex h-screen bg-brand-sand-500">
    <!-- Sidebar -->
    <aside
      class="flex shrink-0 flex-col bg-brand-green-700 transition-[width] duration-200 ease-out"
      :class="collapsed ? 'w-[76px]' : 'w-64'"
    >
      <!-- Logo -->
      <div class="flex items-center pt-5 pb-4" :class="collapsed ? 'justify-center px-2' : 'gap-2.5 px-5'">
        <img src="/images/logo-lime.svg" alt="CourtIn" class="h-12 w-auto" />
        <div v-if="!collapsed" class="flex flex-col text-start">
          <p class="text-2xl font-normal text-white">
            Court<span class="text-brand-lime-500">In</span>
          </p>
          <span class="max-w-[50px] rounded bg-brand-lime-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-lime-400">Admin</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto px-3 mt-6">
        <div v-for="item in navItems" :key="item.label" class="mb-1">
          <RouterLink
            :to="item.to"
            :title="collapsed ? item.label : null"
            class="group flex items-center rounded-md p-3 text-sm font-medium no-underline transition-colors"
            :class="[
              isActive(item.to)
                ? 'bg-white/12 text-white'
                : 'text-white/70 hover:bg-white/8 hover:text-white',
              collapsed ? 'justify-center' : 'gap-3',
            ]"
          >
            <i
              :class="[
                item.icon,
                isActive(item.to) ? 'text-brand-lime-500' : 'text-white/60',
              ]"
              class="text-base"
            ></i>
            <span v-if="!collapsed" class="flex-1">{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <!-- Back to app -->
      <div class="px-3 pb-2">
        <button
          :title="collapsed ? 'Volver a la app' : null"
          class="flex w-full items-center rounded-full p-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/8 hover:text-white cursor-pointer"
          :class="collapsed ? 'justify-center' : 'gap-3'"
          @click="goToApp"
        >
          <i class="icon-[material-symbols--arrow-back] text-base text-white/60"></i>
          <span v-if="!collapsed">Volver a la app</span>
        </button>
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
            <p class="text-xs text-white/60">Superadmin</p>
          </div>
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
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6">
        <div class="flex items-center gap-2.5 text-sm text-stone-500">
          <button
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-white text-stone-500 shadow-sm transition-colors hover:bg-stone-50 hover:text-brand-green-500 cursor-pointer"
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
          <span class="font-medium text-stone-700">Backoffice</span>
          <i class="icon-[material-symbols--chevron-right] text-[10px] text-stone-300"></i>
          <span>{{ currentPageTitle }}</span>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
