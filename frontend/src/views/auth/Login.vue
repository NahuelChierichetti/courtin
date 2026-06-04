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
const { login, isLoading } = useAuth()

const form = reactive({
  email: '',
  password: '',
})

const errorMessage = ref('')

const handleSubmit = async () => {
  errorMessage.value = ''

  try {
    await login(form)

    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : '/'

    router.push(redirect)
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message || 'No se pudo iniciar sesión.'
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
          <div class="inline-flex items-center gap-3 no-underline">
            <div class="grid h-10 w-10 place-items-center rounded-xl bg-primitive-dark-500 text-white">
              <span class="text-sm font-bold">CI</span>
            </div>
            <div class="leading-tight">
              <p class="text-sm font-semibold tracking-wide text-slate-900">CourtIn</p>
              <p class="text-xs text-slate-500">Acceso</p>
            </div>
          </div>

          <h1 class="mt-8 text-3xl font-bold text-primitive-dark-500 sm:text-4xl">Iniciar sesión</h1>
          <p class="mt-3 text-sm leading-relaxed text-primitive-dark-500">
            Entrá con tu email y contraseña para acceder a la aplicación.
          </p>

        <Message v-if="errorMessage" severity="error" class="mt-6">
          {{ errorMessage }}
        </Message>

        <form class="mt-6 space-y-5" @submit.prevent="handleSubmit">
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
              class="w-full cursor-pointer"
              inputClass="w-full"
              :feedback="false"
              toggleMask
              autocomplete="current-password"
              placeholder="Ingresá tu contraseña"
              required
            />
          </div>

          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              class="h-4 w-4 shrink-0 rounded-sm border border-slate-300 bg-white accent-primitive-orange-500 [color-scheme:light] focus:ring-primitive-orange-500"
            />
            Recordarme
          </label>

          <Button type="submit" label="Ingresar" class="w-full" :loading="isLoading" />
        </form>

        <!-- <div class="mt-7 flex items-center gap-4">
          <div class="h-px flex-1 bg-slate-200"></div>
          <span class="text-xs font-medium uppercase tracking-wider text-slate-400">O</span>
          <div class="h-px flex-1 bg-slate-200"></div>
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <Button label="Google" outlined class="w-full" />
          <Button label="Facebook" outlined class="w-full" />
        </div> -->

        <p class="!mt-6 text-center text-sm text-slate-600">
          ¿Todavía no tenés cuenta?
          <RouterLink class="font-semibold text-primitive-orange-500 hover:underline" to="/register">
            Registrate
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
            <p class="text-lg font-semibold text-white">Una forma simple de organizar tu juego</p>
            <p class="mt-2 text-sm text-slate-200">
              Accedé a tu cuenta y gestioná tus turnos, canchas y clientes desde un solo lugar.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>