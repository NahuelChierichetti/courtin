<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useUserNotifications } from '@/composables/useUserNotifications'

const router = useRouter()
const { user, isSuperadmin, hasClubAccess, logout } = useAuth()
const { unreadCount } = useUserNotifications()

const open = ref(false)

const initials = computed(() => {
  const n = user.value?.nombre
  if (!n) return '?'
  return n
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
})

const firstName = computed(() => user.value?.nombre?.split(' ')[0] || '')

// Atajo al backoffice, sólo para quien tiene dónde entrar. Un jugador no ve
// esta opción: era el problema del header viejo, que la mostraba siempre.
const workspace = computed(() => {
  if (isSuperadmin.value) return { label: 'Panel de administración', to: '/admin' }
  if (hasClubAccess.value) return { label: 'Panel del complejo', to: '/panel/dashboard' }
  return null
})

const close = () => {
  open.value = false
}

const handleLogout = () => {
  close()
  logout()
  router.push({ name: 'public-home' })
}

onMounted(() => document.addEventListener('click', close))
onUnmounted(() => document.removeEventListener('click', close))
</script>

<template>
  <div class="relative">
    <button
      class="flex h-10 items-center gap-2 rounded-full bg-white pl-1 pr-2 shadow-sm ring-1 ring-black/[0.06] transition-colors hover:bg-stone-50 cursor-pointer sm:pr-3"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click.stop="open = !open"
    >
      <span
        class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green-500 text-xs font-bold text-white"
      >
        {{ initials }}
      </span>
      <span class="hidden text-sm font-semibold text-brand-green-900 sm:block">{{ firstName }}</span>
      <i
        class="icon-[material-symbols--keyboard-arrow-down] text-sm text-stone-400 transition-transform"
        :class="{ 'rotate-180': open }"
      ></i>
    </button>

    <div
      v-if="open"
      role="menu"
      class="absolute right-0 top-full z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg"
      @click.stop
    >
      <div class="border-b border-black/[0.06] px-3 py-2.5">
        <p class="truncate text-sm font-semibold text-brand-green-900">{{ user?.nombre }}</p>
        <p class="truncate text-xs text-stone-500">{{ user?.email }}</p>
      </div>

      <div class="py-1">
        <RouterLink
          v-if="workspace"
          :to="workspace.to"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-brand-green-600 no-underline transition-colors hover:bg-brand-green-50"
          @click="close"
        >
          <i class="icon-[material-symbols--grid-view] text-base"></i>
          {{ workspace.label }}
        </RouterLink>

        <RouterLink
          :to="{ name: 'mis-reservas' }"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-700 no-underline transition-colors hover:bg-stone-50"
          @click="close"
        >
          <i class="icon-[material-symbols--calendar-month] text-base text-stone-400"></i>
          Mis reservas
        </RouterLink>

        <RouterLink
          :to="{ name: 'favoritos' }"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-700 no-underline transition-colors hover:bg-stone-50"
          @click="close"
        >
          <i class="icon-[material-symbols--favorite-outline] text-base text-stone-400"></i>
          Favoritos
        </RouterLink>

        <RouterLink
          :to="{ name: 'mis-notificaciones' }"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-700 no-underline transition-colors hover:bg-stone-50"
          @click="close"
        >
          <i class="icon-[material-symbols--notifications-outline] text-base text-stone-400"></i>
          Notificaciones
          <span
            v-if="unreadCount"
            class="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-error-500 px-1.5 text-[10px] font-bold text-white"
          >
            {{ unreadCount > 9 ? '9+' : unreadCount }}
          </span>
        </RouterLink>

        <RouterLink
          :to="{ name: 'cuenta' }"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-stone-700 no-underline transition-colors hover:bg-stone-50"
          @click="close"
        >
          <i class="icon-[material-symbols--person-outline] text-base text-stone-400"></i>
          Mi cuenta
        </RouterLink>
      </div>

      <div class="border-t border-black/[0.06] pt-1">
        <button
          class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
          @click="handleLogout"
        >
          <i class="icon-[material-symbols--logout] text-base text-stone-400"></i>
          Cerrar sesión
        </button>
      </div>
    </div>
  </div>
</template>
