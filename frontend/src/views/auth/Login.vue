<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import GoogleSignInButton from '@/components/auth/GoogleSignInButton.vue'

const route = useRoute()
const router = useRouter()
const { login, loginWithGoogle, resolveLanding, isLoading } = useAuth()

// Variante del acceso: 'club' (backoffice del complejo) o 'customer' (jugador).
// Cambia sólo el copy y el link de registro; el endpoint de login es el mismo.
const isClub = computed(() => route.meta.variant === 'club')

const subtitle = computed(() =>
  isClub.value
    ? 'Ingresá para administrar tu complejo, canchas y turnos.'
    : 'Entrá para ver y gestionar tus reservas.',
)
// Desde el login del jugador se va derecho a su formulario, sin pasar por la
// pantalla de elección: quien está en /login ya eligió qué tipo de cuenta quiere.
const registerTo = computed(() => (isClub.value ? '/panel/registro' : '/registro/jugador'))
const forgotTo = computed(() => (isClub.value ? '/panel/recuperar' : '/recuperar'))
const registerLabel = computed(() =>
  isClub.value ? '¿Querés sumar tu complejo?' : '¿Todavía no tenés cuenta?',
)
const registerCta = computed(() => (isClub.value ? 'Registrá tu complejo' : 'Registrate'))

const form = reactive({ email: '', password: '' })
const showPassword = ref(false)
const errorMessage = ref('')

// Un complejo esperando aprobación no es un error de credenciales: la contraseña
// estaba bien y no hay nada que reintentar. Se muestra aparte, en tono de aviso,
// para que no parezca que se equivocó al tipear.
const avisoAlta = ref(null)

const handleSubmit = async () => {
  errorMessage.value = ''
  avisoAlta.value = null

  try {
    await login(form)
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : resolveLanding()
    router.push(redirect)
  } catch (error) {
    const { code, message } = error.response?.data || {}

    if (code === 'CLUB_PENDIENTE' || code === 'CLUB_RECHAZADO') {
      avisoAlta.value = { code, message }
      return
    }

    errorMessage.value = message || 'No se pudo iniciar sesión.'
  }
}

// Acceso con Google, sólo para jugadores. El panel del complejo queda afuera a
// propósito: el alta de un complejo pide datos que un botón de un clic no puede
// dar (nombre del club, dirección, cuántas canchas) y encima pasa por
// aprobación, así que ahí un "entrar con Google" no completa ningún camino.
const onGoogleCredential = async (credential) => {
  errorMessage.value = ''
  avisoAlta.value = null

  try {
    await loginWithGoogle(credential)
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : resolveLanding()
    router.push(redirect)
  } catch (error) {
    const { code, message } = error.response?.data || {}

    if (code === 'CLUB_PENDIENTE' || code === 'CLUB_RECHAZADO') {
      avisoAlta.value = { code, message }
      return
    }

    errorMessage.value = message || 'No se pudo iniciar sesión con Google.'
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
          <h1 class="text-3xl font-bold text-ink-500 sm:text-4xl">Iniciar sesión</h1>
          <p class="mt-3 text-sm leading-relaxed text-stone-500">{{ subtitle }}</p>

          <div v-if="errorMessage" class="mt-6 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600">
            <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMessage }}
          </div>

          <div
            v-if="avisoAlta"
            class="mt-6 rounded-xl border px-4 py-3.5"
            :class="
              avisoAlta.code === 'CLUB_PENDIENTE'
                ? 'border-warning-100 bg-warning-50'
                : 'border-stone-200 bg-stone-50'
            "
          >
            <p class="flex items-start gap-2 text-sm font-semibold" :class="avisoAlta.code === 'CLUB_PENDIENTE' ? 'text-warning-700' : 'text-stone-700'">
              <i
                class="mt-px shrink-0"
                :class="
                  avisoAlta.code === 'CLUB_PENDIENTE'
                    ? 'icon-[material-symbols--hourglass-top-outline]'
                    : 'icon-[material-symbols--info-outline]'
                "
              ></i>
              {{
                avisoAlta.code === 'CLUB_PENDIENTE'
                  ? 'Tu complejo está en revisión'
                  : 'No pudimos aprobar tu complejo'
              }}
            </p>
            <p class="mt-1.5 pl-6 text-sm leading-relaxed" :class="avisoAlta.code === 'CLUB_PENDIENTE' ? 'text-warning-700/80' : 'text-stone-500'">
              {{ avisoAlta.message }}
            </p>
          </div>

          <!-- Google va arriba del formulario: es el camino más corto, y quien
               ya lo usó antes no tiene que leer el resto. -->
          <template v-if="!isClub">
            <GoogleSignInButton class="mt-7" text="signin_with" @credential="onGoogleCredential" />
            <div class="mt-6 flex items-center gap-3">
              <span class="h-px flex-1 bg-black/[0.08]"></span>
              <span class="text-xs font-medium text-stone-400">o con tu email</span>
              <span class="h-px flex-1 bg-black/[0.08]"></span>
            </div>
          </template>

          <form class="mt-7 space-y-5" @submit.prevent="handleSubmit">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-500" for="email">Email</label>
              <div class="relative">
                <i class="icon-[material-symbols--mail-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  placeholder="tuemail@ejemplo.com"
                  required
                  class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-4 text-sm text-ink-500 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-500" for="password">Contraseña</label>
              <div class="relative">
                <i class="icon-[material-symbols--lock-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Ingresá tu contraseña"
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

            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm text-stone-600">
                <input type="checkbox" class="h-4 w-4 shrink-0 rounded border border-stone-300 bg-white accent-brand-green-500 [color-scheme:light]" />
                Recordarme
              </label>
              <RouterLink :to="forgotTo" class="text-sm font-medium text-brand-green-500 hover:underline">¿Olvidaste tu contraseña?</RouterLink>
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:opacity-60 cursor-pointer"
            >
              <i v-if="isLoading" class="icon-[material-symbols--progress-activity] animate-spin"></i>
              {{ isLoading ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </form>

          <p class="mt-7 text-center text-sm text-stone-500">
            {{ registerLabel }}
            <RouterLink class="font-semibold text-brand-green-500 hover:underline" :to="registerTo">
              {{ registerCta }}
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
          Accedé a tu cuenta y gestioná tus turnos, canchas y clientes desde un solo lugar.
        </p>
      </div>
    </div>
  </section>
</template>
