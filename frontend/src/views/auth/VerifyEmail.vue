<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import authService from '@/services/authService'

const route = useRoute()
const { isAuthenticated, refreshUser, resolveLanding } = useAuth()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const estado = ref('verificando') // verificando | ok | error
const mensaje = ref('')

onMounted(async () => {
  if (!token.value) {
    estado.value = 'error'
    mensaje.value = 'El link está incompleto.'
    return
  }

  try {
    const data = await authService.verifyEmail(token.value)
    estado.value = 'ok'
    mensaje.value = data.message
    // Si hay sesión abierta, se recarga el usuario para que el aviso del panel
    // desaparezca sin tener que volver a iniciar sesión.
    if (isAuthenticated.value) await refreshUser()
  } catch (error) {
    estado.value = 'error'
    mensaje.value = error.response?.data?.message || 'No se pudo confirmar tu email.'
  }
})

const destino = computed(() => (isAuthenticated.value ? resolveLanding() : '/panel/login'))
const destinoLabel = computed(() => (isAuthenticated.value ? 'Ir a mi panel' : 'Iniciar sesión'))
</script>

<template>
  <section class="min-h-screen bg-brand-sand-500 lg:grid lg:grid-cols-2">
    <!-- Columna contenido -->
    <div class="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16">
      <RouterLink :to="{ name: 'public-home' }" class="inline-flex items-center gap-2.5 no-underline">
        <img src="/images/logo-lime.svg" alt="CourtIn" class="h-10 w-auto" />
        <div class="leading-none">
          <p class="text-lg font-normal tracking-tight text-ink-500">
            Court<span class="text-brand-lime-500">In</span>
          </p>
        </div>
      </RouterLink>

      <div class="flex flex-1 flex-col justify-center py-10">
        <div class="mx-auto w-full max-w-md">
          <div v-if="estado === 'verificando'" class="flex items-center gap-3 text-sm text-stone-500">
            <i class="icon-[material-symbols--progress-activity] animate-spin text-xl text-brand-green-500"></i>
            Confirmando tu email...
          </div>

          <template v-else-if="estado === 'ok'">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-success-50">
              <i class="icon-[material-symbols--check-circle-outline] text-2xl text-success-600"></i>
            </div>
            <h1 class="mt-6 text-3xl font-bold text-ink-500 sm:text-4xl">Email confirmado</h1>
            <p class="mt-3 text-sm leading-relaxed text-stone-500">{{ mensaje }}</p>
            <RouterLink
              :to="destino"
              class="mt-7 flex h-12 w-full items-center justify-center rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600"
            >
              {{ destinoLabel }}
            </RouterLink>
          </template>

          <template v-else>
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-error-50">
              <i class="icon-[material-symbols--link-off] text-2xl text-error-600"></i>
            </div>
            <h1 class="mt-6 text-3xl font-bold text-ink-500 sm:text-4xl">No pudimos confirmarlo</h1>
            <p class="mt-3 text-sm leading-relaxed text-stone-500">{{ mensaje }}</p>
            <p class="mt-3 text-sm leading-relaxed text-stone-500">
              Podés pedir un link nuevo desde el aviso que aparece en tu panel.
            </p>
            <RouterLink
              :to="destino"
              class="mt-7 flex h-12 w-full items-center justify-center rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600"
            >
              {{ destinoLabel }}
            </RouterLink>
          </template>
        </div>
      </div>
    </div>

    <!-- Columna branding -->
    <div class="relative hidden overflow-hidden bg-brand-green-700 lg:block">
      <img src="/images/banner-web.jpg" alt="" aria-hidden="true" class="absolute inset-0 h-full w-full object-cover object-[72%_50%] mix-blend-luminosity" />
      <div class="absolute inset-0 bg-gradient-to-t from-brand-green-900 via-brand-green-900/40 to-brand-green-900/10"></div>

      <div class="relative flex h-full flex-col justify-end p-12">
        <h2 class="text-4xl font-bold leading-tight text-white">
          Tu complejo,<br />todo <span class="text-brand-lime-500">en juego.</span>
        </h2>
        <p class="mt-4 text-sm font-semibold tracking-[0.15em] text-white/70 uppercase">Gestioná · Reservá · Jugá</p>
        <p class="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          Con tu email confirmado no vas a perderte ninguna reserva ni aviso importante.
        </p>
      </div>
    </div>
  </section>
</template>
