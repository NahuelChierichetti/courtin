<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import clubService from '@/services/clubService'
import courtService from '@/services/courtService'
import publicService from '@/services/publicService'
import { useAuth } from '@/composables/useAuth'
import { dayjs, formatCurrency } from '@/utils/datetime'
import Select from 'primevue/select'
import LocationFields from '@/components/common/LocationFields.vue'
import ClubMap from '@/components/common/ClubMap.vue'
import ClubCard from '@/components/public/ClubCard.vue'
import { parseCoordenadas, esLinkCorto, formatCoords, tieneCoords } from '@/utils/maps'
import MercadoPagoDrawer from '@/components/config/MercadoPagoDrawer.vue'
import ImageUpload from '@/components/config/ImageUpload.vue'

const { currentClubId, patchCurrentClub } = useAuth()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const form = ref(null)
const loading = ref(false)
const saving = ref(false)
const error = ref(null)

const activeTab = ref('general')
const tabs = [
  { key: 'general', label: 'General', icon: 'icon-[material-symbols--settings]', desc: 'Datos, zona horaria y moneda' },
  { key: 'link', label: 'Link de reservas', icon: 'icon-[material-symbols--link]', desc: 'Tu URL pública única' },
  { key: 'landing', label: 'Landing pública', icon: 'icon-[material-symbols--imagesmode]', desc: 'Logo, fotos y servicios' },
  { key: 'pagos', label: 'Pagos', icon: 'icon-[material-symbols--credit-card]', desc: 'Pasarelas de cobro' },
]

const timezoneOptions = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { value: 'America/Montevideo', label: 'Uruguay (Montevideo)' },
  { value: 'America/Santiago', label: 'Chile (Santiago)' },
  { value: 'America/Asuncion', label: 'Paraguay (Asunción)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (São Paulo)' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'Europe/Madrid', label: 'España (Madrid)' },
  { value: 'UTC', label: 'UTC' },
]
const monedaOptions = [
  { value: 'ARS', label: 'Peso argentino (ARS)' },
  { value: 'UYU', label: 'Peso uruguayo (UYU)' },
  { value: 'CLP', label: 'Peso chileno (CLP)' },
  { value: 'BRL', label: 'Real brasileño (BRL)' },
  { value: 'COP', label: 'Peso colombiano (COP)' },
  { value: 'MXN', label: 'Peso mexicano (MXN)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
]

const now = ref(dayjs.utc())
let clockTimer = null
const localTimePreview = computed(() => (form.value?.timezone ? now.value.tz(form.value.timezone).format('dddd D [de] MMMM, HH:mm') : ''))
const pricePreview = computed(() => formatCurrency(15000, form.value?.moneda || 'ARS'))

// --- Deportes/precio para la preview de la card (de las canchas del club) ---
const previewDeportes = ref([])
const previewPrecio = ref(null)
const fetchCourtsMeta = async () => {
  if (!currentClubId.value) return
  try {
    const { courts } = await courtService.getCourts(currentClubId.value)
    previewDeportes.value = [...new Set(courts.map((c) => c.tipo))]
    const precios = courts.flatMap((c) => (c.tarifas || []).map((t) => t.precio)).filter((n) => typeof n === 'number')
    previewPrecio.value = precios.length ? Math.min(...precios) : null
  } catch (err) {
    console.error(err)
  }
}

// --- Slug ---
const slugify = (s) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const originalSlug = ref('')
const slugStatus = ref('idle') // idle | checking | available | taken | invalid
let slugTimer = null

const onSlugInput = () => {
  form.value.slug = slugify(form.value.slug)
}

watch(
  () => form.value?.slug,
  (v) => {
    clearTimeout(slugTimer)
    if (v === undefined) return
    if (!v) return (slugStatus.value = 'invalid')
    if (v === originalSlug.value) return (slugStatus.value = 'available')
    if (v.length < 3) return (slugStatus.value = 'invalid')
    slugStatus.value = 'checking'
    slugTimer = setTimeout(async () => {
      try {
        const r = await publicService.checkSlug(v, form.value._id)
        slugStatus.value = r.available ? 'available' : r.reason === 'formato' ? 'invalid' : 'taken'
      } catch {
        slugStatus.value = 'idle'
      }
    }, 400)
  },
)

const fullLink = computed(() => `courtinapp.com/club/${form.value?.slug || 'tu-complejo'}`)
const copiedLink = ref(false)
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(`https://${fullLink.value}`)
    copiedLink.value = true
    setTimeout(() => (copiedLink.value = false), 1800)
  } catch (err) {
    console.error(err)
  }
}

// --- Landing: imágenes ---
const destacada = computed({
  get: () => form.value?.fotos?.[0] || '',
  set: (v) => {
    if (!form.value.fotos) form.value.fotos = []
    if (form.value.fotos.length === 0) form.value.fotos.push(v)
    else form.value.fotos[0] = v
  },
})
const galeria = computed(() => (form.value?.fotos || []).slice(1))
// Al subir en el tile "Agregar", se anexa a la galería (índice 0 = destacada).
const onGalleryAdd = (url) => {
  if (!url) return
  if (!form.value.fotos) form.value.fotos = []
  if (form.value.fotos.length === 0) form.value.fotos.push('') // reservar la destacada
  form.value.fotos.push(url)
}
const removeGaleria = (idx) => form.value.fotos.splice(idx + 1, 1)

// --- Landing: ubicación en el mapa ---
//
// El pin sale de geocodificar la dirección, que acierta la cuadra pero no
// siempre la puerta: un complejo sobre una avenida larga o en un country queda
// corrido, y el jugador que sigue el mapa termina en otro lado. Por eso se puede
// fijar a mano.
//
// Se pide pegar el link (o las coordenadas) de Google Maps en vez de arrastrar
// un pin porque un mapa interactivo necesita la JS API de Google, que exige una
// key con facturación. Copiar coordenadas desde Google Maps es un clic derecho.
const coordsDraft = ref('')
const coordsError = ref('')

const ubicacionActual = computed(() => form.value?.ubicacion || null)
const ubicacionTexto = computed(() => formatCoords(ubicacionActual.value))
const tieneUbicacion = computed(() => tieneCoords(ubicacionActual.value))

const aplicarCoords = () => {
  const punto = parseCoordenadas(coordsDraft.value)

  if (!punto) {
    coordsError.value = esLinkCorto(coordsDraft.value)
      ? 'Los links cortos (maps.app.goo.gl) no traen las coordenadas. Abrilo en Google Maps y copiá el link de la barra de direcciones, o pegá las coordenadas.'
      : 'No encontramos coordenadas ahí. Pegá el link de Google Maps o un par como -34.603, -58.381.'
    return
  }

  form.value.ubicacion = punto
  coordsDraft.value = ''
  coordsError.value = ''
}

// Vuelve al modo automático: sin coordenadas, el mapa ubica la dirección escrita.
const quitarUbicacion = () => {
  form.value.ubicacion = null
  coordsDraft.value = ''
  coordsError.value = ''
}

// Geocodificar la dirección pisa el pin sólo cuando devuelve un punto. El
// componente emite `null` con cada tecla del campo dirección; tomarlo al pie de
// la letra borraría el pin que el complejo ajustó a mano por empezar a corregir
// una coma en la dirección.
const onUbicacionGeo = (punto) => {
  if (punto) form.value.ubicacion = punto
}

// --- Servicios (chips) ---
const servicioDraft = ref('')
const addServicio = () => {
  const value = servicioDraft.value.trim()
  if (!value) return
  if (!form.value.servicios.some((s) => s.toLowerCase() === value.toLowerCase())) form.value.servicios.push(value)
  servicioDraft.value = ''
}
const removeServicio = (i) => form.value.servicios.splice(i, 1)
const onServicioBackspace = () => {
  if (!servicioDraft.value && form.value.servicios.length) form.value.servicios.pop()
}

// --- Avisos por email ---
// Los switches escriben acá y no directamente sobre `form`. Es una red de
// seguridad: si `form` se armó sin el objeto `notificaciones` (una config vieja,
// o un hot-reload que conservó el estado anterior), el v-model escribiría sobre
// undefined y rompería la vista.
const notificaciones = computed({
  get: () => {
    if (form.value && !form.value.notificaciones) {
      form.value.notificaciones = { nuevaReserva: true, cancelacion: true }
    }
    return form.value?.notificaciones || { nuevaReserva: true, cancelacion: true }
  },
  set: (v) => {
    if (form.value) form.value.notificaciones = v
  },
})

// --- Preview de la card ---
const previewClub = computed(() => ({
  _id: 'preview',
  nombre: form.value?.nombre || 'Tu complejo',
  direccion: form.value?.direccion,
  ciudad: form.value?.ciudad,
  fotos: (form.value?.fotos || []).filter(Boolean),
  logo: form.value?.logo,
  deportes: previewDeportes.value,
  precioDesde: previewPrecio.value,
  moneda: form.value?.moneda || 'ARS',
}))

// --- Pagos ---
// La config de cobros no viaja con el botón "Guardar cambios" de la vista (que
// está oculto en esta pestaña): la guarda el propio drawer y devuelve el club
// actualizado por `updated`.
const mpOpen = ref(false)
const pagos = ref({})
const mpConectado = computed(() => pagos.value?.mp?.conectado === true)

const onPagosUpdated = (club) => {
  pagos.value = club?.pagos || {}
}

// Vuelta del OAuth de MercadoPago: el callback del backend redirige acá con
// ?mp=ok|cancelado|error. Se avisa y se limpia la query para que un refresh no
// vuelva a mostrar el mismo toast.
const handleMpReturn = () => {
  const { mp, motivo } = route.query
  if (!mp) return

  if (mp === 'ok') {
    toast.add({
      severity: 'success',
      summary: 'MercadoPago conectado',
      detail: 'Ya podés cobrar las reservas online.',
      life: 5000,
    })
    activeTab.value = 'pagos'
  } else if (mp === 'cancelado') {
    toast.add({ severity: 'info', summary: 'Conexión cancelada', life: 4000 })
  } else {
    const detalles = {
      state: 'El link de conexión venció. Probá de nuevo desde el panel.',
      oauth: 'MercadoPago rechazó la autorización. Volvé a intentarlo.',
      club: 'No se encontró el complejo a vincular.',
    }
    toast.add({
      severity: 'error',
      summary: 'No se pudo conectar',
      detail: detalles[motivo] || 'Ocurrió un error al vincular la cuenta.',
      life: 6000,
    })
  }

  router.replace({ query: {} })
}

const fetchConfig = async () => {
  if (!currentClubId.value) return
  loading.value = true
  error.value = null
  try {
    const club = await clubService.getConfig(currentClubId.value)
    form.value = {
      _id: club._id,
      nombre: club.nombre || '',
      slug: club.slug || '',
      telefono: club.telefono || '',
      direccion: club.direccion || '',
      ciudad: club.ciudad || '',
      provincia: club.provincia || '',
      // Coordenadas del nomenclador. Se rehacen al verificar una dirección
      // nueva; si no se toca la dirección, se guardan las que ya tenía.
      ubicacion: club.ubicacion?.lat != null ? { ...club.ubicacion } : null,
      timezone: club.timezone || 'America/Argentina/Buenos_Aires',
      moneda: club.moneda || 'ARS',
      publicado: club.publicado === true,
      descripcion: club.descripcion || '',
      whatsapp: club.whatsapp || '',
      email: club.email || '',
      logo: club.logo || '',
      fotos: Array.isArray(club.fotos) ? [...club.fotos] : [],
      servicios: Array.isArray(club.servicios) ? [...club.servicios] : [],
      // Vienen activadas por defecto: un club sin el campo seteado (anterior a
      // esta funcionalidad) igual recibe los avisos.
      notificaciones: {
        nuevaReserva: club.notificaciones?.nuevaReserva !== false,
        cancelacion: club.notificaciones?.cancelacion !== false,
      },
    }
    pagos.value = club.pagos || {}
    originalSlug.value = club.slug || ''
    slugStatus.value = 'available'
    fetchCourtsMeta()
  } catch (err) {
    error.value = 'Error al cargar la configuración'
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (route.query.tab) activeTab.value = String(route.query.tab)
  fetchConfig()
  handleMpReturn()
  clockTimer = setInterval(() => (now.value = dayjs.utc()), 30000)
})
onUnmounted(() => clockTimer && clearInterval(clockTimer))
watch(currentClubId, (id) => (id ? fetchConfig() : (form.value = null)))

const canSave = computed(() => !['checking', 'taken', 'invalid'].includes(slugStatus.value))

const save = async () => {
  if (!currentClubId.value || !form.value || !canSave.value) return
  saving.value = true
  try {
    const updated = await clubService.updateConfig(currentClubId.value, {
      nombre: form.value.nombre,
      slug: form.value.slug,
      telefono: form.value.telefono,
      direccion: form.value.direccion,
      ciudad: form.value.ciudad,
      provincia: form.value.provincia,
      // `null` limpia el pin a propósito (ver quitarUbicacion): el backend lo
      // borra y el mapa vuelve a ubicarse por la dirección.
      ubicacion: form.value.ubicacion || null,
      timezone: form.value.timezone,
      moneda: form.value.moneda,
      publicado: form.value.publicado,
      descripcion: form.value.descripcion,
      whatsapp: form.value.whatsapp,
      email: form.value.email,
      logo: form.value.logo,
      fotos: form.value.fotos.filter(Boolean),
      servicios: form.value.servicios,
      notificaciones: form.value.notificaciones,
    })
    patchCurrentClub(updated)
    originalSlug.value = updated.slug
    toast.add({ severity: 'success', summary: 'Cambios guardados', detail: 'La configuración se actualizó.', life: 3000 })
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudo guardar la configuración.'
    toast.add({ severity: 'error', summary: 'Error al guardar', detail, life: 5000 })
  } finally {
    saving.value = false
  }
}

const inputBase =
  'w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-ink-500 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100'
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-ink-500 sm:text-2xl">Configuración del complejo</h1>
        <p class="mt-1 text-sm text-stone-500">Organizá los datos, el link público, la landing y los pagos.</p>
      </div>
      <button
        v-if="currentClubId && form && activeTab !== 'pagos'"
        class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-4 py-2.5 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        :disabled="saving || !canSave"
        @click="save"
      >
        <i v-if="saving" class="icon-[material-symbols--progress-activity] animate-spin"></i>
        {{ saving ? 'Guardando...' : 'Guardar cambios' }}
      </button>
    </div>

    <!-- No club -->
    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--apartment] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-ink-500">Sin club seleccionado</h3>
    </div>

    <div v-else-if="loading" class="flex items-center justify-center py-24">
      <i class="icon-[material-symbols--progress-activity] animate-spin text-3xl text-stone-300"></i>
    </div>

    <div v-else-if="form" class="space-y-6">
      <!-- Tabs (horizontales) -->
      <nav class="flex w-full gap-1 overflow-x-auto rounded-full border border-black/[0.06] bg-white p-1 shadow-sm sm:w-fit">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
          :class="activeTab === t.key ? 'bg-brand-purple-500 text-white' : 'text-stone-600 hover:bg-stone-50'"
          @click="activeTab = t.key"
        >
          <i :class="t.icon" class="text-base"></i>
          {{ t.label }}
        </button>
      </nav>

      <!-- Content -->
      <div class="min-w-0">
        <!-- GENERAL -->
        <div v-show="activeTab === 'general'" class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
          <div class="border-b border-black/[0.06] px-4 py-5 sm:px-6">
            <h2 class="text-base font-semibold text-ink-500">Datos generales</h2>
            <p class="mt-0.5 text-sm text-stone-400">Información de contacto, zona horaria y moneda.</p>
          </div>
          <div class="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Nombre</label>
              <input v-model="form.nombre" type="text" placeholder="Ej: Club Garín Pádel" :class="inputBase" />
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Teléfono</label>
                <input v-model="form.telefono" type="text" placeholder="Ej: +54 11 5555-5555" :class="inputBase" />
              </div>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Email del complejo</label>
              <input v-model="form.email" type="email" placeholder="contacto@tucomplejo.com" :class="inputBase" />
              <p class="mt-1.5 text-xs leading-relaxed" :class="form.email ? 'text-stone-400' : 'text-warning-600'">
                <template v-if="form.email">
                  Acá te llegan las facturas, los avisos de deuda y las notificaciones de
                  reservas. Es también la dirección a la que responden tus clientes.
                </template>
                <template v-else>
                  Sin este email no vas a recibir tus facturas ni los avisos de la plataforma.
                </template>
              </p>
            </div>
            <LocationFields
              v-model:provincia="form.provincia"
              v-model:ciudad="form.ciudad"
              v-model:direccion="form.direccion"
              label-class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase"
              control-class="h-[42px]"
              @update:ubicacion="onUbicacionGeo"
            />
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Zona horaria</label>
              <Select
                v-model="form.timezone"
                :options="timezoneOptions"
                option-label="label"
                option-value="value"
                class="h-[42px] w-full text-sm"
              />
              <p class="mt-2.5 text-xs text-stone-400">Hora local actual: <span class="font-medium text-stone-600">{{ localTimePreview }}</span></p>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Moneda</label>
              <Select
                v-model="form.moneda"
                :options="monedaOptions"
                option-label="label"
                option-value="value"
                class="h-[42px] w-full text-sm"
              />
              <p class="mt-2.5 text-xs text-stone-400">Ejemplo de precio: <span class="font-medium text-stone-600">{{ pricePreview }}</span></p>
            </div>
            <!-- Avisos por email al complejo -->
            <div class="rounded-xl border border-black/[0.08] p-4">
              <p class="text-xs font-semibold tracking-wider text-stone-400 uppercase">
                Avisos por email
              </p>
              <p class="mt-1 text-xs leading-relaxed text-stone-500">
                Qué te avisamos a <span class="font-medium text-stone-600">{{ form.email || 'el email del complejo' }}</span>.
                Las facturas y los avisos de deuda se envían siempre.
              </p>

              <label class="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  v-model="notificaciones.nuevaReserva"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 shrink-0 rounded border border-stone-300 bg-white accent-brand-green-500 [color-scheme:light]"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-ink-500">Nueva reserva online</span>
                  <span class="mt-0.5 block text-xs leading-relaxed text-stone-500">
                    Cuando un jugador reserva desde tu página. No te avisamos de los turnos que cargás vos.
                  </span>
                </span>
              </label>

              <label class="mt-3 flex cursor-pointer items-start gap-3">
                <input
                  v-model="notificaciones.cancelacion"
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 shrink-0 rounded border border-stone-300 bg-white accent-brand-green-500 [color-scheme:light]"
                />
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-ink-500">Cancelación de un jugador</span>
                  <span class="mt-0.5 block text-xs leading-relaxed text-stone-500">
                    Cuando alguien cancela su turno y queda libre ese horario.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <!-- LINK DE RESERVAS -->
        <div v-show="activeTab === 'link'" class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
          <div class="border-b border-black/[0.06] px-4 py-5 sm:px-6">
            <h2 class="text-base font-semibold text-ink-500">Link de reservas</h2>
            <p class="mt-0.5 text-sm text-stone-400">Tu dirección pública única. Compartila en tus redes para recibir reservas online.</p>
          </div>
          <div class="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Identificador (slug)</label>
              <div
                class="flex items-stretch overflow-hidden rounded-xl border transition-colors"
                :class="slugStatus === 'taken' || slugStatus === 'invalid' ? 'border-error-300' : slugStatus === 'available' ? 'border-success-300' : 'border-black/[0.08]'"
              >
                <!-- En mobile el prefijo se come el input: el link completo se
                     ve igual en la caja "Tu link" de abajo. -->
                <span class="hidden items-center whitespace-nowrap bg-stone-50 px-3 text-sm text-stone-400 sm:flex">courtinapp.com/club/</span>
                <input v-model="form.slug" type="text" placeholder="tu-complejo" class="min-w-0 flex-1 bg-white px-3 py-2.5 text-sm text-ink-500 outline-none placeholder:text-stone-400" @input="onSlugInput" />
                <span class="flex items-center pr-3">
                  <i v-if="slugStatus === 'checking'" class="icon-[material-symbols--progress-activity] animate-spin text-stone-300"></i>
                  <i v-else-if="slugStatus === 'available'" class="icon-[material-symbols--check-circle] text-success-500"></i>
                  <i v-else-if="slugStatus === 'taken' || slugStatus === 'invalid'" class="icon-[material-symbols--cancel] text-error-500"></i>
                </span>
              </div>
              <p
                class="mt-2 text-xs"
                :class="slugStatus === 'available' ? 'text-success-600' : slugStatus === 'taken' ? 'text-error-600' : slugStatus === 'invalid' ? 'text-warning-600' : 'text-stone-400'"
              >
                <template v-if="slugStatus === 'checking'">Verificando disponibilidad…</template>
                <template v-else-if="slugStatus === 'available'">✓ Disponible</template>
                <template v-else-if="slugStatus === 'taken'">Ese link ya está en uso, probá otro.</template>
                <template v-else-if="slugStatus === 'invalid'">Mínimo 3 caracteres: letras, números o guiones.</template>
                <template v-else>Solo letras, números y guiones.</template>
              </p>
            </div>

            <div class="rounded-xl border border-black/[0.06] bg-stone-50 p-4">
              <p class="text-xs font-semibold tracking-wider text-stone-400 uppercase">Tu link</p>
              <div class="mt-2 flex items-center gap-2">
                <code class="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 text-sm text-ink-500 ring-1 ring-black/[0.06]">https://{{ fullLink }}</code>
                <button class="flex items-center gap-1.5 rounded-full bg-ink-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink-700 cursor-pointer" @click="copyLink">
                  <i :class="copiedLink ? 'icon-[material-symbols--check]' : 'icon-[material-symbols--content-copy]'" class="text-sm"></i>
                  {{ copiedLink ? 'Copiado' : 'Copiar' }}
                </button>
              </div>
              <p class="mt-2 text-xs text-stone-400">Al cambiar el link, los enlaces anteriores dejan de funcionar. Recordá actualizarlo en tus redes.</p>
            </div>
          </div>
        </div>

        <!-- LANDING -->
        <div v-show="activeTab === 'landing'" class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div class="space-y-6">
            <!-- Publicar -->
            <div class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-stone-800">Publicar complejo</p>
                  <p class="text-xs text-stone-400">Si está activo, aparece en la búsqueda pública y acepta reservas online.</p>
                </div>
                <button type="button" role="switch" :aria-checked="form.publicado" class="relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer" :class="form.publicado ? 'bg-brand-green-500' : 'bg-stone-300'" @click="form.publicado = !form.publicado">
                  <span class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform" :class="form.publicado ? 'translate-x-5' : ''"></span>
                </button>
              </div>
            </div>

            <!-- Imágenes -->
            <div class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
              <div class="border-b border-black/[0.06] px-4 py-5 sm:px-6">
                <h2 class="text-base font-semibold text-ink-500">Imágenes</h2>
                <p class="mt-0.5 text-sm text-stone-400">Subí el logo, una imagen destacada y fotos de tu complejo (hasta 5 MB c/u).</p>
              </div>
              <div class="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Logo</label>
                  <ImageUpload v-model="form.logo" variant="logo" placeholder="Subir logo" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Imagen destacada (portada)</label>
                  <ImageUpload v-model="destacada" variant="wide" placeholder="Subir imagen destacada" />
                </div>
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Galería</label>
                  <div class="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    <div v-for="(g, i) in galeria" :key="i" class="relative">
                      <ImageUpload v-model="form.fotos[i + 1]" variant="thumb" placeholder="Subir" />
                      <button
                        class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-error-500 shadow ring-1 ring-black/[0.06] transition-colors hover:bg-error-50 cursor-pointer"
                        @click="removeGaleria(i)"
                      >
                        <i class="icon-[material-symbols--close] text-sm"></i>
                      </button>
                    </div>
                    <ImageUpload :model-value="''" variant="thumb" placeholder="Agregar" @update:model-value="onGalleryAdd" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Ubicación en el mapa -->
            <div class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
              <div class="border-b border-black/[0.06] px-4 py-5 sm:px-6">
                <h2 class="text-base font-semibold text-ink-500">Ubicación</h2>
                <p class="mt-0.5 text-sm text-stone-400">
                  El mapa que ve el jugador en tu página. Ajustá el pin si no cae justo en la entrada del complejo.
                </p>
              </div>
              <div class="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
                <ClubMap
                  :nombre="form.nombre || 'tu complejo'"
                  :lat="form.ubicacion?.lat"
                  :lng="form.ubicacion?.lng"
                  :direccion="form.direccion"
                  :ciudad="form.ciudad"
                  :provincia="form.provincia"
                  height-class="h-[260px]"
                />

                <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 px-4 py-3">
                  <div class="min-w-0">
                    <p class="text-xs font-semibold tracking-wider text-stone-400 uppercase">Pin</p>
                    <p v-if="tieneUbicacion" class="mt-0.5 truncate text-sm font-medium text-ink-500">{{ ubicacionTexto }}</p>
                    <p v-else class="mt-0.5 text-sm text-stone-500">
                      Sin coordenadas: el mapa ubica la dirección de forma aproximada.
                    </p>
                  </div>
                  <button
                    v-if="tieneUbicacion"
                    type="button"
                    class="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:bg-stone-200 hover:text-error-600 cursor-pointer"
                    @click="quitarUbicacion"
                  >
                    Quitar pin
                  </button>
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">
                    Link de Google Maps o coordenadas
                  </label>
                  <div class="flex flex-wrap items-center gap-2">
                    <input
                      v-model="coordsDraft"
                      type="text"
                      placeholder="https://www.google.com/maps/… o -34.603, -58.381"
                      class="w-full flex-1 rounded-xl sm:w-auto sm:min-w-[240px] border border-black/[0.08] px-3 py-2.5 text-sm text-ink-500 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-400 focus:ring-2 focus:ring-brand-green-100"
                      @keydown.enter.prevent="aplicarCoords"
                    />
                    <button
                      type="button"
                      class="shrink-0 rounded-full bg-ink-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      :disabled="!coordsDraft.trim()"
                      @click="aplicarCoords"
                    >
                      Aplicar
                    </button>
                  </div>
                  <p v-if="coordsError" class="mt-2 text-xs leading-relaxed text-error-600">{{ coordsError }}</p>
                  <p v-else class="mt-2 text-xs leading-relaxed text-stone-400">
                    En Google Maps, hacé clic derecho sobre la entrada de tu complejo y tocá las coordenadas que aparecen
                    arriba de todo: se copian solas. También podés pegar el link de la ficha de tu complejo.
                  </p>
                </div>
              </div>
            </div>

            <!-- Descripción + servicios -->
            <div class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
              <div class="border-b border-black/[0.06] px-4 py-5 sm:px-6">
                <h2 class="text-base font-semibold text-ink-500">Descripción y servicios</h2>
              </div>
              <div class="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Descripción</label>
                  <textarea v-model="form.descripcion" rows="3" placeholder="Contá qué hace especial a tu complejo…" :class="inputBase"></textarea>
                </div>
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">WhatsApp</label>
                    <input v-model="form.whatsapp" type="text" placeholder="Ej: +54 11 5555-5555" :class="inputBase" />
                    <p class="mt-1.5 text-xs text-stone-400">Se muestra en tu página pública para que te contacten.</p>
                  </div>
                </div>
                

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Servicios</label>
                  <div class="flex flex-wrap items-center gap-2 rounded-xl border border-black/[0.08] px-3 py-2 transition-colors focus-within:border-brand-green-400 focus-within:ring-2 focus-within:ring-brand-green-100">
                    <span v-for="(s, i) in form.servicios" :key="i" class="inline-flex items-center gap-1.5 rounded-full bg-stone-100 py-1 pl-3 pr-1.5 text-xs font-medium text-stone-700">
                      {{ s }}
                      <button type="button" class="flex h-4 w-4 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-200 hover:text-error-500 cursor-pointer" @click="removeServicio(i)"><i class="icon-[material-symbols--close] text-[9px]"></i></button>
                    </span>
                    <input v-model="servicioDraft" type="text" :placeholder="form.servicios.length ? 'Agregar otro…' : 'Ej: Estacionamiento'" class="min-w-[140px] flex-1 border-0 bg-transparent py-1 text-sm text-ink-500 outline-none placeholder:text-stone-400" @keydown.enter.prevent="addServicio" @keydown.,.prevent="addServicio" @keydown.delete="onServicioBackspace" @blur="addServicio" />
                  </div>
                  <p class="mt-2 text-xs text-stone-400">Escribí un servicio y presioná Enter para agregarlo.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview -->
          <div class="lg:sticky lg:top-24 lg:self-start">
            <p class="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-stone-400 uppercase">
              <i class="icon-[material-symbols--visibility] text-sm"></i> Vista previa en la búsqueda
            </p>
            <ClubCard :club="previewClub" class="pointer-events-none" />
            <p class="mt-3 text-xs text-stone-400">Así se ve tu complejo cuando un jugador busca canchas.</p>
          </div>
        </div>

        <!-- PAGOS -->
        <div v-show="activeTab === 'pagos'" class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
          <div class="border-b border-black/[0.06] px-4 py-5 sm:px-6">
            <h2 class="text-base font-semibold text-ink-500">Pasarelas de pago</h2>
            <p class="mt-0.5 text-sm text-stone-400">Conectá tu cuenta para cobrar las reservas online.</p>
          </div>
          <div class="space-y-4 px-4 py-5 sm:px-6 sm:py-6">
            <!-- MercadoPago -->
            <div class="flex flex-wrap items-center gap-4 rounded-2xl border border-black/[0.06] p-5">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#009ee3]/10 text-[#009ee3]">
                <img src="/images/mercado-pago.png" alt="MercadoPago" class="h-8 w-auto" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-semibold text-ink-500">MercadoPago</p>
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="mpConectado ? 'bg-success-50 text-success-600' : 'bg-stone-100 text-stone-500'"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="mpConectado ? 'bg-success-500' : 'bg-stone-400'"></span>
                    {{ mpConectado ? 'Conectado' : 'No conectado' }}
                  </span>
                </div>
                <p v-if="mpConectado" class="mt-0.5 text-xs text-stone-400">
                  {{ pagos.modalidad === 'sena'
                    ? `Cobrás una seña de ${pagos.senaTipo === 'porcentaje' ? `${pagos.senaValor}%` : formatCurrency(pagos.senaValor, form?.moneda)} por reserva.`
                    : 'Cobrás el turno completo por adelantado.' }}
                </p>
                <p v-else class="mt-0.5 text-xs text-stone-400">Tarjetas, dinero en cuenta y QR. Los pagos caen en tu cuenta.</p>
              </div>
              <button class="rounded-full bg-brand-lime-500 px-4 py-2 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer" @click="mpOpen = true">
                {{ mpConectado ? 'Configurar' : 'Conectar' }}
              </button>
            </div>

            <!-- Próximamente -->
            <div class="flex items-center gap-4 rounded-2xl border border-dashed border-black/[0.1] p-5 opacity-70">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-400">
                <i class="icon-[material-symbols--add-card] text-2xl"></i>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-stone-500">Más pasarelas</p>
                <p class="mt-0.5 text-xs text-stone-400">Stripe, transferencia y otras — próximamente.</p>
              </div>
              <span class="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-400">Pronto</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <MercadoPagoDrawer
      :visible="mpOpen"
      :club-id="currentClubId"
      :pagos="pagos"
      :moneda="form?.moneda || 'ARS'"
      @close="mpOpen = false"
      @updated="onPagosUpdated"
    />
  </div>
</template>
