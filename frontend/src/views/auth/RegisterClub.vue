<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const router = useRouter()
const { registerClub, resolveLanding, isLoading } = useAuth()

const form = reactive({
  // Responsable / dueño del complejo
  nombre: '',
  email: '',
  password: '',
  confirmPassword: '',
  // Complejo
  clubNombre: '',
  slug: '',
  ciudad: '',
  provincia: '',
  direccion: '',
  telefono: '',
})

const showPassword = ref(false)
const showConfirm = ref(false)

// El slug se autogenera desde el nombre del complejo hasta que el usuario lo
// edite manualmente (para no pisar su elección).
const slugTouched = ref(false)
const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

watch(
  () => form.clubNombre,
  (value) => {
    if (!slugTouched.value) form.slug = slugify(value)
  },
)

const onSlugInput = () => {
  slugTouched.value = true
  form.slug = slugify(form.slug)
}

const errorMessage = ref('')

const canSubmit = computed(
  () => form.nombre && form.email && form.password && form.clubNombre && form.slug,
)

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
    await registerClub({
      owner: { nombre: form.nombre, email: form.email, password: form.password },
      club: {
        nombre: form.clubNombre,
        slug: form.slug,
        ciudad: form.ciudad,
        provincia: form.provincia,
        direccion: form.direccion,
        telefono: form.telefono,
      },
    })

    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : resolveLanding()
    router.push(redirect)
  } catch (error) {
    errorMessage.value = error.response?.data?.message || 'No se pudo registrar el complejo.'
  }
}

// Clases compartidas de input.
const inputBase =
  'h-12 w-full rounded-xl border border-black/[0.08] bg-white text-sm text-ink-500 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100'
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
          <h1 class="text-3xl font-bold text-ink-500 sm:text-4xl">Registrá tu complejo</h1>
          <p class="mt-3 text-sm leading-relaxed text-stone-500">
            Creá tu cuenta de administrador y empezá a gestionar tus canchas y turnos.
          </p>

          <div v-if="errorMessage" class="mt-6 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600">
            <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMessage }}
          </div>

          <form class="mt-7 space-y-5" @submit.prevent="handleSubmit">
            <!-- Responsable -->
            <p class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
              <i class="icon-[material-symbols--person-outline] text-sm text-brand-green-500"></i> Responsable
            </p>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-500" for="nombre">Nombre</label>
              <input id="nombre" v-model="form.nombre" autocomplete="name" placeholder="Tu nombre" required :class="inputBase" class="px-4" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-500" for="email">Email</label>
              <input id="email" v-model="form.email" type="email" autocomplete="email" placeholder="tuemail@ejemplo.com" required :class="inputBase" class="px-4" />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-ink-500" for="password">Contraseña</label>
                <div class="relative">
                  <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="Mín. 6" required :class="inputBase" class="pl-4 pr-10" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer" @click="showPassword = !showPassword">
                    <i :class="showPassword ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                  </button>
                </div>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-ink-500" for="confirmPassword">Confirmar</label>
                <div class="relative">
                  <input id="confirmPassword" v-model="form.confirmPassword" :type="showConfirm ? 'text' : 'password'" autocomplete="new-password" placeholder="Repetí" required :class="inputBase" class="pl-4 pr-10" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer" @click="showConfirm = !showConfirm">
                    <i :class="showConfirm ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Complejo -->
            <p class="!mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
              <i class="icon-[material-symbols--apartment] text-sm text-brand-green-500"></i> Complejo
            </p>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-500" for="clubNombre">Nombre del complejo</label>
              <input id="clubNombre" v-model="form.clubNombre" placeholder="Ej: Club Central Pádel" required :class="inputBase" class="px-4" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-500" for="slug">Identificador (URL)</label>
              <input id="slug" v-model="form.slug" placeholder="club-central-padel" required :class="inputBase" class="px-4" @input="onSlugInput" />
              <p class="mt-2.5 text-xs text-stone-400">courtinapp.com/club/{{ form.slug || 'tu-complejo' }}</p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-ink-500" for="ciudad">Ciudad</label>
                <input id="ciudad" v-model="form.ciudad" placeholder="Ciudad" :class="inputBase" class="px-4" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-ink-500" for="provincia">Provincia</label>
                <input id="provincia" v-model="form.provincia" placeholder="Provincia" :class="inputBase" class="px-4" />
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-500" for="direccion">Dirección</label>
              <input id="direccion" v-model="form.direccion" placeholder="Calle y número" :class="inputBase" class="px-4" />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink-500" for="telefono">Teléfono</label>
              <input id="telefono" v-model="form.telefono" placeholder="Teléfono de contacto" :class="inputBase" class="px-4" />
            </div>

            <button
              type="submit"
              :disabled="isLoading || !canSubmit"
              class="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <i v-if="isLoading" class="icon-[material-symbols--progress-activity] animate-spin"></i>
              {{ isLoading ? 'Registrando...' : 'Registrar complejo' }}
            </button>
          </form>

          <p class="mt-7 text-center text-sm text-stone-500">
            ¿Ya tenés cuenta de complejo?
            <RouterLink class="font-semibold text-brand-green-500 hover:underline" to="/panel/login">
              Ingresá acá
            </RouterLink>
          </p>
        </div>
      </div>
    </div>

    <!-- Columna branding (fija) -->
    <div class="relative hidden overflow-hidden bg-brand-green-700 lg:sticky lg:top-0 lg:block lg:h-screen">
      <img src="/images/hero-tenista.png" alt="" aria-hidden="true" class="absolute inset-0 h-full w-full object-cover object-center mix-blend-luminosity" />
      <div class="absolute inset-0 bg-gradient-to-t from-brand-green-900 via-brand-green-900/40 to-brand-green-900/10"></div>

      <div class="relative flex h-full flex-col justify-end p-12">
        <h2 class="text-4xl font-bold leading-tight text-white">
          Tu complejo,<br />todo <span class="text-brand-lime-500">en juego.</span>
        </h2>
        <p class="mt-4 text-sm font-semibold tracking-[0.15em] text-white/70 uppercase">Gestioná · Reservá · Jugá</p>
        <p class="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          Turnos, canchas, horarios y reservas online. Todo integrado para que te ocupes de jugar.
        </p>
      </div>
    </div>
  </section>
</template>
