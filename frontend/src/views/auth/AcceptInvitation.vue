<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import invitationService from '@/services/invitationService'

const route = useRoute()
const router = useRouter()
const { acceptInvitation, isLoading } = useAuth()

const token = computed(() => route.params.token)

const isVerifying = ref(true)
const invitation = ref(null)
const errorMessage = ref('')

const form = reactive({ nombre: '', password: '' })
const showPassword = ref(false)

const ROLE_LABELS = {
  tenant_admin: 'administrador',
  employee: 'empleado',
}
const rolLabel = computed(() => ROLE_LABELS[invitation.value?.role] || 'miembro del equipo')

onMounted(async () => {
  try {
    const data = await invitationService.get(token.value)
    invitation.value = data.invitation
    form.nombre = data.invitation.nombre || ''
  } catch {
    invitation.value = null
  } finally {
    isVerifying.value = false
  }
})

const handleSubmit = async () => {
  errorMessage.value = ''

  try {
    await acceptInvitation(token.value, {
      nombre: form.nombre,
      // Quien ya tiene cuenta usa su contraseña de siempre.
      password: invitation.value.yaTieneCuenta ? undefined : form.password,
    })
    router.push('/panel/dashboard')
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'No se pudo aceptar la invitación.'
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
          <!-- Validando -->
          <div v-if="isVerifying" class="flex items-center gap-3 text-sm text-stone-500">
            <i class="icon-[material-symbols--progress-activity] animate-spin text-xl text-brand-green-500"></i>
            Verificando la invitación...
          </div>

          <!-- Inválida o vencida -->
          <template v-else-if="!invitation">
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-error-50">
              <i class="icon-[material-symbols--link-off] text-2xl text-error-600"></i>
            </div>
            <h1 class="mt-6 text-3xl font-bold text-ink-500 sm:text-4xl">Invitación no válida</h1>
            <p class="mt-3 text-sm leading-relaxed text-stone-500">
              Este link venció o ya fue usado. Las invitaciones duran 7 días: pedile al complejo que
              te la reenvíe.
            </p>
            <RouterLink
              to="/panel/login"
              class="mt-7 flex h-12 w-full items-center justify-center rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600"
            >
              Ir al inicio de sesión
            </RouterLink>
          </template>

          <!-- Aceptación -->
          <template v-else>
            <h1 class="text-3xl font-bold text-ink-500 sm:text-4xl">
              Sumate a {{ invitation.clubNombre }}
            </h1>
            <p class="mt-3 text-sm leading-relaxed text-stone-500">
              <template v-if="invitation.invitadoPor">
                <span class="font-medium text-ink-500">{{ invitation.invitadoPor }}</span> te invitó
              </template>
              <template v-else>Te invitaron</template>
              a gestionar el complejo como
              <span class="font-medium text-ink-500">{{ rolLabel }}</span>.
            </p>

            <div class="mt-6 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-stone-600">
              <i class="icon-[material-symbols--mail-outline] shrink-0 text-stone-400"></i>
              {{ invitation.email }}
            </div>

            <div v-if="errorMessage" class="mt-6 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600">
              <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMessage }}
            </div>

            <form class="mt-7 space-y-5" @submit.prevent="handleSubmit">
              <!-- Con cuenta existente sólo hace falta confirmar. -->
              <template v-if="!invitation.yaTieneCuenta">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-ink-500" for="nombre">Tu nombre</label>
                  <div class="relative">
                    <i class="icon-[material-symbols--person-outline] absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"></i>
                    <input
                      id="nombre"
                      v-model="form.nombre"
                      type="text"
                      autocomplete="name"
                      placeholder="Nombre y apellido"
                      required
                      class="h-12 w-full rounded-xl border border-black/[0.08] bg-white pl-11 pr-4 text-sm text-ink-500 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                    />
                  </div>
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-ink-500" for="password">Elegí tu contraseña</label>
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
                  <p class="mt-1.5 text-xs text-stone-400">
                    Sólo vos la vas a conocer: nadie del complejo puede verla.
                  </p>
                </div>
              </template>

              <p v-else class="text-sm leading-relaxed text-stone-500">
                Ya tenés una cuenta de CourtIn con este email. Al aceptar, el complejo te va a
                aparecer cuando inicies sesión.
              </p>

              <button
                type="submit"
                :disabled="isLoading"
                class="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:opacity-60 cursor-pointer"
              >
                <i v-if="isLoading" class="icon-[material-symbols--progress-activity] animate-spin"></i>
                {{ isLoading ? 'Aceptando...' : 'Aceptar invitación' }}
              </button>
            </form>
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
          Sumate al equipo y empezá a gestionar turnos, canchas y clientes desde un solo lugar.
        </p>
      </div>
    </div>
  </section>
</template>
