<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import authService from '@/services/authService'

const route = useRoute()
const router = useRouter()
const { resetPassword, resolveLanding, isLoading } = useAuth()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

// Estado del link: se valida antes de mostrar el formulario para no hacer
// escribir la contraseña en vano si el token ya venció.
const isVerifying = ref(true)
const isTokenValid = ref(false)
const accountEmail = ref('')

const form = reactive({ password: '', confirm: '' })
const showPassword = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  if (!token.value) {
    isVerifying.value = false
    return
  }

  try {
    const data = await authService.verifyResetToken(token.value)
    isTokenValid.value = true
    accountEmail.value = data.email || ''
  } catch {
    isTokenValid.value = false
  } finally {
    isVerifying.value = false
  }
})

const handleSubmit = async () => {
  errorMessage.value = ''

  if (form.password !== form.confirm) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    return
  }

  try {
    await resetPassword({ token: token.value, password: form.password })
    // El backend ya devolvió la sesión iniciada: entra directo a su panel.
    router.push(resolveLanding())
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'No se pudo cambiar la contraseña.'
  }
}
</script>

<template>
  <section class="min-h-screen bg-brand-sand-500 lg:grid lg:grid-cols-2">
    <!-- Columna formulario -->
    <div class="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16">
      <RouterLink :to="{ name: 'public-home' }" class="inline-flex items-center gap-2.5 no-underline">
        <img src="/images/logo-green.svg" alt="CourtIn" class="h-10 w-auto" />
        <div class="leading-none">
          <p class="text-lg font-bold tracking-tight text-ink-500">
            Court<span class="text-brand-green-500">In</span>
          </p>
        </div>
      </RouterLink>

      <div class="flex flex-1 flex-col justify-center py-10">
        <div class="mx-auto w-full max-w-md">
          <!-- Validando el link -->
          <div v-if="isVerifying" class="flex items-center gap-3 text-sm text-stone-500">
            <i class="icon-[material-symbols--progress-activity] animate-spin text-xl text-brand-green-500"></i>
            Verificando el link...
          </div>

          <!-- Link vencido, usado o inválido -->
          <template v-else-if="!isTokenValid">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-error-50">
              <i class="icon-[material-symbols--link-off] text-2xl text-error-600"></i>
            </div>
            <h1 class="mt-6 text-3xl font-bold text-ink-500 sm:text-4xl">Link vencido</h1>
            <p class="mt-3 text-sm leading-relaxed text-stone-500">
              Este link no es válido o ya fue usado. Los links de recuperación duran 60 minutos y
              sirven una sola vez.
            </p>
            <RouterLink
              to="/recuperar"
              class="mt-7 flex h-12 w-full items-center justify-center rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600"
            >
              Pedir un link nuevo
            </RouterLink>
          </template>

          <!-- Formulario de contraseña nueva -->
          <template v-else>
            <h1 class="text-3xl font-bold text-ink-500 sm:text-4xl">Nueva contraseña</h1>
            <p class="mt-3 text-sm leading-relaxed text-stone-500">
              Elegí una contraseña nueva
              <template v-if="accountEmail">
                para <span class="font-medium text-ink-500">{{ accountEmail }}</span>
              </template>.
            </p>

            <div v-if="errorMessage" class="mt-6 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600">
              <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMessage }}
            </div>

            <form class="mt-7 space-y-5" @submit.prevent="handleSubmit">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-ink-500" for="password">Contraseña</label>
                <div class="relative">
                  <i class="icon-[material-symbols--lock-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                  <input
                    id="password"
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    minlength="6"
                    required
                    class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-11 text-sm text-ink-500 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 cursor-pointer"
                    @click="showPassword = !showPassword"
                  >
                    <i :class="showPassword ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                  </button>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-ink-500" for="confirm">Repetir contraseña</label>
                <div class="relative">
                  <i class="icon-[material-symbols--lock-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                  <input
                    id="confirm"
                    v-model="form.confirm"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Repetí la contraseña"
                    minlength="6"
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
                {{ isLoading ? 'Guardando...' : 'Cambiar contraseña' }}
              </button>
            </form>
          </template>
        </div>
      </div>
    </div>

    <!-- Columna branding -->
    <div class="relative hidden overflow-hidden bg-brand-green-700 lg:block">
      <img src="/images/hero-tenista.png" alt="" aria-hidden="true" class="absolute inset-0 h-full w-full object-cover object-center mix-blend-luminosity" />
      <div class="absolute inset-0 bg-gradient-to-t from-brand-green-900 via-brand-green-900/40 to-brand-green-900/10"></div>

      <div class="relative flex h-full flex-col justify-end p-12">
        <h2 class="text-4xl font-bold leading-tight text-white">
          Tu complejo,<br />todo <span class="text-brand-lime-500">en juego.</span>
        </h2>
        <p class="mt-4 text-sm font-semibold tracking-[0.15em] text-white/70 uppercase">Gestioná · Reservá · Jugá</p>
        <p class="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          Elegí una contraseña nueva y volvé a gestionar tus turnos, canchas y clientes.
        </p>
      </div>
    </div>
  </section>
</template>
