<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Complejos</h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ stats.total }} cuentas en total · {{ stats.activos }} activas
        </p>
      </div>
      <div class="flex items-center gap-3">
        <Button
          label="Exportar CSV"
          severity="secondary"
          outlined
          size="small"
          @click="exportCSV"
        />
        <Button
          label="Nuevo complejo"
          size="small"
          @click="openCreateDrawer"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap items-center gap-4">
      <!-- Search -->
      <div class="relative">
        <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400"></i>
        <input
          v-model="search"
          type="text"
          placeholder="Buscar por nombre, ciudad u owner"
          class="h-10 w-80 rounded-lg border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-300 focus:ring-2 focus:ring-primitive-orange-100"
        />
      </div>

      <!-- Plan filters -->
      <div class="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <button
          v-for="f in planFilters"
          :key="f.value"
          class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
          :class="
            activePlan === f.value
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          "
          @click="activePlan = f.value"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Estado filters -->
      <div class="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <button
          v-for="f in estadoFilters"
          :key="f.value"
          class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
          :class="
            activeEstado === f.value
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          "
          @click="activeEstado = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-slate-200 bg-white">
      <!-- Table header -->
      <div class="grid grid-cols-[2fr_1.2fr_1fr_0.8fr_0.8fr_1fr_1fr_40px] items-center gap-4 border-b border-slate-100 px-6 py-3">
        <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Complejo</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Owner</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Plan</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400 text-right">MRR</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400 text-center">Canchas</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Última actividad</span>
        <span class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Estado</span>
        <span></span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <i class="pi pi-spin pi-spinner text-2xl text-slate-300"></i>
      </div>

      <!-- Empty -->
      <div v-else-if="clubs.length === 0" class="py-16 text-center">
        <i class="pi pi-building text-4xl text-slate-200"></i>
        <p class="mt-3 text-sm text-neutral-400">No se encontraron complejos</p>
      </div>

      <!-- Rows -->
      <div
        v-else
        v-for="club in clubs"
        :key="club._id"
        class="group grid grid-cols-[2fr_1.2fr_1fr_0.8fr_0.8fr_1fr_1fr_40px] items-center gap-4 border-b border-slate-50 px-6 py-4 transition-colors hover:bg-slate-50/50 last:border-0"
      >
        <!-- Club name -->
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            :class="clubColor(club._id)"
          >
            {{ clubInitials(club.nombre) }}
          </div>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-slate-900">{{ club.nombre }}</p>
            <p class="truncate text-xs text-neutral-400">
              {{ [club.ciudad, club.provincia].filter(Boolean).join(', ') || club.direccion || '—' }}
            </p>
          </div>
        </div>

        <!-- Owner -->
        <span class="truncate text-sm text-slate-600">
          {{ ownerShortName(club.owner) }}
        </span>

        <!-- Plan -->
        <div>
          <span
            class="inline-block rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
            :class="planStyle(club.plan)"
          >
            {{ club.plan }}
          </span>
        </div>

        <!-- MRR -->
        <span class="text-right text-sm font-semibold text-slate-700">
          —
        </span>

        <!-- Canchas -->
        <span class="text-center text-sm text-slate-600">
          {{ club.canchas }}
        </span>

        <!-- Última actividad -->
        <span class="text-sm text-slate-500">
          {{ formatTimeAgo(club.ultimaActividad) }}
        </span>

        <!-- Estado -->
        <div>
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            :class="estadoConfig(club.estado).bg"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="estadoConfig(club.estado).dot"></span>
            {{ estadoConfig(club.estado).label }}
          </span>
        </div>

        <!-- Actions -->
        <div class="relative flex justify-end">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100 cursor-pointer"
            @click.stop="openDetailDrawer(club)"
          >
            <i class="pi pi-chevron-right text-sm"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Create / Edit Drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div
          v-if="drawerVisible"
          class="fixed inset-0 z-50 flex justify-end"
          @click="handleOverlayClick"
        >
          <!-- Overlay -->
          <div class="absolute inset-0 bg-black/30 transition-opacity" />

          <!-- Drawer panel -->
          <div class="relative flex w-full max-w-lg flex-col bg-white shadow-2xl">
            <!-- Header -->
            <div class="flex items-center gap-4 border-b border-slate-200 px-6 py-5">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                :class="selectedClub ? clubColor(selectedClub._id) : 'bg-primitive-orange-500'"
              >
                {{ selectedClub ? clubInitials(selectedClub.nombre) : '+' }}
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-lg font-semibold text-slate-900">
                  {{ drawerMode === 'create' ? 'Nuevo complejo' : form.nombre }}
                </h2>
              </div>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                @click="closeDrawer"
              >
                <i class="pi pi-times text-sm"></i>
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-6">
              <!-- Detail view (read mode) -->
              <div v-if="drawerMode === 'detail'" class="space-y-6">
                <!-- Quick actions -->
                <div class="flex flex-col gap-2">
                  <button
                    class="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                    @click="handleEnterAsAdmin(selectedClub)"
                  >
                    <i class="pi pi-sign-in text-sm text-neutral-400"></i>
                    Ingresar como admin
                  </button>
                  <button
                    class="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                    @click="drawerMode = 'edit'"
                  >
                    <i class="pi pi-pencil text-sm text-neutral-400"></i>
                    Editar complejo
                  </button>
                  <button
                    class="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer"
                    :class="
                      selectedClub?.estado === 'suspendido'
                        ? 'border-green-200 text-green-700 hover:bg-green-50'
                        : 'border-red-200 text-red-600 hover:bg-red-50'
                    "
                    @click="handleSuspend(selectedClub)"
                  >
                    <i class="pi pi-power-off text-sm"></i>
                    {{ selectedClub?.estado === 'suspendido' ? 'Reactivar complejo' : 'Suspender complejo' }}
                  </button>
                </div>

                <!-- Info sections -->
                <div class="space-y-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Información</h3>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-neutral-400">Ciudad</p>
                      <p class="text-sm font-medium text-slate-700">{{ selectedClub?.ciudad || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-neutral-400">Provincia</p>
                      <p class="text-sm font-medium text-slate-700">{{ selectedClub?.provincia || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-neutral-400">Dirección</p>
                      <p class="text-sm font-medium text-slate-700">{{ selectedClub?.direccion || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-neutral-400">Teléfono</p>
                      <p class="text-sm font-medium text-slate-700">{{ selectedClub?.telefono || '—' }}</p>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Suscripción</h3>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-neutral-400">Plan</p>
                      <span
                        class="inline-block rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                        :class="planStyle(selectedClub?.plan)"
                      >
                        {{ selectedClub?.plan }}
                      </span>
                    </div>
                    <div>
                      <p class="text-xs text-neutral-400">Estado</p>
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        :class="estadoConfig(selectedClub?.estado).bg"
                      >
                        <span class="h-1.5 w-1.5 rounded-full" :class="estadoConfig(selectedClub?.estado).dot"></span>
                        {{ estadoConfig(selectedClub?.estado).label }}
                      </span>
                    </div>
                    <div>
                      <p class="text-xs text-neutral-400">Canchas</p>
                      <p class="text-sm font-medium text-slate-700">{{ selectedClub?.canchas ?? '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-neutral-400">Owner</p>
                      <p class="text-sm font-medium text-slate-700">{{ ownerShortName(selectedClub?.owner) }}</p>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-neutral-400">Actividad</h3>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-neutral-400">Última actividad</p>
                      <p class="text-sm font-medium text-slate-700">{{ formatTimeAgo(selectedClub?.ultimaActividad) }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-neutral-400">Creado</p>
                      <p class="text-sm font-medium text-slate-700">{{ formatDate(selectedClub?.createdAt) }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Create / Edit form -->
              <div v-else class="space-y-6">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Nombre</label>
                  <input
                    v-model="form.nombre"
                    type="text"
                    placeholder="Nombre del complejo"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                    @input="drawerMode === 'create' && autoSlug()"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Slug</label>
                  <input
                    v-model="form.slug"
                    type="text"
                    placeholder="slug-del-complejo"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Ciudad</label>
                    <input
                      v-model="form.ciudad"
                      type="text"
                      placeholder="Ciudad"
                      class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Provincia</label>
                    <input
                      v-model="form.provincia"
                      type="text"
                      placeholder="Provincia"
                      class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Dirección</label>
                  <input
                    v-model="form.direccion"
                    type="text"
                    placeholder="Dirección completa"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Teléfono</label>
                  <input
                    v-model="form.telefono"
                    type="text"
                    placeholder="+54 11 1234-5678"
                    class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-500 focus:ring-1 focus:ring-primitive-orange-500"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Plan</label>
                  <div class="flex gap-2">
                    <button
                      v-for="p in planOptions"
                      :key="p.value"
                      class="rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                      :class="
                        form.plan === p.value
                          ? 'border-primitive-orange-300 bg-primitive-orange-50 text-primitive-orange-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      "
                      @click="form.plan = p.value"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                </div>

                <div v-if="drawerMode === 'edit'">
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-neutral-400 uppercase">Estado</label>
                  <div class="flex gap-2">
                    <button
                      v-for="e in estadoOptions"
                      :key="e.value"
                      class="rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                      :class="
                        form.estado === e.value
                          ? 'border-primitive-orange-300 bg-primitive-orange-50 text-primitive-orange-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      "
                      @click="form.estado = e.value"
                    >
                      {{ e.label }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer (only for create/edit modes) -->
            <div v-if="drawerMode !== 'detail'" class="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                class="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                @click="closeDrawer"
              >
                Cancelar
              </button>
              <button
                class="flex items-center gap-2 rounded-lg bg-primitive-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primitive-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="saving || !form.nombre || !form.slug"
                @click="handleSave"
              >
                <i v-if="saving" class="pi pi-spin pi-spinner text-xs"></i>
                {{ saving ? 'Guardando...' : drawerMode === 'create' ? 'Crear complejo' : 'Guardar cambios' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import adminService from '@/services/adminService'
import Button from 'primevue/button'

const router = useRouter()
const { setCurrentClubId } = useAuth()

const clubs = ref([])
const stats = ref({ total: 0, activos: 0 })
const loading = ref(false)
const search = ref('')
const activePlan = ref(null)
const activeEstado = ref(null)

const drawerVisible = ref(false)
const drawerMode = ref('create') // 'create' | 'detail' | 'edit'
const selectedClub = ref(null)
const saving = ref(false)

const form = ref(getEmptyForm())

function getEmptyForm() {
  return {
    nombre: '',
    slug: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    telefono: '',
    plan: 'starter',
    estado: 'trial',
  }
}

const planFilters = [
  { label: 'Todos los planes', value: null },
  { label: 'Starter', value: 'starter' },
  { label: 'Pro', value: 'pro' },
  { label: 'Business', value: 'business' },
  { label: 'Enterprise', value: 'enterprise' },
]

const estadoFilters = [
  { label: 'Todos', value: null },
  { label: 'Activos', value: 'activo' },
  { label: 'Trial', value: 'trial' },
  { label: 'Impagos', value: 'impago' },
  { label: 'Cancelados', value: 'cancelado' },
]

const planOptions = [
  { label: 'Starter', value: 'starter' },
  { label: 'Pro', value: 'pro' },
  { label: 'Business', value: 'business' },
  { label: 'Enterprise', value: 'enterprise' },
]

const estadoOptions = [
  { label: 'Activo', value: 'activo' },
  { label: 'Trial', value: 'trial' },
  { label: 'Suspendido', value: 'suspendido' },
  { label: 'Cancelado', value: 'cancelado' },
]

const fetchClubs = async () => {
  loading.value = true
  try {
    const params = {}
    if (search.value) params.search = search.value
    if (activePlan.value) params.plan = activePlan.value
    if (activeEstado.value) params.estado = activeEstado.value

    const response = await adminService.getClubs(params)
    clubs.value = response.clubs
    stats.value = response.stats
  } catch (err) {
    console.error('Error fetching clubs:', err)
  } finally {
    loading.value = false
  }
}

let searchTimeout = null
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchClubs, 300)
})

watch([activePlan, activeEstado], fetchClubs)

onMounted(fetchClubs)

const openCreateDrawer = () => {
  drawerMode.value = 'create'
  selectedClub.value = null
  form.value = getEmptyForm()
  drawerVisible.value = true
}

const openDetailDrawer = (club) => {
  drawerMode.value = 'detail'
  selectedClub.value = club
  form.value = {
    nombre: club.nombre,
    slug: club.slug,
    direccion: club.direccion || '',
    ciudad: club.ciudad || '',
    provincia: club.provincia || '',
    telefono: club.telefono || '',
    plan: club.plan || 'starter',
    estado: club.estado || 'activo',
  }
  drawerVisible.value = true
}

const closeDrawer = () => {
  drawerVisible.value = false
  drawerMode.value = 'create'
  selectedClub.value = null
  form.value = getEmptyForm()
}

const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) {
    closeDrawer()
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    if (drawerMode.value === 'create') {
      await adminService.createClub(form.value)
    } else {
      await adminService.updateClub(selectedClub.value._id, form.value)
    }
    closeDrawer()
    await fetchClubs()
  } catch (err) {
    console.error('Error saving club:', err)
  } finally {
    saving.value = false
  }
}

const handleSuspend = async (club) => {
  try {
    await adminService.suspendClub(club._id)
    closeDrawer()
    await fetchClubs()
  } catch (err) {
    console.error('Error suspending club:', err)
  }
}

const handleEnterAsAdmin = (club) => {
  setCurrentClubId(club._id)
  router.push({ name: 'dashboard' })
}

const autoSlug = () => {
  form.value.slug = form.value.nombre
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const planStyle = (plan) => {
  const styles = {
    starter: 'bg-slate-100 text-slate-700',
    pro: 'bg-blue-50 text-blue-700',
    business: 'bg-orange-50 text-orange-700',
    enterprise: 'bg-purple-50 text-purple-700',
  }
  return styles[plan] || styles.starter
}

const estadoConfig = (estado) => {
  const map = {
    activo: { label: 'Activo', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700' },
    trial: { label: 'Trial', dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700' },
    suspendido: { label: 'Suspendido', dot: 'bg-red-500', bg: 'bg-red-50 text-red-700' },
    cancelado: { label: 'Cancelado', dot: 'bg-slate-400', bg: 'bg-slate-100 text-slate-600' },
    impago: { label: 'Impago', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700' },
    inactivo: { label: 'Inactivo', dot: 'bg-slate-400', bg: 'bg-slate-100 text-slate-600' },
  }
  return map[estado] || map.inactivo
}

const clubInitials = (nombre) => {
  if (!nombre) return '??'
  const parts = nombre.split(' ')
  return parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase()
}

const clubColors = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-emerald-500',
  'bg-pink-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-rose-500',
]

const clubColor = (id) => {
  if (!id) return clubColors[0]
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return clubColors[hash % clubColors.length]
}

const formatTimeAgo = (date) => {
  if (!date) return '—'
  const now = new Date()
  const d = new Date(date)
  const diff = now - d
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months > 1 ? 'es' : ''}`
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ownerShortName = (owner) => {
  if (!owner) return '—'
  const parts = owner.nombre.split(' ')
  if (parts.length >= 2) return `${parts[0]} ${parts[1][0]}.`
  return parts[0]
}

const exportCSV = () => {
  const headers = ['Complejo', 'Ciudad', 'Owner', 'Plan', 'Canchas', 'Estado']
  const rows = clubs.value.map((c) => [
    c.nombre,
    c.ciudad || '',
    c.owner?.nombre || '',
    c.plan,
    c.canchas,
    c.estado,
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'complejos.csv'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: all 0.3s ease;
}

.drawer-enter-active > div:first-child,
.drawer-leave-active > div:first-child {
  transition: opacity 0.3s ease;
}

.drawer-enter-active > div:last-child,
.drawer-leave-active > div:last-child {
  transition: transform 0.3s ease;
}

.drawer-enter-from > div:first-child,
.drawer-leave-to > div:first-child {
  opacity: 0;
}

.drawer-enter-from > div:last-child,
.drawer-leave-to > div:last-child {
  transform: translateX(100%);
}
</style>
