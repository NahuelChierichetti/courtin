<script setup>
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()

const handleLogout = () => {
  logout()
  router.push({ name: 'login' })
}

const navItems = [
  { label: 'Complejos', icon: 'pi pi-building', to: '/admin/complejos' },
  { label: 'Usuarios', icon: 'pi pi-users', to: '/admin/usuarios' },
  { label: 'Suscripciones', icon: 'pi pi-credit-card', to: '/admin/suscripciones' },
  { label: 'Reportes', icon: 'pi pi-chart-bar', to: '/admin/reportes' },
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
  <div class="flex h-screen bg-slate-50">
    <!-- Sidebar -->
    <aside class="flex w-64 shrink-0 flex-col bg-slate-900">
      <!-- Logo -->
      <div class="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primitive-orange-500">
          <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <div>
          <span class="text-lg font-bold text-white">CourtIn</span>
          <span class="ml-1.5 rounded bg-primitive-orange-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primitive-orange-400">Admin</span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto px-3 mt-6">
        <div v-for="item in navItems" :key="item.label" class="mb-1">
          <RouterLink
            :to="item.to"
            class="group flex items-center gap-3 rounded-md p-3 text-sm font-medium no-underline transition-colors"
            :class="
              isActive(item.to)
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            "
          >
            <i
              :class="[
                item.icon,
                isActive(item.to) ? 'text-primitive-orange-400' : 'text-slate-500',
              ]"
              class="text-base"
            ></i>
            <span class="flex-1">{{ item.label }}</span>
          </RouterLink>
        </div>
      </nav>

      <!-- Back to app -->
      <div class="px-3 pb-2">
        <button
          class="flex w-full items-center gap-3 rounded-md p-3 text-sm font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
          @click="goToApp"
        >
          <i class="pi pi-arrow-left text-base text-slate-500"></i>
          <span>Volver a la app</span>
        </button>
      </div>

      <!-- User profile -->
      <div class="border-t border-white/10 p-3">
        <div class="flex items-center gap-2.5 rounded-xl px-3 py-2">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primitive-orange-500/20 text-xs font-bold text-primitive-orange-300"
          >
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white">{{ userShortName }}</p>
            <p class="text-xs text-slate-500">Superadmin</p>
          </div>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/10 hover:text-red-400 cursor-pointer"
            @click="handleLogout"
          >
            <i class="pi pi-sign-out text-sm"></i>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <header class="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div class="flex items-center gap-2 text-sm text-slate-500">
          <span class="font-medium text-slate-700">Backoffice</span>
          <i class="pi pi-chevron-right text-[10px] text-slate-300"></i>
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
