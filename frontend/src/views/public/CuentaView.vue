<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import authService from '@/services/authService'
import AccountNav from '@/components/public/AccountNav.vue'
import VerifyEmailBanner from '@/components/common/VerifyEmailBanner.vue'

const toast = useToast()
const { user, isEmailVerified, updateProfile, refreshUser } = useAuth()

// --- Datos personales ---

const perfil = reactive({ nombre: '', telefono: '' })
const guardandoPerfil = ref(false)
const errorPerfil = ref('')

// `initializeAuth` puede resolver después del primer render, así que el
// formulario se sincroniza con la sesión en vez de leerla una sola vez.
watch(
  user,
  (u) => {
    perfil.nombre = u?.nombre || ''
    perfil.telefono = u?.telefono || ''
  },
  { immediate: true },
)

const perfilSinCambios = computed(
  () =>
    perfil.nombre.trim() === (user.value?.nombre || '') &&
    perfil.telefono.trim() === (user.value?.telefono || ''),
)

const guardarPerfil = async () => {
  errorPerfil.value = ''

  if (!perfil.nombre.trim()) {
    errorPerfil.value = 'El nombre no puede quedar vacío.'
    return
  }

  guardandoPerfil.value = true
  try {
    await updateProfile({ nombre: perfil.nombre.trim(), telefono: perfil.telefono.trim() })
    toast.add({
      severity: 'success',
      summary: 'Datos guardados',
      detail: 'Tu información se actualizó correctamente.',
      life: 4000,
    })
  } catch (error) {
    errorPerfil.value = error.response?.data?.message || 'No pudimos guardar los cambios.'
  } finally {
    guardandoPerfil.value = false
  }
}

// --- Contraseña ---
const tienePassword = computed(() => user.value?.tienePassword !== false)

const password = reactive({ currentPassword: '', password: '', confirmPassword: '' })
const mostrarActual = ref(false)
const mostrarNueva = ref(false)
const guardandoPassword = ref(false)
const errorPassword = ref('')

const cambiarPassword = async () => {
  errorPassword.value = ''

  if (password.password.length < 6) {
    errorPassword.value = 'La contraseña nueva debe tener al menos 6 caracteres.'
    return
  }
  if (password.password !== password.confirmPassword) {
    errorPassword.value = 'Las contraseñas nuevas no coinciden.'
    return
  }

  const definiendo = !tienePassword.value

  guardandoPassword.value = true
  try {
    await authService.changePassword({
      currentPassword: definiendo ? undefined : password.currentPassword,
      password: password.password,
    })
    password.currentPassword = ''
    password.password = ''
    password.confirmPassword = ''

    if (definiendo) await refreshUser()

    toast.add({
      severity: 'success',
      summary: definiendo ? 'Contraseña definida' : 'Contraseña actualizada',
      detail: definiendo
        ? 'Ahora también podés entrar con tu email y contraseña.'
        : 'La próxima vez ingresá con tu contraseña nueva.',
      life: 4000,
    })
  } catch (error) {
    errorPassword.value = error.response?.data?.message || 'No pudimos cambiar la contraseña.'
  } finally {
    guardandoPassword.value = false
  }
}

const inputClass =
  'h-12 w-full rounded-xl border border-black/[0.08] bg-white px-4 text-sm text-brand-green-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100'
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <h1 class="text-2xl font-medium text-brand-green-900">Mi cuenta</h1>
    <p class="mt-1 text-sm text-stone-500">Tus datos y la seguridad de tu cuenta.</p>

    <div class="mt-6">
      <AccountNav />
    </div>

    <div class="mt-6 space-y-6">
      <VerifyEmailBanner />

      <!-- Datos personales -->
      <section class="rounded-2xl border border-black/[0.06] bg-white p-6">
        <h2 class="text-base font-semibold text-brand-green-900">Datos personales</h2>
        <p class="mt-1 text-sm text-stone-500">
          El complejo usa estos datos para contactarte por tu reserva.
        </p>

        <div
          v-if="errorPerfil"
          class="mt-5 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorPerfil }}
        </div>

        <form class="mt-5 space-y-5" @submit.prevent="guardarPerfil">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="nombre">Nombre</label>
            <input id="nombre" v-model="perfil.nombre" autocomplete="name" required :class="inputClass" />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="telefono">
              Teléfono <span class="font-normal text-stone-400">(opcional)</span>
            </label>
            <input
              id="telefono"
              v-model="perfil.telefono"
              type="tel"
              autocomplete="tel"
              placeholder="11 2345 6789"
              :class="inputClass"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="email">Email</label>
            <div class="relative">
              <input
                id="email"
                :value="user?.email"
                type="email"
                disabled
                :class="inputClass"
                class="!bg-stone-50 pr-28 text-stone-500"
              />
              <span
                class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                :class="isEmailVerified ? 'bg-success-50 text-success-600' : 'bg-warning-50 text-warning-600'"
              >
                <i
                  :class="
                    isEmailVerified
                      ? 'icon-[material-symbols--verified]'
                      : 'icon-[material-symbols--schedule]'
                  "
                  class="text-sm"
                ></i>
                {{ isEmailVerified ? 'Verificado' : 'Sin verificar' }}
              </span>
            </div>
            <p class="mt-1.5 text-xs text-stone-500">
              El email es con el que iniciás sesión. Escribinos si necesitás cambiarlo.
            </p>
          </div>

          <button
            type="submit"
            :disabled="guardandoPerfil || perfilSinCambios"
            class="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:opacity-50 cursor-pointer sm:w-auto sm:px-8"
          >
            <i v-if="guardandoPerfil" class="icon-[material-symbols--progress-activity] animate-spin"></i>
            {{ guardandoPerfil ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </form>
      </section>

      <!-- Contraseña -->
      <section class="rounded-2xl border border-black/[0.06] bg-white p-6">
        <h2 class="text-base font-semibold text-brand-green-900">
          {{ tienePassword ? 'Contraseña' : 'Definir contraseña' }}
        </h2>
        <p class="mt-1 text-sm text-stone-500">
          {{
            tienePassword
              ? 'Te pedimos la actual para confirmar que sos vos.'
              : 'Entrás con Google. Si querés, podés sumar una contraseña para entrar también con tu email.'
          }}
        </p>

        <div
          v-if="errorPassword"
          class="mt-5 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600"
        >
          <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorPassword }}
        </div>

        <form class="mt-5 space-y-5" @submit.prevent="cambiarPassword">
          <!-- Sin contraseña que cambiar no hay una actual que pedir. -->
          <div v-if="tienePassword">
            <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="currentPassword">
              Contraseña actual
            </label>
            <div class="relative">
              <input
                id="currentPassword"
                v-model="password.currentPassword"
                :type="mostrarActual ? 'text' : 'password'"
                autocomplete="current-password"
                required
                :class="inputClass"
                class="pr-11"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 cursor-pointer"
                @click="mostrarActual = !mostrarActual"
              >
                <i
                  :class="
                    mostrarActual
                      ? 'icon-[material-symbols--visibility-off]'
                      : 'icon-[material-symbols--visibility]'
                  "
                ></i>
              </button>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="newPassword">
              {{ tienePassword ? 'Contraseña nueva' : 'Contraseña' }}
            </label>
            <div class="relative">
              <input
                id="newPassword"
                v-model="password.password"
                :type="mostrarNueva ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Mínimo 6 caracteres"
                required
                :class="inputClass"
                class="pr-11"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600 cursor-pointer"
                @click="mostrarNueva = !mostrarNueva"
              >
                <i
                  :class="
                    mostrarNueva
                      ? 'icon-[material-symbols--visibility-off]'
                      : 'icon-[material-symbols--visibility]'
                  "
                ></i>
              </button>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-brand-green-900" for="confirmPassword">
              {{ tienePassword ? 'Repetir contraseña nueva' : 'Repetir contraseña' }}
            </label>
            <input
              id="confirmPassword"
              v-model="password.confirmPassword"
              :type="mostrarNueva ? 'text' : 'password'"
              autocomplete="new-password"
              required
              :class="inputClass"
            />
          </div>

          <button
            type="submit"
            :disabled="guardandoPassword"
            class="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white text-sm font-semibold text-brand-green-900 transition-colors hover:bg-stone-50 disabled:opacity-50 cursor-pointer sm:w-auto sm:px-8"
          >
            <i v-if="guardandoPassword" class="icon-[material-symbols--progress-activity] animate-spin"></i>
            {{
              guardandoPassword
                ? tienePassword
                  ? 'Cambiando...'
                  : 'Definiendo...'
                : tienePassword
                  ? 'Cambiar contraseña'
                  : 'Definir contraseña'
            }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>
