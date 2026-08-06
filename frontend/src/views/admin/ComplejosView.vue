<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-stone-900">Complejos</h1>
        <p class="mt-1 text-sm text-stone-500">
          {{ stats.total }} cuentas en total · {{ stats.activos }} activas
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-2.5 text-sm font-semibold text-stone-600 shadow-sm transition-colors hover:bg-stone-50 cursor-pointer"
          @click="exportCSV"
        >
          <i class="icon-[material-symbols--download] text-base text-brand-green-500"></i> Exportar CSV
        </button>
        <button
          class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-4 py-2.5 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer"
          @click="openCreateDrawer"
        >
          <i class="icon-[material-symbols--add] text-base"></i> Nuevo complejo
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap items-center gap-4">
      <!-- Search -->
      <div class="relative">
        <i class="icon-[material-symbols--search] absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400"></i>
        <input
          v-model="search"
          type="text"
          placeholder="Buscar por nombre, ciudad u owner"
          class="h-10 w-80 rounded-lg border border-stone-200 bg-white pl-9 pr-4 text-sm text-stone-700 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-300 focus:ring-2 focus:ring-brand-green-100"
        />
      </div>

      <!-- Plan filters -->
      <div class="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1">
        <button
          v-for="f in planFilters"
          :key="f.value"
          class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
          :class="
            activePlan === f.value
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-50'
          "
          @click="activePlan = f.value"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Estado filters -->
      <div class="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1">
        <button
          v-for="f in estadoFilters"
          :key="f.value"
          class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
          :class="
            activeEstado === f.value
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-50'
          "
          @click="activeEstado = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-stone-200 bg-white">
      <!-- Table header -->
      <div class="grid items-center gap-4 border-b border-stone-100 px-6 py-3" :style="COLUMNAS">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Complejo</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Owner</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Plan</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400 text-center">Canchas</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Última actividad</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Estado</span>
        <span></span>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i>
      </div>

      <!-- Empty -->
      <div v-else-if="clubs.length === 0" class="py-16 text-center">
        <i class="icon-[material-symbols--apartment] text-4xl text-stone-200"></i>
        <p class="mt-3 text-sm text-stone-400">No se encontraron complejos</p>
      </div>

      <!-- Rows -->
      <div
        v-else
        v-for="club in clubs"
        :key="club._id"
        class="group grid items-center gap-4 border-b border-stone-50 px-6 py-3 transition-colors hover:bg-stone-50/50 last:border-0"
        :style="COLUMNAS"
      >
        <!-- Club name -->
        <div class="flex items-center gap-3">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-purple-500 text-[11px] font-medium text-white"
          >
            {{ clubInitials(club.nombre) }}
          </div>
          <div class="min-w-0">
            <p class="truncate text-xs font-medium text-stone-900">{{ club.nombre }}</p>
            <p class="truncate text-[11px] text-stone-400">
              {{ [club.ciudad, club.provincia].filter(Boolean).join(', ') || club.direccion || '—' }}
            </p>
          </div>
        </div>

        <!-- Owner -->
        <span class="truncate text-xs text-stone-700">
          {{ ownerShortName(club.owner) }}
        </span>

        <!-- Plan -->
        <div>
          <span
            class="inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
            :class="planStyle(club.plan)"
          >
            {{ club.plan }}
          </span>
        </div>

        <!-- Canchas -->
        <span class="text-center text-xs text-stone-600">
          {{ club.canchas }}
        </span>

        <!-- Última actividad -->
        <span class="text-xs text-stone-500">
          {{ formatTimeAgo(club.ultimaActividad) }}
        </span>

        <!-- Estado -->
        <div>
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            :class="estadoConfig(club.deletedAt ? 'eliminado' : club.estado).bg"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="estadoConfig(club.deletedAt ? 'eliminado' : club.estado).dot"></span>
            {{ estadoConfig(club.deletedAt ? 'eliminado' : club.estado).label }}
          </span>
        </div>

        <!-- Actions -->
        <div class="relative flex justify-end">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 opacity-0 transition-all hover:bg-stone-100 hover:text-stone-600 group-hover:opacity-100 cursor-pointer"
            @click.stop="openDetailDrawer(club)"
          >
            <i class="icon-[material-symbols--chevron-right] text-sm"></i>
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
            <div class="flex items-center gap-4 border-b border-stone-200 px-6 py-5">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                :class="selectedClub ? 'bg-brand-purple-500' : 'bg-brand-green-500'"
              >
                {{ selectedClub ? clubInitials(selectedClub.nombre) : '+' }}
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-lg font-semibold text-stone-900">
                  {{ drawerMode === 'create' ? 'Nuevo complejo' : form.nombre }}
                </h2>
              </div>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 cursor-pointer"
                @click="closeDrawer"
              >
                <i class="icon-[material-symbols--close] text-sm"></i>
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto px-6 py-6">
              <!-- Detail view (read mode) -->
              <div v-if="drawerMode === 'detail'" class="space-y-6">
                <!-- Quick actions (complejo activo) -->
                <div v-if="!isDeleted" class="flex flex-col gap-2">
                  <button
                    class="flex w-full items-center gap-3 rounded-full border border-stone-200 px-4 py-3 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
                    @click="handleEnterAsAdmin(selectedClub)"
                  >
                    <i class="icon-[material-symbols--login] text-sm text-stone-400"></i>
                    Ingresar como admin
                  </button>
                  <button
                    class="flex w-full items-center gap-3 rounded-full border border-stone-200 px-4 py-3 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
                    @click="drawerMode = 'edit'"
                  >
                    <i class="icon-[material-symbols--edit] text-sm text-stone-400"></i>
                    Editar complejo
                  </button>
                  <button
                    class="flex w-full items-center gap-3 rounded-full border px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer"
                    :class="
                      selectedClub?.estado === 'suspendido'
                        ? 'border-success-200 text-success-700 hover:bg-success-50'
                        : 'border-error-200 text-error-600 hover:bg-error-50'
                    "
                    @click="handleSuspend(selectedClub)"
                  >
                    <i class="icon-[material-symbols--power-settings-new] text-sm"></i>
                    {{ selectedClub?.estado === 'suspendido' ? 'Reactivar complejo' : 'Suspender complejo' }}
                  </button>
                  <button
                    class="flex w-full items-center gap-3 rounded-full border border-error-200 px-4 py-3 text-left text-sm font-medium text-error-600 transition-colors hover:bg-error-50 cursor-pointer"
                    @click="handleDelete(selectedClub)"
                  >
                    <i class="icon-[material-symbols--delete] text-sm"></i>
                    Eliminar complejo
                  </button>
                </div>

                <!-- Quick actions (complejo eliminado) -->
                <div v-else class="flex flex-col gap-2">
                  <div class="flex items-center gap-2 rounded-lg bg-stone-50 px-4 py-3 text-xs text-stone-500">
                    <i class="icon-[material-symbols--delete] text-sm text-stone-400"></i>
                    Este complejo está eliminado. Reestablecelo para volver a operarlo.
                  </div>
                  <button
                    class="flex w-full items-center gap-3 rounded-full border border-success-200 px-4 py-3 text-left text-sm font-medium text-success-700 transition-colors hover:bg-success-50 cursor-pointer"
                    @click="handleRestore(selectedClub)"
                  >
                    <i class="icon-[material-symbols--history] text-sm"></i>
                    Reestablecer complejo
                  </button>
                </div>

                <!-- Info sections -->
                <div class="space-y-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">Información</h3>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-stone-400">Ciudad</p>
                      <p class="text-sm font-medium text-stone-700">{{ selectedClub?.ciudad || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Provincia</p>
                      <p class="text-sm font-medium text-stone-700">{{ selectedClub?.provincia || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Dirección</p>
                      <p class="text-sm font-medium text-stone-700">{{ selectedClub?.direccion || '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Teléfono</p>
                      <p class="text-sm font-medium text-stone-700">{{ selectedClub?.telefono || '—' }}</p>
                    </div>
                  </div>

                  <div>
                    <p class="text-xs text-stone-400">Deportes habilitados</p>
                    <div class="mt-1.5 flex flex-wrap gap-1.5">
                      <span
                        v-for="d in deportesDelClub"
                        :key="d.key"
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        :class="[d.bg, d.text]"
                      >
                        <span class="h-1.5 w-1.5 rounded-full" :class="d.dot"></span>
                        {{ d.label }}
                      </span>
                      <span v-if="!deportesDelClub.length" class="text-sm text-stone-400">—</span>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">Suscripción</h3>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-stone-400">Plan</p>
                      <span
                        class="inline-block rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
                        :class="planStyle(selectedClub?.plan)"
                      >
                        {{ selectedClub?.plan }}
                      </span>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Estado</p>
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        :class="estadoConfig(isDeleted ? 'eliminado' : selectedClub?.estado).bg"
                      >
                        <span class="h-1.5 w-1.5 rounded-full" :class="estadoConfig(isDeleted ? 'eliminado' : selectedClub?.estado).dot"></span>
                        {{ estadoConfig(isDeleted ? 'eliminado' : selectedClub?.estado).label }}
                      </span>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Canchas</p>
                      <p class="text-sm font-medium text-stone-700">{{ selectedClub?.canchas ?? '—' }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Owner</p>
                      <p class="text-sm font-medium text-stone-700">{{ ownerShortName(selectedClub?.owner) }}</p>
                    </div>
                  </div>
                </div>

                <div class="space-y-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">Actividad</h3>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-stone-400">Última actividad</p>
                      <p class="text-sm font-medium text-stone-700">{{ formatTimeAgo(selectedClub?.ultimaActividad) }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Creado</p>
                      <p class="text-sm font-medium text-stone-700">{{ formatDate(selectedClub?.createdAt) }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Create / Edit form -->
              <div v-else class="space-y-6">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Nombre</label>
                  <input
                    v-model="form.nombre"
                    type="text"
                    placeholder="Nombre del complejo"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                    @input="drawerMode === 'create' && autoSlug()"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Slug</label>
                  <input
                    v-model="form.slug"
                    type="text"
                    placeholder="slug-del-complejo"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Ciudad</label>
                    <input
                      v-model="form.ciudad"
                      type="text"
                      placeholder="Ciudad"
                      class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Provincia</label>
                    <input
                      v-model="form.provincia"
                      type="text"
                      placeholder="Provincia"
                      class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Dirección</label>
                  <input
                    v-model="form.direccion"
                    type="text"
                    placeholder="Dirección completa"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Teléfono</label>
                  <input
                    v-model="form.telefono"
                    type="text"
                    placeholder="+54 11 1234-5678"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Deportes</label>
                  <p class="mb-2 text-xs leading-relaxed text-stone-500">
                    Con qué deportes trabaja el complejo. Sólo va a poder cargar canchas de estos.
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="d in SPORTS"
                      :key="d.key"
                      class="flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                      :class="
                        form.deportes.includes(d.key)
                          ? [d.border, d.bg, d.text]
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      "
                      @click="toggleDeporte(d.key)"
                    >
                      <span class="h-2 w-2 rounded-full" :class="form.deportes.includes(d.key) ? d.dot : 'bg-stone-300'"></span>
                      {{ d.label }}
                    </button>
                  </div>
                  <p v-if="!form.deportes.length" class="mt-2 text-xs text-error-500">
                    Elegí al menos un deporte.
                  </p>
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Plan</label>
                  <div class="flex gap-2">
                    <button
                      v-for="p in planOptions"
                      :key="p.value"
                      class="rounded-full border px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                      :class="
                        form.plan === p.value
                          ? 'border-brand-green-300 bg-brand-green-50 text-brand-green-700'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      "
                      @click="form.plan = p.value"
                    >
                      {{ p.label }}
                    </button>
                  </div>
                </div>

                <div v-if="drawerMode === 'edit'">
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Estado</label>
                  <div class="flex gap-2">
                    <button
                      v-for="e in estadoOptions"
                      :key="e.value"
                      class="rounded-full border px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                      :class="
                        form.estado === e.value
                          ? 'border-brand-green-300 bg-brand-green-50 text-brand-green-700'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
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
            <div v-if="drawerMode !== 'detail'" class="flex items-center justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <button
                class="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
                @click="closeDrawer"
              >
                Cancelar
              </button>
              <button
                class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-medium text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="saving || !form.nombre || !form.slug || !form.deportes.length"
                @click="handleSave"
              >
                <i v-if="saving" class="icon-[material-symbols--progress-activity] animate-spin text-xs"></i>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import adminService from '@/services/adminService'
import { SPORTS, sportsForClub } from '@/utils/sports'

const router = useRouter()
const confirm = useConfirm()
const toast = useToast()
const { setCurrentClubId } = useAuth()

// Un complejo está "eliminado" (borrado lógico) si tiene deletedAt.
const isDeleted = computed(() => !!selectedClub.value?.deletedAt)

// Columnas de la grilla. Va en una constante porque el encabezado y las filas
// tienen que compartirlas sí o sí: definidas por separado se desalinean apenas
// se toca una columna.
const COLUMNAS = { gridTemplateColumns: '2fr 1.2fr 1fr 0.8fr 1fr 1fr 40px' }

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

// Un complejo nuevo arranca con los tres deportes más comunes; el superadmin
// destilda lo que no corresponda antes de crearlo.
const DEFAULT_DEPORTES = ['futbol', 'padel', 'tenis']

const form = ref(getEmptyForm())

const deportesDelClub = computed(() => sportsForClub(selectedClub.value))

const toggleDeporte = (key) => {
  const i = form.value.deportes.indexOf(key)
  if (i >= 0) form.value.deportes.splice(i, 1)
  else form.value.deportes.push(key)
}

function getEmptyForm() {
  return {
    nombre: '',
    slug: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    telefono: '',
    plan: 'start',
    estado: 'trial',
    deportes: [...DEFAULT_DEPORTES],
  }
}


const planFilters = [
  { label: 'Todos los planes', value: null },
  { label: 'Start', value: 'start' },
  { label: 'Pro', value: 'pro' },
  { label: 'Elite', value: 'elite' },
]

const estadoFilters = [
  { label: 'Todos', value: null },
  { label: 'Activos', value: 'activo' },
  { label: 'Trial', value: 'trial' },
  { label: 'Impagos', value: 'impago' },
  { label: 'Cancelados', value: 'cancelado' },
  { label: 'Eliminados', value: 'eliminado' },
]

// Los planes se diferencian sólo por cantidad de canchas.
const planOptions = [
  { label: 'Start · hasta 3 canchas', value: 'start' },
  { label: 'Pro · 4 a 6 canchas', value: 'pro' },
  { label: 'Elite · 7 o más', value: 'elite' },
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
    if (activeEstado.value === 'eliminado') {
      params.eliminados = true
    } else if (activeEstado.value) {
      params.estado = activeEstado.value
    }

    const response = await adminService.getClubs(params)
    clubs.value = response.clubs
    stats.value = response.stats
  } catch (err) {
    console.error('Error fetching clubs:', err)
    const detail = err.response?.data?.message || 'No se pudieron cargar los complejos.'
    toast.add({ severity: 'error', summary: 'Error al cargar', detail, life: 5000 })
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
    plan: club.plan || 'start',
    estado: club.estado || 'activo',
    // Los complejos anteriores a los deportes habilitados pueden no tenerlos
    // (hasta que corra la migración): se muestran los tres por defecto.
    deportes: club.deportes?.length ? [...club.deportes] : [...DEFAULT_DEPORTES],
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
    const creating = drawerMode.value === 'create'
    if (creating) {
      await adminService.createClub(form.value)
    } else {
      await adminService.updateClub(selectedClub.value._id, form.value)
    }
    closeDrawer()
    await fetchClubs()
    toast.add({
      severity: 'success',
      summary: creating ? 'Complejo creado' : 'Complejo actualizado',
      detail: `"${form.value.nombre}" se guardó correctamente.`,
      life: 3000,
    })
  } catch (err) {
    console.error('Error saving club:', err)
    const detail = err.response?.data?.message || 'No se pudo guardar el complejo.'
    toast.add({ severity: 'error', summary: 'Error al guardar', detail, life: 5000 })
  } finally {
    saving.value = false
  }
}

const handleSuspend = async (club) => {
  try {
    const { message } = await adminService.suspendClub(club._id)
    closeDrawer()
    await fetchClubs()
    toast.add({ severity: 'success', summary: message || 'Estado actualizado', life: 3000 })
  } catch (err) {
    console.error('Error suspending club:', err)
    const detail = err.response?.data?.message || 'No se pudo cambiar el estado del complejo.'
    toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 })
  }
}

const handleDelete = (club) => {
  confirm.require({
    header: 'Eliminar complejo',
    message: `¿Seguro que querés eliminar "${club.nombre}"? Se ocultará junto con sus canchas. Podés reestablecerlo más tarde desde el filtro "Eliminados".`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await adminService.deleteClub(club._id)
        toast.add({
          severity: 'success',
          summary: 'Complejo eliminado',
          detail: `"${club.nombre}" se eliminó correctamente.`,
          life: 3000,
        })
        closeDrawer()
        await fetchClubs()
      } catch (err) {
        console.error('Error deleting club:', err)
        const detail = err.response?.data?.message || 'No se pudo eliminar el complejo.'
        toast.add({ severity: 'error', summary: 'Error al eliminar', detail, life: 5000 })
      }
    },
  })
}

const handleRestore = (club) => {
  confirm.require({
    header: 'Reestablecer complejo',
    message: `¿Reestablecer "${club.nombre}"? Volverá a estar disponible junto con sus canchas.`,
    icon: 'pi pi-history',
    acceptLabel: 'Reestablecer',
    rejectLabel: 'Cancelar',
    acceptProps: { severity: 'success' },
    rejectProps: { severity: 'secondary', outlined: true },
    accept: async () => {
      try {
        await adminService.restoreClub(club._id)
        toast.add({
          severity: 'success',
          summary: 'Complejo reestablecido',
          detail: `"${club.nombre}" volvió a estar activo.`,
          life: 3000,
        })
        closeDrawer()
        await fetchClubs()
      } catch (err) {
        console.error('Error restoring club:', err)
        const detail = err.response?.data?.message || 'No se pudo reestablecer el complejo.'
        toast.add({ severity: 'error', summary: 'Error al reestablecer', detail, life: 5000 })
      }
    },
  })
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
    start: 'bg-stone-100 text-stone-700',
    pro: 'bg-brand-green-50 text-brand-green-700',
    elite: 'bg-brand-purple-50 text-brand-purple-700',
  }
  return styles[plan] || styles.start
}

const estadoConfig = (estado) => {
  const map = {
    activo: { label: 'Activo', dot: 'bg-success-500', bg: 'bg-success-50 text-success-700' },
    trial: { label: 'Trial', dot: 'bg-brand-purple-500', bg: 'bg-brand-purple-50 text-brand-purple-700' },
    suspendido: { label: 'Suspendido', dot: 'bg-error-500', bg: 'bg-error-50 text-error-700' },
    cancelado: { label: 'Cancelado', dot: 'bg-stone-400', bg: 'bg-stone-100 text-stone-600' },
    impago: { label: 'Impago', dot: 'bg-warning-500', bg: 'bg-warning-50 text-warning-700' },
    inactivo: { label: 'Inactivo', dot: 'bg-stone-400', bg: 'bg-stone-100 text-stone-600' },
    eliminado: { label: 'Eliminado', dot: 'bg-error-500', bg: 'bg-error-50 text-error-700' },
  }
  return map[estado] || map.inactivo
}

const clubInitials = (nombre) => {
  if (!nombre) return '??'
  const parts = nombre.split(' ')
  return parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase()
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
