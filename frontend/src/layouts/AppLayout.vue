<script setup>
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import Button from 'primevue/button'

const route = useRoute()
const router = useRouter()
const { user, logout } = useAuth()

const handleLogout = () => {
  logout()
  router.push({ name: 'login' })
}

const navItems = [
  { label: 'Dashboard', icon: 'pi pi-home', to: '/dashboard' },
  { label: 'Turnos', icon: 'pi pi-calendar', to: '/turnos', badge: 46 },
  { label: 'Clientes', icon: 'pi pi-users', to: '/clientes' },
  { label: 'Control de caja', icon: 'pi pi-wallet', to: '/caja' },
  { label: 'Canchas', icon: 'pi pi-objects-column', to: '/canchas' },
  { label: 'Horarios', icon: 'pi pi-clock', to: '/horarios' },
  { label: 'Reportes', icon: 'pi pi-chart-bar', to: '/reportes' },
  { label: 'Notificaciones', icon: 'pi pi-bell', to: '/notificaciones', dot: true },
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
  <div class="flex h-screen bg-slate-50">
    <!-- Sidebar -->
    <aside class="flex w-64 shrink-0 flex-col bg-primitive-dark-500">
      <!-- Logo -->
      <div class="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <div class="flex h-8 w-8 items-center justify-center rounded-md bg-primitive-orange-500">
          <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <span class="text-lg font-bold text-white">CourtIn</span>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto px-3 mt-6">
        <div v-for="item in navItems" :key="item.label" class="mb-4">
          <RouterLink
            :key="item.to"
            :to="item.to"
            class="group flex items-center gap-3 rounded-md p-3 text-sm font-medium no-underline transition-colors mt-2"
            :class="
              isActive(item.to)
                ? 'bg-white/10 text-white'
                : 'text-primitive-gray-600 hover:bg-white/5 hover:text-white'
            "
          >
            <i
              :class="[
                item.icon,
                isActive(item.to) ? 'text-primitive-orange-400' : 'text-primitive-gray-600',
              ]"
              class="text-base"
            ></i>
            <span class="flex-1">{{ item.label }}</span>
            <span
              v-if="item.badge"
              class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primitive-orange-500 px-1.5 text-[10px] font-bold text-white"
            >
              {{ item.badge }}
            </span>
            <span
              v-if="item.dot"
              class="h-2.5 w-2.5 rounded-full bg-error-500"
            ></span>
          </RouterLink>
        </div>
      </nav>

      <!-- User profile -->
      <div class="border-t border-white/10 p-3">
        <div class="flex items-center gap-2.5 rounded-xl px-3 py-2">
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primitive-blue-500/20 text-xs font-bold text-primitive-blue-300"
          >
            {{ userInitials }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-white">{{ userShortName }}</p>
            <p class="text-xs text-slate-500">Administrador</p>
          </div>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
          >
            <i class="pi pi-cog text-sm"></i>
          </button>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/10 hover:text-error-400"
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
        <div class="flex items-center gap-2">
          <!-- Club selector -->
          <div class="mx-3 flex items-center gap-2.5 rounded-md bg-white/10 px-4 py-1 border border-slate-200">
            <!-- <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primitive-orange-500 text-xs font-bold text-white"
            >
              CG
            </div> -->
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-semibold tracking-wider text-primitive-orange-400 uppercase">
                COMPLEJO
              </p>
              <p class="truncate text-sm font-normal text-primitive-dark-700">Club Garín Pádel</p>
            </div>
            <i class="pi pi-chevron-down text-xs text-slate-500"></i>
          </div>
  
          <div class="flex items-center gap-2 text-sm text-slate-500">
            <span class="font-medium text-slate-700">Club Garín Pádel</span>
            <i class="pi pi-chevron-right text-[10px] text-slate-300"></i>
            <span>{{ currentPageTitle }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
          >
            <i class="pi pi-bell text-sm"></i>
          </button>
          <Button label="Nueva reserva" icon="pi pi-plus" size="small" class="ml-1" />
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
