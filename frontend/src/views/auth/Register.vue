<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { register, resolveLanding, isLoading } = useAuth()

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
</script>

<template>
  <section class="min-h-screen bg-[#faf5ef] lg:grid lg:grid-cols-2">
    <!-- Columna formulario -->
    <div class="flex min-h-screen flex-col px-6 py-8 sm:px-12 lg:px-16">
      <RouterLink :to="{ name: 'public-home' }" class="inline-flex items-center gap-2.5 no-underline">
        <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primitive-orange-500">
          <svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5 3.5 19h17L12 4.5Zm0 4.8 3.1 5.3-1.6.9-1.5-1-1.5 1-1.6-.9L12 9.3Z" />
          </svg>
        </div>
        <div class="leading-none">
          <p class="text-lg font-bold tracking-tight text-primitive-dark-500">
            Court<span class="text-primitive-orange-500">In</span>
          </p>
          <p class="mt-0.5 text-[10px] font-semibold tracking-[0.22em] text-slate-400">SPORT COMPLEX</p>
        </div>
      </RouterLink>

      <div class="flex flex-1 flex-col justify-center py-10">
        <div class="mx-auto w-full max-w-md">
          <h1 class="text-3xl font-bold text-primitive-dark-500 sm:text-4xl">Crear una cuenta</h1>
          <p class="mt-3 text-sm leading-relaxed text-slate-500">
            Registrate para reservar canchas y ver tus reservas en un solo lugar.
          </p>

          <div v-if="errorMessage" class="mt-6 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600">
            <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMessage }}
          </div>

          <form class="mt-7 space-y-5" @submit.prevent="handleSubmit">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-primitive-dark-500" for="nombre">Nombre</label>
              <div class="relative">
                <i class="icon-[material-symbols--person-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  id="nombre"
                  v-model="form.nombre"
                  autocomplete="name"
                  placeholder="Tu nombre"
                  required
                  class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-4 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-primitive-dark-500" for="email">Email</label>
              <div class="relative">
                <i class="icon-[material-symbols--mail-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  placeholder="tuemail@ejemplo.com"
                  required
                  class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-4 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-primitive-dark-500" for="password">Contraseña</label>
              <div class="relative">
                <i class="icon-[material-symbols--lock-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  required
                  class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-11 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer" @click="showPassword = !showPassword">
                  <i :class="showPassword ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                </button>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-primitive-dark-500" for="confirmPassword">Confirmar contraseña</label>
              <div class="relative">
                <i class="icon-[material-symbols--lock-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  id="confirmPassword"
                  v-model="form.confirmPassword"
                  :type="showConfirm ? 'text' : 'password'"
                  autocomplete="new-password"
                  placeholder="Repetí la contraseña"
                  required
                  class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-11 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-slate-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
                />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 cursor-pointer" @click="showConfirm = !showConfirm">
                  <i :class="showConfirm ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                </button>
              </div>
            </div>

            <label class="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-300 bg-white accent-primitive-orange-500 [color-scheme:light]" />
              <span>Acepto los <a href="#" class="font-semibold text-slate-700 hover:underline">Términos y Condiciones</a></span>
            </label>

            <button
              type="submit"
              :disabled="isLoading"
              class="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primitive-orange-500 text-sm font-semibold text-white transition-colors hover:bg-primitive-orange-600 disabled:opacity-60 cursor-pointer"
            >
              <i v-if="isLoading" class="icon-[material-symbols--progress-activity] animate-spin"></i>
              {{ isLoading ? 'Creando cuenta...' : 'Crear cuenta' }}
            </button>
          </form>

          <p class="mt-7 text-center text-sm text-slate-500">
            ¿Ya tenés cuenta?
            <RouterLink class="font-semibold text-primitive-orange-500 hover:underline" to="/login">
              Ingresá acá
            </RouterLink>
          </p>
        </div>
      </div>
    </div>

    <!-- Columna branding -->
    <div class="relative hidden overflow-hidden bg-primitive-dark-500 lg:block">
      <img src="/images/hero-tenista.png" alt="" aria-hidden="true" class="absolute inset-0 h-full w-full object-cover object-center" />
      <div class="absolute inset-0 bg-gradient-to-t from-primitive-dark-500 via-primitive-dark-500/40 to-primitive-dark-500/20"></div>

      <div class="relative flex h-full flex-col justify-end p-12">
        <h2 class="text-4xl font-bold leading-tight text-white">
          Tu próximo<br />partido, <span class="text-primitive-orange-500">en juego.</span>
        </h2>
        <p class="mt-4 text-sm font-semibold tracking-[0.15em] text-white/70 uppercase">Gestioná · Reservá · Jugá</p>
        <p class="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          Creá tu cuenta y reservá canchas de pádel, tenis o fútbol cuando quieras.
        </p>
      </div>
    </div>
  </section>
</template>
