<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, user, logout } = useAuth()

const isAuthScreen = computed(() => route.name === 'login' || route.name === 'register')

const handleLogout = () => {
  logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-800">
    <header v-if="!isAuthScreen" class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <RouterLink class="no-underline" to="/">
          <div>
            <p class="text-xl font-bold text-blue-600">CourtIn</p>
            <p class="text-sm text-slate-500">Sistema de reservas de canchas</p>
          </div>
        </RouterLink>

        <div class="flex items-center gap-3">
          <template v-if="isAuthenticated">
            <div class="hidden text-right sm:block">
              <p class="text-sm font-semibold text-slate-800">{{ user?.nombre }}</p>
              <p class="text-xs text-slate-500">{{ user?.email }}</p>
            </div>
            <Button label="Cerrar sesión" severity="contrast" @click="handleLogout" />
          </template>

          <template v-else>
            <RouterLink to="/login">
              <Button label="Ingresar" text />
            </RouterLink>
            <RouterLink to="/register">
              <Button label="Registrarse" />
            </RouterLink>
          </template>
        </div>
      </div>
    </header>

    <main class="w-full">
      <RouterView />
    </main>
  </div>
</template>