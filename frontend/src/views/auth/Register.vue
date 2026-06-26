<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { register, isLoading } = useAuth()

const form = reactive({
  nombre: '',
  email: '',
  password: '',
  confirmPassword: '',
})

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
    await register({
      nombre: form.nombre,
      email: form.email,
      password: form.password,
    })

    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : '/'

    router.push(redirect)
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message || 'No se pudo crear la cuenta.'
  }
}
</script>

<template>
  <section class="min-h-screen bg-slate-50">
    <div
      class="min-h-screen w-full bg-white lg:grid lg:grid-cols-2"
    >
      <div class="flex min-h-screen flex-col justify-center px-8 py-10 sm:px-12 lg:px-16">
        <div class="mx-auto w-full max-w-md">
          <RouterLink to="/" class="inline-flex items-center gap-3 no-underline">
            <div class="grid h-10 w-10 place-items-center rounded-xl bg-primitive-dark-500 text-white">
              <span class="text-sm font-bold">CI</span>
            </div>
            <div class="leading-tight">
              <p class="text-sm font-semibold tracking-wide text-slate-900">CourtIn</p>
              <p class="text-xs text-slate-500">Registro</p>
            </div>
          </RouterLink>

          <h1 class="mt-8 text-3xl font-bold text-primitive-dark-500 sm:text-4xl">Crear una cuenta</h1>
          <p class="mt-3 text-sm leading-relaxed text-primitive-dark-500">
            Registrate para empezar a usar CourtIn.
          </p>

        <Message v-if="errorMessage" severity="error" class="mt-6">
          {{ errorMessage }}
        </Message>

        <form class="mt-6 space-y-5" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label class="text-sm font-medium text-primitive-dark-500" for="nombre">Nombre</label>
            <InputText
              id="nombre"
              v-model="form.nombre"
              class="w-full"
              autocomplete="name"
              placeholder="Tu nombre"
              required
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-primitive-dark-500" for="email">Email</label>
            <InputText
              id="email"
              v-model="form.email"
              class="w-full"
              type="email"
              autocomplete="email"
              placeholder="tuemail@ejemplo.com"
              required
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-primitive-dark-500" for="password">Contraseña</label>
            <Password
              id="password"
              v-model="form.password"
              class="w-full"
              inputClass="w-full"
              :feedback="false"
              toggleMask
              autocomplete="new-password"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-primitive-dark-500" for="confirmPassword">
              Confirmar contraseña
            </label>
            <Password
              id="confirmPassword"
              v-model="form.confirmPassword"
              class="w-full"
              inputClass="w-full"
              :feedback="false"
              toggleMask
              autocomplete="new-password"
              placeholder="Repetí la contraseña"
              required
            />
          </div>

          <label class="flex items-start gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              class="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-300 bg-white accent-primitive-orange-500 [color-scheme:light] focus:ring-primitive-orange-500"
            />
            <span>
              Acepto los
              <a href="#" class="font-semibold text-slate-700 hover:underline">Términos y Condiciones</a>
            </span>
          </label>

          <Button type="submit" label="Crear cuenta" class="w-full" :loading="isLoading" />
        </form>

        <!-- <div class="mt-7 flex items-center gap-4">
          <div class="h-px flex-1 bg-slate-200"></div>
          <span class="text-xs font-medium uppercase tracking-wider text-neutral-400">O</span>
          <div class="h-px flex-1 bg-slate-200"></div>
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <Button label="Google" outlined class="w-full" />
          <Button label="Facebook" outlined class="w-full" />
        </div> -->

        <p class="!mt-6 text-center text-sm text-slate-600">
          ¿Ya tenés cuenta?
          <RouterLink class="font-semibold text-primitive-orange-500 hover:underline" to="/login">
            Ingresá acá
          </RouterLink>
        </p>
        </div>
      </div>

      <div class="relative hidden min-h-screen overflow-hidden bg-primitive-dark-500 lg:block">
        <div class="absolute inset-0 opacity-20">
          <div class="absolute right-10 top-10 h-5 w-5 rounded bg-white/20"></div>
          <div class="absolute right-20 top-20 h-3 w-3 rounded bg-white/20"></div>
          <div class="absolute right-14 top-32 h-4 w-4 rounded bg-white/20"></div>
          <div class="absolute right-28 top-44 h-3 w-3 rounded bg-white/20"></div>
          <div class="absolute right-16 top-56 h-5 w-5 rounded bg-white/20"></div>
          <div class="absolute right-32 top-64 h-4 w-4 rounded bg-white/20"></div>
        </div>

        <div class="relative flex h-full flex-col items-center justify-center p-10">
          <div class="relative w-full max-w-md">
            <div class="rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-900/10">
              <p class="text-xs font-semibold text-primitive-dark-500">Analytics</p>
              <div class="mt-4 h-20 w-full rounded-xl bg-slate-100"></div>
              <div class="mt-3 grid grid-cols-4 gap-2 text-[10px] font-medium text-primitive-dark-500">
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
              </div>
            </div>

            <div class="absolute -bottom-8 -right-6 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-900/10">
              <div class="flex items-center gap-4">
                <div class="relative h-16 w-16 rounded-full bg-slate-100">
                  <div class="absolute inset-2 rounded-full bg-white"></div>
                  <div class="absolute inset-0 rounded-full [background:conic-gradient(theme(colors.primitive.orange.500)_0_40%,theme(colors.slate.200)_40%_100%)]"></div>
                  <div class="absolute inset-3 rounded-full bg-white"></div>
                </div>
                <div>
                  <p class="text-xs font-semibold text-primitive-dark-500">Total</p>
                  <p class="text-lg font-bold text-primitive-dark-500">42%</p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-16 text-center">
            <p class="text-lg font-semibold text-white">Muy fácil de empezar</p>
            <p class="!mt-2 text-sm text-slate-200">
              Creá tu cuenta y empezá a administrar tu cancha, reservas y cobros de forma simple.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>