<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import subscriptionService from '@/services/subscriptionService'
import LocationFields from '@/components/common/LocationFields.vue'

const { registerClub, isLoading } = useAuth()

// Alta de complejo en pasos.
//
// El formulario de antes era una sola columna con diez campos mezclando el club
// y a la persona; se abandonaba a la mitad. Partirlo cambia dos cosas: cada
// pantalla pide una cosa sola, y se puede validar de a poco en vez de escupir
// seis errores juntos al final.
//
// El paso 4 no es un paso: es el acuse de que la solicitud quedó pendiente de
// aprobación. Se muestra después de enviar y no tiene vuelta atrás.
const PASOS = [
  { n: 1, titulo: 'Tu complejo', icon: 'icon-[material-symbols--stadium-outline]' },
  { n: 2, titulo: 'Administrador', icon: 'icon-[material-symbols--person-outline]' },
  { n: 3, titulo: 'Deportes', icon: 'icon-[material-symbols--sports-soccer]' },
]

// El orden es el de la cancha típica argentina, no el del catálogo: pádel
// primero porque es lo que más se alquila.
const DEPORTES = [
  { key: 'padel', label: 'Pádel', icon: 'icon-[material-symbols--sports-tennis]' },
  { key: 'futbol', label: 'Fútbol', icon: 'icon-[material-symbols--sports-soccer]' },
  { key: 'tenis', label: 'Tenis', icon: 'icon-[material-symbols--sports-tennis-outline]' },
  { key: 'basquet', label: 'Básquet', icon: 'icon-[material-symbols--sports-basketball]' },
  { key: 'otro', label: 'Otros', icon: 'icon-[material-symbols--more-horiz]' },
]

const step = ref(1)
const enviado = ref(false)
const errorMessage = ref('')

const form = reactive({
  // Paso 1 · complejo
  clubNombre: '',
  clubTelefono: '',
  clubEmail: '',
  cantidadCanchas: '',
  provincia: '',
  ciudad: '',
  direccion: '',
  // Coordenadas que devuelve el nomenclador al verificar la dirección. Quedan
  // null si no la reconoció: el alta sigue igual, sólo que el complejo entra sin
  // punto en el mapa.
  ubicacion: null,
  // Paso 2 · administrador
  adminNombre: '',
  adminApellido: '',
  adminEmail: '',
  adminTelefono: '',
  password: '',
  confirmPassword: '',
  // Paso 3 · deportes
  deportes: [],
})

const showPassword = ref(false)
const showConfirm = ref(false)

// --- Plan según las canchas declaradas ---

const planes = ref([])

onMounted(async () => {
  try {
    const { planes: catalogo } = await subscriptionService.getPlanes()
    planes.value = catalogo || []
  } catch {
    // El catálogo es informativo: sin él el alta funciona igual, sólo que sin
    // el cartelito del plan. No vale la pena molestar con un error.
  }
})

const canchas = computed(() => {
  const n = Number(form.cantidadCanchas)
  return Number.isInteger(n) && n > 0 ? n : 0
})

// Espejo de `planParaCanchas` del backend: el primer plan cuyo tope alcanza.
// `maxCanchas: null` es el plan sin límite.
const planSugerido = computed(() => {
  if (!canchas.value || !planes.value.length) return null
  return (
    planes.value.find((p) => p.maxCanchas === null || canchas.value <= p.maxCanchas) ||
    planes.value[planes.value.length - 1]
  )
})

const money = (valor) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor || 0)

// --- Deportes ---

const toggleDeporte = (key) => {
  const i = form.deportes.indexOf(key)
  if (i >= 0) form.deportes.splice(i, 1)
  else form.deportes.push(key)
}

// --- Navegación entre pasos ---

const validarPaso1 = () => {
  if (!form.clubNombre.trim()) return 'Escribí el nombre del complejo.'
  if (!form.clubTelefono.trim()) return 'Falta el teléfono del complejo.'
  if (!form.clubEmail.trim()) return 'Falta el email donde recibir los avisos.'
  if (!canchas.value) return 'Indicá cuántas canchas tiene el complejo.'
  if (!form.provincia) return 'Elegí la provincia.'
  if (!form.ciudad) return 'Elegí la ciudad.'
  if (!form.direccion.trim()) return 'Falta la dirección del complejo.'
  return ''
}

const validarPaso2 = () => {
  if (!form.adminNombre.trim() || !form.adminApellido.trim()) return 'Completá nombre y apellido.'
  if (!form.adminEmail.trim()) return 'Falta el email del administrador.'
  if (!form.adminTelefono.trim()) return 'Falta el teléfono del administrador.'
  if (form.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.'
  if (form.password !== form.confirmPassword) return 'Las contraseñas no coinciden.'
  return ''
}

const validarPaso3 = () => (form.deportes.length ? '' : 'Elegí al menos un deporte.')

const validadores = { 1: validarPaso1, 2: validarPaso2, 3: validarPaso3 }

const siguiente = () => {
  const error = validadores[step.value]()
  if (error) {
    errorMessage.value = error
    return
  }

  errorMessage.value = ''

  if (step.value < 3) {
    step.value += 1
    return
  }

  enviar()
}

const volver = () => {
  errorMessage.value = ''
  if (step.value > 1) step.value -= 1
}

const enviar = async () => {
  errorMessage.value = ''

  try {
    await registerClub({
      club: {
        nombre: form.clubNombre.trim(),
        email: form.clubEmail.trim(),
        telefono: form.clubTelefono.trim(),
        cantidadCanchas: canchas.value,
        provincia: form.provincia,
        ciudad: form.ciudad,
        direccion: form.direccion.trim(),
        ubicacion: form.ubicacion,
        deportes: form.deportes,
      },
      admin: {
        nombre: form.adminNombre.trim(),
        apellido: form.adminApellido.trim(),
        email: form.adminEmail.trim(),
        telefono: form.adminTelefono.trim(),
        password: form.password,
      },
    })

    enviado.value = true
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message || 'No se pudo enviar la solicitud. Probá de nuevo.'
  }
}

const inputBase =
  'h-12 w-full rounded-xl border border-black/[0.08] bg-white text-sm text-ink-500 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100'
const labelBase = 'mb-1.5 block text-sm font-medium text-ink-500'
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
        <!-- Paso final · solicitud enviada -->
        <div v-if="enviado" class="mx-auto w-full max-w-md text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-lime-100">
            <i class="icon-[material-symbols--mark-email-read-outline] text-3xl text-brand-green-600"></i>
          </div>

          <h1 class="mt-6 text-3xl font-bold text-ink-500">Solicitud enviada</h1>
          <p class="mt-3 text-sm leading-relaxed text-stone-500">
            El alta de <strong class="text-ink-500">{{ form.clubNombre }}</strong> quedó
            <strong class="text-ink-500">pendiente de aprobación</strong>. Nuestro equipo la revisa y
            te avisamos por email a
            <strong class="text-ink-500">{{ form.adminEmail }}</strong> en cuanto esté lista.
          </p>

          <div class="mt-8 space-y-3 rounded-2xl border border-black/[0.06] bg-white p-6 text-left">
            <p class="text-xs font-bold uppercase tracking-wider text-stone-400">Qué sigue</p>
            <div class="flex gap-3">
              <i class="icon-[material-symbols--mail-outline] mt-0.5 shrink-0 text-brand-green-500"></i>
              <p class="text-sm leading-relaxed text-stone-600">
                Ya te mandamos un correo confirmando que recibimos la solicitud.
              </p>
            </div>
            <div class="flex gap-3">
              <i class="icon-[material-symbols--how-to-reg-outline] mt-0.5 shrink-0 text-brand-green-500"></i>
              <p class="text-sm leading-relaxed text-stone-600">
                Cuando aprobemos el alta vas a poder entrar al panel con el email y la contraseña que
                elegiste.
              </p>
            </div>
            <div class="flex gap-3">
              <i class="icon-[material-symbols--schedule-outline] mt-0.5 shrink-0 text-brand-green-500"></i>
              <p class="text-sm leading-relaxed text-stone-600">
                Tus 30 días de prueba gratis arrancan recién ese día: la espera no te descuenta
                nada.
              </p>
            </div>
          </div>

          <RouterLink
            to="/"
            class="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white px-6 text-sm font-semibold text-ink-500 no-underline transition-colors hover:bg-stone-50"
          >
            <i class="icon-[material-symbols--arrow-back] text-base"></i>
            Volver al inicio
          </RouterLink>
        </div>

        <!-- Pasos 1 a 3 -->
        <div v-else class="mx-auto w-full max-w-md">
          <h1 class="text-3xl font-bold text-ink-500 sm:text-4xl">Registrá tu complejo</h1>
          <p class="mt-3 text-sm leading-relaxed text-stone-500">
            Contanos de tu complejo y lo damos de alta. Son tres pasos y no lleva más de dos
            minutos.
          </p>

          <!-- Stepper -->
          <ol class="mt-8 flex items-center gap-2">
            <li v-for="(paso, i) in PASOS" :key="paso.n" class="flex flex-1 items-center gap-2">
              <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                <div class="flex items-center gap-2">
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors"
                    :class="
                      step > paso.n
                        ? 'bg-brand-green-500 text-white'
                        : step === paso.n
                          ? 'bg-brand-lime-500 text-brand-green-900'
                          : 'bg-white text-stone-400 ring-1 ring-black/[0.06]'
                    "
                  >
                    <i v-if="step > paso.n" class="icon-[material-symbols--check] text-sm"></i>
                    <template v-else>{{ paso.n }}</template>
                  </span>
                  <span
                    class="truncate text-xs font-semibold"
                    :class="step >= paso.n ? 'text-ink-500' : 'text-stone-400'"
                  >
                    {{ paso.titulo }}
                  </span>
                </div>
                <div
                  class="h-1 rounded-full transition-colors"
                  :class="step >= paso.n ? 'bg-brand-green-500' : 'bg-black/[0.06]'"
                ></div>
              </div>
              <i
                v-if="i < PASOS.length - 1"
                class="icon-[material-symbols--chevron-right] hidden shrink-0 text-stone-300 sm:block"
              ></i>
            </li>
          </ol>

          <div
            v-if="errorMessage"
            class="mt-6 flex items-center gap-2 rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-600"
          >
            <i class="icon-[material-symbols--error] shrink-0"></i>{{ errorMessage }}
          </div>

          <form class="mt-7 space-y-5" @submit.prevent="siguiente">
            <!-- ── Paso 1 · el complejo ── -->
            <template v-if="step === 1">
              <div>
                <label :class="labelBase" for="clubNombre">Nombre del complejo</label>
                <input
                  id="clubNombre"
                  v-model="form.clubNombre"
                  placeholder="Ej: Club Central Pádel"
                  :class="inputBase"
                  class="px-4"
                />
              </div>

              <div>
                <label :class="labelBase" for="clubTelefono">Teléfono del complejo</label>
                <input
                  id="clubTelefono"
                  v-model="form.clubTelefono"
                  type="tel"
                  placeholder="Ej: 341 555-1234"
                  :class="inputBase"
                  class="px-4"
                />
              </div>

              <div>
                <label :class="labelBase" for="clubEmail">Email del complejo</label>
                <input
                  id="clubEmail"
                  v-model="form.clubEmail"
                  type="email"
                  placeholder="reservas@tucomplejo.com"
                  :class="inputBase"
                  class="px-4"
                />
                <p class="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-stone-400">
                  <i class="icon-[material-symbols--info-outline] mt-px shrink-0 text-sm"></i>
                  A esta casilla te van a llegar los avisos de nuevas reservas y de cancelaciones.
                </p>
              </div>

              <div>
                <label :class="labelBase" for="cantidadCanchas">Cantidad de canchas</label>
                <input
                  id="cantidadCanchas"
                  v-model="form.cantidadCanchas"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ej: 4"
                  :class="inputBase"
                  class="px-4"
                />

                <!-- El plan sale de acá, así que conviene decirlo antes y no en
                     la primera factura. -->
                <div
                  v-if="planSugerido"
                  class="mt-2.5 rounded-xl border border-brand-green-100 bg-brand-green-50 px-4 py-3"
                >
                  <p class="flex items-center gap-1.5 text-xs font-semibold text-brand-green-700">
                    <i class="icon-[material-symbols--verified-outline] text-sm"></i>
                    Te corresponde el plan {{ planSugerido.label }}
                  </p>
                  <p class="mt-1 text-xs leading-relaxed text-brand-green-700/80">
                    {{ money(planSugerido.precios.mensual) }} por mes, después de los 30 días de
                    prueba gratis. Todas las funciones están en todos los planes: sólo cambia
                    cuántas canchas podés cargar.
                  </p>
                </div>
              </div>

              <LocationFields
                v-model:provincia="form.provincia"
                v-model:ciudad="form.ciudad"
                v-model:direccion="form.direccion"
                :label-class="labelBase"
                control-class="h-12 field-lg"
                @update:ubicacion="form.ubicacion = $event"
              />
            </template>

            <!-- ── Paso 2 · el administrador ── -->
            <template v-else-if="step === 2">
              <p class="text-sm leading-relaxed text-stone-500">
                Estos son tus datos personales: con este email y contraseña vas a entrar al panel.
              </p>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label :class="labelBase" for="adminNombre">Nombre</label>
                  <input
                    id="adminNombre"
                    v-model="form.adminNombre"
                    autocomplete="given-name"
                    placeholder="Tu nombre"
                    :class="inputBase"
                    class="px-4"
                  />
                </div>
                <div>
                  <label :class="labelBase" for="adminApellido">Apellido</label>
                  <input
                    id="adminApellido"
                    v-model="form.adminApellido"
                    autocomplete="family-name"
                    placeholder="Tu apellido"
                    :class="inputBase"
                    class="px-4"
                  />
                </div>
              </div>

              <div>
                <label :class="labelBase" for="adminEmail">Email</label>
                <input
                  id="adminEmail"
                  v-model="form.adminEmail"
                  type="email"
                  autocomplete="email"
                  placeholder="tuemail@ejemplo.com"
                  :class="inputBase"
                  class="px-4"
                />
              </div>

              <div>
                <label :class="labelBase" for="adminTelefono">Teléfono</label>
                <input
                  id="adminTelefono"
                  v-model="form.adminTelefono"
                  type="tel"
                  autocomplete="tel"
                  placeholder="Tu teléfono de contacto"
                  :class="inputBase"
                  class="px-4"
                />
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label :class="labelBase" for="password">Contraseña</label>
                  <div class="relative">
                    <input
                      id="password"
                      v-model="form.password"
                      :type="showPassword ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="Mín. 6 caracteres"
                      :class="inputBase"
                      class="pl-4 pr-10"
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-stone-400 hover:text-stone-600"
                      @click="showPassword = !showPassword"
                    >
                      <i :class="showPassword ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                    </button>
                  </div>
                </div>
                <div>
                  <label :class="labelBase" for="confirmPassword">Repetir contraseña</label>
                  <div class="relative">
                    <input
                      id="confirmPassword"
                      v-model="form.confirmPassword"
                      :type="showConfirm ? 'text' : 'password'"
                      autocomplete="new-password"
                      placeholder="Repetí la contraseña"
                      :class="inputBase"
                      class="pl-4 pr-10"
                    />
                    <button
                      type="button"
                      class="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-stone-400 hover:text-stone-600"
                      @click="showConfirm = !showConfirm"
                    >
                      <i :class="showConfirm ? 'icon-[material-symbols--visibility-off]' : 'icon-[material-symbols--visibility]'"></i>
                    </button>
                  </div>
                </div>
              </div>
            </template>

            <!-- ── Paso 3 · los deportes ── -->
            <template v-else>
              <p class="text-sm leading-relaxed text-stone-500">
                ¿Qué se juega en tu complejo? Elegí todos los que correspondan. Después vas a poder
                cargar canchas sólo de estos deportes.
              </p>

              <div class="grid grid-cols-2 gap-3">
                <button
                  v-for="d in DEPORTES"
                  :key="d.key"
                  type="button"
                  class="flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-white px-4 py-4 text-left transition-all"
                  :class="
                    form.deportes.includes(d.key)
                      ? 'border-brand-green-500 shadow-sm'
                      : 'border-black/[0.06] hover:border-black/[0.12]'
                  "
                  @click="toggleDeporte(d.key)"
                >
                  <i
                    :class="[d.icon, form.deportes.includes(d.key) ? 'text-brand-green-600' : 'text-stone-400']"
                    class="text-2xl transition-colors"
                  ></i>
                  <span
                    class="flex-1 text-sm font-semibold"
                    :class="form.deportes.includes(d.key) ? 'text-ink-500' : 'text-stone-500'"
                  >
                    {{ d.label }}
                  </span>
                  <i
                    v-if="form.deportes.includes(d.key)"
                    class="icon-[material-symbols--check-circle] shrink-0 text-lg text-brand-green-500"
                  ></i>
                </button>
              </div>

              <p class="flex items-start gap-1.5 text-xs leading-relaxed text-stone-400">
                <i class="icon-[material-symbols--info-outline] mt-px shrink-0 text-sm"></i>
                Al enviar, la solicitud queda pendiente de aprobación: revisamos los datos y te
                avisamos por email cuando el complejo esté activo.
              </p>
            </template>

            <!-- Navegación -->
            <div class="flex items-center gap-3 pt-2">
              <button
                v-if="step > 1"
                type="button"
                class="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-black/[0.08] bg-white px-6 text-sm font-semibold text-ink-500 transition-colors hover:bg-stone-50"
                @click="volver"
              >
                <i class="icon-[material-symbols--arrow-back] text-base"></i>
                Atrás
              </button>

              <button
                type="submit"
                :disabled="isLoading"
                class="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-lime-500 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i v-if="isLoading" class="icon-[material-symbols--progress-activity] animate-spin"></i>
                {{ step < 3 ? 'Continuar' : isLoading ? 'Enviando...' : 'Enviar solicitud' }}
                <i v-if="step < 3" class="icon-[material-symbols--arrow-forward] text-base"></i>
              </button>
            </div>
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
      <img src="/images/banner-web.jpg" alt="" aria-hidden="true" class="absolute inset-0 h-full w-full object-cover object-[72%_50%] mix-blend-luminosity" />
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
