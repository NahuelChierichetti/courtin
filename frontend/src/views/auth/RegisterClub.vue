<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
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
  () =>
    form.nombre &&
    form.email &&
    form.password &&
    form.clubNombre &&
    form.slug,
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
      owner: {
        nombre: form.nombre,
        email: form.email,
        password: form.password,
      },
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
    errorMessage.value =
      error.response?.data?.message || 'No se pudo registrar el complejo.'
  }
}
</script>

<template>
  <section class="min-h-screen bg-slate-50">
    <div class="min-h-screen w-full bg-white lg:grid lg:grid-cols-2">
      <div class="flex min-h-screen flex-col justify-center px-8 py-10 sm:px-12 lg:px-16">
        <div class="mx-auto w-full max-w-md">
          <RouterLink to="/" class="inline-flex items-center gap-3 no-underline">
            <div class="grid h-10 w-10 place-items-center rounded-xl bg-primitive-dark-500 text-white">
              <span class="text-sm font-bold">CI</span>
            </div>
            <div class="leading-tight">
              <p class="text-sm font-semibold tracking-wide text-slate-900">CourtIn</p>
              <p class="text-xs text-slate-500">Sumá tu complejo</p>
            </div>
          </RouterLink>

          <h1 class="mt-8 text-3xl font-bold text-primitive-dark-500 sm:text-4xl">Registrá tu complejo</h1>
          <p class="mt-3 text-sm leading-relaxed text-primitive-dark-500">
            Creá tu cuenta de administrador y empezá a gestionar tus canchas y turnos.
          </p>

          <Message v-if="errorMessage" severity="error" class="mt-6">
            {{ errorMessage }}
          </Message>

          <form class="mt-6 space-y-5" @submit.prevent="handleSubmit">
            <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Responsable</p>

            <div class="space-y-2">
              <label class="text-sm font-medium text-primitive-dark-500" for="nombre">Nombre</label>
              <InputText id="nombre" v-model="form.nombre" class="w-full" autocomplete="name" placeholder="Tu nombre" required />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-primitive-dark-500" for="email">Email</label>
              <InputText id="email" v-model="form.email" class="w-full" type="email" autocomplete="email" placeholder="tuemail@ejemplo.com" required />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-medium text-primitive-dark-500" for="password">Contraseña</label>
                <Password id="password" v-model="form.password" class="w-full" inputClass="w-full" :feedback="false" toggleMask autocomplete="new-password" placeholder="Mínimo 6 caracteres" required />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium text-primitive-dark-500" for="confirmPassword">Confirmar</label>
                <Password id="confirmPassword" v-model="form.confirmPassword" class="w-full" inputClass="w-full" :feedback="false" toggleMask autocomplete="new-password" placeholder="Repetí la contraseña" required />
              </div>
            </div>

            <p class="!mt-8 text-xs font-semibold uppercase tracking-wider text-slate-400">Complejo</p>

            <div class="space-y-2">
              <label class="text-sm font-medium text-primitive-dark-500" for="clubNombre">Nombre del complejo</label>
              <InputText id="clubNombre" v-model="form.clubNombre" class="w-full" placeholder="Ej: Club Central Pádel" required />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-primitive-dark-500" for="slug">Identificador (URL)</label>
              <InputText id="slug" v-model="form.slug" class="w-full" placeholder="club-central-padel" required @input="onSlugInput" />
              <p class="text-xs text-slate-500">courtin.com/club/{{ form.slug || 'tu-complejo' }}</p>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-medium text-primitive-dark-500" for="ciudad">Ciudad</label>
                <InputText id="ciudad" v-model="form.ciudad" class="w-full" placeholder="Ciudad" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium text-primitive-dark-500" for="provincia">Provincia</label>
                <InputText id="provincia" v-model="form.provincia" class="w-full" placeholder="Provincia" />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-primitive-dark-500" for="direccion">Dirección</label>
              <InputText id="direccion" v-model="form.direccion" class="w-full" placeholder="Calle y número" />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-primitive-dark-500" for="telefono">Teléfono</label>
              <InputText id="telefono" v-model="form.telefono" class="w-full" placeholder="Teléfono de contacto" />
            </div>

            <Button type="submit" label="Registrar complejo" class="w-full" :loading="isLoading" :disabled="!canSubmit" />
          </form>

          <p class="!mt-6 text-center text-sm text-slate-600">
            ¿Ya tenés cuenta de complejo?
            <RouterLink class="font-semibold text-primitive-orange-500 hover:underline" to="/panel/login">
              Ingresá acá
            </RouterLink>
          </p>
        </div>
      </div>

      <div class="relative hidden min-h-screen overflow-hidden bg-primitive-dark-500 lg:block">
        <div class="relative flex h-full flex-col items-center justify-center p-10">
          <div class="max-w-md text-center">
            <p class="text-2xl font-bold text-white">Gestioná tu complejo desde un solo lugar</p>
            <p class="!mt-4 text-sm leading-relaxed text-slate-200">
              Turnos, canchas, horarios y reservas online. Todo integrado para que te ocupes de jugar.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
