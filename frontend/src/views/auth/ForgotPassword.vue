<script setup>
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import authService from '@/services/authService'

const route = useRoute()

// Misma variante que el login: cambia sólo a qué login se vuelve.
const isClub = computed(() => route.meta.variant === 'club')
const loginTo = computed(() => (isClub.value ? '/panel/login' : '/login'))

const email = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const sent = ref(false)

const handleSubmit = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    await authService.forgotPassword(email.value)
    // El backend responde igual exista o no la cuenta, para no revelar qué
    // emails están registrados. La pantalla acompaña ese criterio.
    sent.value = true
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'No se pudo enviar el email.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <section class="min-h-screen bg-brand-sand-500 lg:grid lg:grid-cols-2">
    <!-- Columna formulario -->
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
          <!-- Estado enviado -->
          <template v-if="sent">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-brand-lime-100">
              <i class="icon-[material-symbols--mark-email-read-outline] text-2xl text-brand-green-500"></i>
            </div>
            <h1 class="mt-6 text-3xl font-bold text-ink-500 sm:text-4xl">Revisá tu correo</h1>
            <p class="mt-3 text-sm leading-relaxed text-stone-500">
              Si <span class="font-medium text-ink-500">{{ email }}</span> está registrado, te
              mandamos un link para crear una contraseña nueva. Vence en 60 minutos.
            </p>
            <p class="mt-6 text-sm leading-relaxed text-stone-500">
              ¿No te llegó? Fijate en spam, o
              <button
                type="button"
                class="font-semibold text-brand-green-500 hover:underline cursor-pointer"
                @click="sent = false"
              >
                probá con otro email
              </button>.
            </p>
          </template>

          <!-- Formulario -->
          <template v-else>
            <h1 class="text-3xl font-bold text-ink-500 sm:text-4xl">¿Olvidaste tu contraseña?</h1>
            <p class="mt-3 text-sm leading-relaxed text-stone-500">
              Escribí tu email y te mandamos un link para crear una nueva.
            </p>

            <div v-if="errorMessage" class="mt-6 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600">
              <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMessage }}
            </div>

            <form class="mt-7 space-y-5" @submit.prevent="handleSubmit">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-ink-500" for="email">Email</label>
                <div class="relative">
                  <i class="icon-[material-symbols--mail-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                  <input
                    id="email"
                    v-model="email"
                    type="email"
                    autocomplete="email"
                    placeholder="tuemail@ejemplo.com"
                    required
                    class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-4 text-sm text-ink-500 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                :disabled="isLoading"
                class="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:opacity-60 cursor-pointer"
              >
                <i v-if="isLoading" class="icon-[material-symbols--progress-activity] animate-spin"></i>
                {{ isLoading ? 'Enviando...' : 'Enviar link' }}
              </button>
            </form>
          </template>

          <p class="mt-7 text-center text-sm text-stone-500">
            <RouterLink class="font-semibold text-brand-green-500 hover:underline" :to="loginTo">
              Volver al inicio de sesión
            </RouterLink>
          </p>
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
          Recuperá el acceso a tu cuenta en un minuto y seguí gestionando tus turnos.
        </p>
      </div>
    </div>
  </section>
</template>
