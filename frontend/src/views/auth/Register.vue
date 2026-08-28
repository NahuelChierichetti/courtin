<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue'

const route = useRoute()
const router = useRouter()
const { register, loginWithGoogle, resolveLanding, isLoading } = useAuth()

const form = reactive({
  nombre: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const showPassword = ref(false)
const showConfirm = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''

  if (form.password.length < 6) {
    errorMessage.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }
  if (form.password !== form.confirmPassword) {
    errorMessage.value = 'Las contraseñas no coinciden.'
    return
  }

  try {
    await register({ nombre: form.nombre, email: form.email, password: form.password })
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : resolveLanding()
    router.push(redirect)
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'No se pudo crear la cuenta.'
  }
}

// El mismo botón que en el login: para Google registrarse y entrar son el mismo
// acto, y si esta persona ya tenía cuenta, el backend la reconoce y la deja
// pasar en vez de decirle "el email ya existe".
const onGoogleCredential = async (credential) => {
  errorMessage.value = ''

  try {
    await loginWithGoogle(credential)
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : resolveLanding()
    router.push(redirect)
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'No se pudo crear la cuenta con Google.'
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
          <p class="text-lg font-normal tracking-tight text-brand-green-900">
            Court<span class="text-brand-lime-500">in</span>
          </p>
        </div>
      </RouterLink>

      <div class="flex flex-1 flex-col justify-center py-10">
        <div class="mx-auto w-full max-w-md">
          <h1 class="text-3xl font-bold text-brand-green-900 sm:text-4xl">Crear una cuenta</h1>
          <p class="mt-3 text-sm leading-relaxed text-stone-500">
            Registrate para reservar canchas y ver tus reservas en un solo lugar.
          </p>

          <div v-if="errorMessage" class="mt-6 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600">
            <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMessage }}
          </div>

          <!-- `continue_with` y no `signup_with`: en español Google traduce las
               dos como "Acceder con Google", que en una pantalla de registro
               suena a que hay que tener cuenta. Ésta da "Continuar con Google". -->
          <GoogleSignInButton class="mt-7" text="continue_with" @credential="onGoogleCredential" />
          <div class="mt-6 flex items-center gap-3">
            <span class="h-px flex-1 bg-black/[0.08]"></span>
            <span class="text-xs font-medium text-stone-400">o con tu email</span>
            <span class="h-px flex-1 bg-black/[0.08]"></span>
          </div>

          <form class="mt-7 space-y-5" @submit.prevent="handleSubmit">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="nombre">Nombre</label>
              <div class="relative">
                <i class="icon-[material-symbols--person-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                <input
                  id="nombre"
                  v-model="form.nombre"
                  autocomplete="name"
                  placeholder="Tu nombre"
                  required
                  class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-4 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="email">Email</label>
              <div class="relative">
                <i class="icon-[material-symbols--mail-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  placeholder="tuemail@ejemplo.com"
                  required
                  class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-4 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="password">Contraseña</label>
              <div class="relative">
                <i class="icon-[material-symbols--lock-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  required
                  class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-11 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 cursor-pointer" @click="showPassword = !showPassword">
                  <i :class="showPassword ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                </button>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="confirmPassword">Confirmar contraseña</label>
              <div class="relative">
                <i class="icon-[material-symbols--lock-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                <input
                  id="confirmPassword"
                  v-model="form.confirmPassword"
                  :type="showConfirm ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Repetí la contraseña"
                  required
                  class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-11 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 cursor-pointer" @click="showConfirm = !showConfirm">
                  <i :class="showConfirm ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                </button>
              </div>
            </div>

            <label class="flex items-start gap-2 text-sm text-stone-600">
              <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 rounded border border-stone-300 bg-white accent-brand-green-500 [color-scheme:light]" />
              <span>Acepto los <a href="#" class="font-semibold text-stone-700 hover:underline">Términos y Condiciones</a></span>
            </label>

            <button
              type="submit"
              :disabled="isLoading"
              class="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:opacity-60 cursor-pointer"
            >
              <i v-if="isLoading" class="icon-[material-symbols--progress-activity] animate-spin"></i>
              {{ isLoading ? 'Creando cuenta...' : 'Crear cuenta' }}
            </button>
          </form>

          <p class="mt-7 text-center text-sm text-stone-500">
            ¿Ya tenés cuenta?
            <RouterLink class="font-semibold text-brand-green-500 hover:underline" to="/login">
              Ingresá acá
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
          Tu próximo<br />partido, <span class="text-brand-lime-500">en juego.</span>
        </h2>
        <p class="mt-4 text-sm font-semibold tracking-[0.15em] text-white/70 uppercase">Gestioná · Reservá · Jugá</p>
        <p class="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          Creá tu cuenta y reservá canchas de pádel, tenis o fútbol cuando quieras.
        </p>
      </div>
    </div>
  </section>
</template>
