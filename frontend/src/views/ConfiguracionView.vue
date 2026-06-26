<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Configuración del complejo</h1>
        <p class="mt-1 text-sm text-slate-500">
          Datos generales, zona horaria y moneda del complejo.
        </p>
      </div>
      <div v-if="currentClubId && !loading && !error">
        <Button
          label="Guardar cambios"
          size="small"
          :loading="saving"
          @click="save"
        />
      </div>
    </div>

    <!-- No club selected -->
    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
        <i class="pi pi-building text-2xl text-neutral-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-slate-900">Sin club seleccionado</h3>
      <p class="!mt-2 text-sm text-slate-500">
        Seleccioná un club desde el selector en el encabezado para configurarlo.
      </p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex flex-col items-center justify-center py-24 text-center">
      <i class="pi pi-spin pi-spinner text-3xl text-neutral-400"></i>
      <p class="mt-4 text-sm text-slate-500">Cargando configuración...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-error-50">
        <i class="pi pi-exclamation-triangle text-2xl text-error-500"></i>
      </div>
      <p class="mt-4 text-sm text-slate-500">{{ error }}</p>
      <Button label="Reintentar" icon="pi pi-refresh" severity="secondary" size="small" class="mt-4" @click="fetchConfig" />
    </div>

    <!-- Content -->
    <div v-else-if="form" class="space-y-6">
      <!-- General info -->
      <div class="rounded-2xl border border-slate-200 bg-white">
        <div class="border-b border-slate-200 px-6 py-5">
          <h2 class="text-base font-semibold text-slate-900">Datos generales</h2>
          <p class="mt-0.5 text-sm text-neutral-400">Información del complejo</p>
        </div>
        <div class="space-y-6 px-6 py-6">
          <div>
            <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Nombre</label>
            <input
              v-model="form.nombre"
              type="text"
              placeholder="Ej: Club Garín Pádel"
              class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Teléfono</label>
              <input
                v-model="form.telefono"
                type="text"
                placeholder="Ej: +54 11 5555-5555"
                class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Dirección</label>
              <input
                v-model="form.direccion"
                type="text"
                placeholder="Ej: Av. Siempreviva 742"
                class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Ciudad</label>
              <div class="relative">
                <select
                  v-model="form.ciudad"
                  class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                >
                  <option value="">Seleccionar ciudad</option>
                  <option v-for="c in ciudadOptions" :key="c" :value="c">{{ c }}</option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
              </div>
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Provincia</label>
              <input
                v-model="form.provincia"
                type="text"
                class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
              />
            </div>
          </div>
          <div class="mt-5 space-y-5">
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Zona horaria</label>
              <div class="relative">
                <select
                  v-model="form.timezone"
                  class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                >
                  <option v-for="tz in timezoneOptions" :key="tz.value" :value="tz.value">{{ tz.label }}</option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
              </div>
              <p class="!mt-1 text-xs text-neutral-400">
                Hora local actual: <span class="font-medium text-slate-600">{{ localTimePreview }}</span>
              </p>
            </div>

            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Moneda</label>
              <div class="relative">
                <select
                  v-model="form.moneda"
                  class="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none transition-colors focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                >
                  <option v-for="c in monedaOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                </select>
                <i class="pi pi-chevron-down pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-neutral-400"></i>
              </div>
              <p class="!mt-2 text-xs text-neutral-400">
                Ejemplo de precio: <span class="font-medium text-slate-600">{{ pricePreview }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Perfil público -->
      <div class="rounded-2xl border border-slate-200 bg-white">
        <div class="border-b border-slate-200 px-6 py-5">
          <h2 class="text-base font-semibold text-slate-900">Perfil público</h2>
          <p class="mt-0.5 text-sm text-neutral-400">
            Cómo se muestra tu complejo en la web pública de reservas.
          </p>
        </div>
        <div class="space-y-6 px-6 py-6">
          <!-- Publicado toggle -->
          <div class="flex items-center justify-between rounded-xl border border-slate-200 p-4">
            <div class="pr-4">
              <p class="text-sm font-semibold text-slate-800">Publicar complejo</p>
              <p class="text-xs text-neutral-400">
                Si está activo, tu complejo aparece en la búsqueda pública y acepta reservas online.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="form.publicado"
              class="relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer"
              :class="form.publicado ? 'bg-primitive-orange-500' : 'bg-slate-300'"
              @click="form.publicado = !form.publicado"
            >
              <span
                class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                :class="form.publicado ? 'translate-x-5' : ''"
              ></span>
            </button>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Descripción</label>
            <textarea
              v-model="form.descripcion"
              rows="3"
              placeholder="Contá qué hace especial a tu complejo (canchas, servicios, ambiente...)"
              class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">WhatsApp</label>
              <input
                v-model="form.whatsapp"
                type="text"
                placeholder="Ej: +54 11 5555-5555"
                class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Email de contacto</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="Ej: contacto@tucomplejo.com"
                class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
              />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Servicios</label>
            <div class="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 transition-colors focus-within:border-primitive-orange-500 focus-within:ring-1 focus-within:ring-primitive-orange-500">
              <span
                v-for="(s, i) in form.servicios"
                :key="i"
                class="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs font-medium text-slate-700"
              >
                {{ s }}
                <button
                  type="button"
                  class="flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-slate-200 hover:text-error-500 cursor-pointer"
                  @click="removeServicio(i)"
                >
                  <i class="pi pi-times text-[9px]"></i>
                </button>
              </span>
              <input
                v-model="servicioDraft"
                type="text"
                :placeholder="form.servicios.length ? 'Agregar otro...' : 'Ej: Estacionamiento'"
                class="min-w-[140px] flex-1 border-0 bg-transparent py-1 text-sm text-slate-900 outline-none placeholder:text-neutral-400"
                @keydown.enter.prevent="addServicio"
                @keydown.,.prevent="addServicio"
                @keydown.delete="onServicioBackspace"
                @blur="addServicio"
              />
            </div>
            <p class="!mt-1 text-xs text-neutral-400">Escribí un servicio y presioná Enter para agregarlo.</p>
          </div>

          <p class="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-neutral-400">
            Las fotos, el logo y la ubicación en el mapa se cargarán cuando integremos el almacenamiento de imágenes.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import clubService from '@/services/clubService'
import { useAuth } from '@/composables/useAuth'
import { dayjs, formatCurrency } from '@/utils/datetime'
import { CITIES } from '@/utils/cities'

const { currentClubId, patchCurrentClub } = useAuth()
const toast = useToast()

const form = ref(null)
const loading = ref(false)
const saving = ref(false)
const error = ref(null)

const timezoneOptions = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { value: 'America/Montevideo', label: 'Uruguay (Montevideo)' },
  { value: 'America/Santiago', label: 'Chile (Santiago)' },
  { value: 'America/Asuncion', label: 'Paraguay (Asunción)' },
  { value: 'America/Sao_Paulo', label: 'Brasil (São Paulo)' },
  { value: 'America/La_Paz', label: 'Bolivia (La Paz)' },
  { value: 'America/Lima', label: 'Perú (Lima)' },
  { value: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { value: 'America/Mexico_City', label: 'México (Ciudad de México)' },
  { value: 'America/New_York', label: 'EE.UU. (Nueva York)' },
  { value: 'Europe/Madrid', label: 'España (Madrid)' },
  { value: 'UTC', label: 'UTC' },
]

const monedaOptions = [
  { value: 'ARS', label: 'Peso argentino (ARS)' },
  { value: 'UYU', label: 'Peso uruguayo (UYU)' },
  { value: 'CLP', label: 'Peso chileno (CLP)' },
  { value: 'PYG', label: 'Guaraní (PYG)' },
  { value: 'BRL', label: 'Real brasileño (BRL)' },
  { value: 'BOB', label: 'Boliviano (BOB)' },
  { value: 'PEN', label: 'Sol peruano (PEN)' },
  { value: 'COP', label: 'Peso colombiano (COP)' },
  { value: 'MXN', label: 'Peso mexicano (MXN)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
]

const now = ref(dayjs.utc())
let clockTimer = null

const localTimePreview = computed(() => {
  if (!form.value?.timezone) return ''
  return now.value.tz(form.value.timezone).format('dddd D [de] MMMM, HH:mm')
})

const pricePreview = computed(() => formatCurrency(15000, form.value?.moneda || 'ARS'))

// Si el club ya tenía una ciudad fuera de la lista curada, la incluimos para no perderla.
const ciudadOptions = computed(() => {
  const c = form.value?.ciudad
  return c && !CITIES.includes(c) ? [c, ...CITIES] : CITIES
})

// --- Servicios (input tipo chips) ---
const servicioDraft = ref('')

const addServicio = () => {
  const value = servicioDraft.value.trim()
  if (!value) return
  const exists = form.value.servicios.some((s) => s.toLowerCase() === value.toLowerCase())
  if (!exists) form.value.servicios.push(value)
  servicioDraft.value = ''
}

const removeServicio = (index) => {
  form.value.servicios.splice(index, 1)
}

// Backspace con el input vacío elimina el último chip.
const onServicioBackspace = () => {
  if (!servicioDraft.value && form.value.servicios.length) {
    form.value.servicios.pop()
  }
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
      telefono: club.telefono || '',
      direccion: club.direccion || '',
      ciudad: club.ciudad || '',
      provincia: club.provincia || '',
      timezone: club.timezone || 'America/Argentina/Buenos_Aires',
      moneda: club.moneda || 'ARS',
      // Perfil público
      publicado: club.publicado === true,
      descripcion: club.descripcion || '',
      whatsapp: club.whatsapp || '',
      email: club.email || '',
      servicios: Array.isArray(club.servicios) ? [...club.servicios] : [],
    }
  } catch (err) {
    error.value = 'Error al cargar la configuración'
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la configuración.', life: 4000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchConfig()
  clockTimer = setInterval(() => {
    now.value = dayjs.utc()
  }, 30000)
})

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer)
})

watch(currentClubId, (newId) => {
  if (newId) fetchConfig()
  else form.value = null
})

const save = async () => {
  if (!currentClubId.value || !form.value) return
  saving.value = true
  try {
    const updated = await clubService.updateConfig(currentClubId.value, {
      nombre: form.value.nombre,
      telefono: form.value.telefono,
      direccion: form.value.direccion,
      ciudad: form.value.ciudad,
      provincia: form.value.provincia,
      timezone: form.value.timezone,
      moneda: form.value.moneda,
      publicado: form.value.publicado,
      descripcion: form.value.descripcion,
      whatsapp: form.value.whatsapp,
      email: form.value.email,
      servicios: form.value.servicios,
    })
    patchCurrentClub(updated)
    toast.add({ severity: 'success', summary: 'Cambios guardados', detail: 'La configuración se actualizó correctamente.', life: 3000 })
  } catch (err) {
    console.error(err)
    const detail = err.response?.data?.message || 'No se pudo guardar la configuración.'
    toast.add({ severity: 'error', summary: 'Error al guardar', detail, life: 5000 })
  } finally {
    saving.value = false
  }
}
</script>
