<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-stone-900">Usuarios</h1>
        <p class="mt-1 text-sm text-stone-500">
          {{ stats.total }} usuarios registrados
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-4 py-2.5 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer"
          @click="openCreateDrawer"
        >
          <i class="icon-[material-symbols--add] text-base"></i> Nuevo usuario
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-6 flex flex-wrap items-center gap-4">
      <div class="relative">
        <i class="icon-[material-symbols--search] absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400"></i>
        <input
          v-model="search"
          type="text"
          placeholder="Buscar por nombre o email"
          class="h-10 w-80 rounded-lg border border-stone-200 bg-white pl-9 pr-4 text-sm text-stone-700 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-300 focus:ring-2 focus:ring-brand-green-100"
        />
      </div>

      <!-- Role filter -->
      <div class="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-1">
        <button
          v-for="f in roleFilters"
          :key="f.value"
          class="rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
          :class="
            activeRole === f.value
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-50'
          "
          @click="activeRole = f.value"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Club filter -->
      <div v-if="allClubs.length > 0" class="relative">
        <!-- "Todos" es la ausencia de filtro (null), y PrimeVue no puede
             seleccionar una opción de valor null: se muestra como placeholder y
             se vuelve a ella con la X de limpiar. -->
        <Select
          v-model="activeClubId"
          :options="clubOptions"
          option-label="label"
          option-value="value"
          placeholder="Todos los complejos"
          show-clear
          :filter="allClubs.length > 8"
          filter-placeholder="Buscar complejo"
          class="h-10 w-64 text-xs"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-xl border border-stone-200 bg-white">
      <div class="grid items-center gap-4 border-b border-stone-100 px-6 py-3" :style="COLUMNAS">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Usuario</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Email</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Complejos</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Rol</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Estado</span>
        <span></span>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16">
        <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i>
      </div>

      <div v-else-if="users.length === 0" class="py-16 text-center">
        <i class="icon-[material-symbols--group] text-4xl text-stone-200"></i>
        <p class="mt-3 text-sm text-stone-400">No se encontraron usuarios</p>
      </div>

      <div
        v-else
        v-for="user in users"
        :key="user._id"
        class="group grid items-center gap-4 border-b border-stone-50 px-6 py-3 transition-colors hover:bg-stone-50/50 last:border-0"
        :style="COLUMNAS"
      >
        <!-- Name -->
        <div class="flex items-center gap-3">
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white bg-brand-purple-500"
          >
            {{ initials(user.nombre) }}
          </div>
          <div class="min-w-0">
            <p class="truncate text-xs font-medium text-stone-900">{{ user.nombre }}</p>
          </div>
        </div>

        <!-- Email -->
        <span class="truncate text-xs text-stone-700">{{ user.email }}</span>

        <!-- Clubs -->
        <div class="flex flex-wrap gap-1">
          <span
            v-for="m in user.memberships.filter(mb => mb.estado === 'activo')"
            :key="m._id"
            class="inline-flex items-center gap-1 rounded-full bg-brand-purple-200 px-2 py-0.5 text-[11px] font-medium text-brand-purple-900"
          >
            {{ m.club?.nombre }}
          </span>
          <span v-if="user.memberships.filter(mb => mb.estado === 'activo').length === 0" class="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">Sin complejo</span>
        </div>

        <!-- Rol -->
        <div class="flex flex-wrap gap-1">
          <span
            v-for="r in userRoles(user)"
            :key="r.value"
            class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
            :class="r.clase"
          >
            {{ r.label }}
          </span>
        </div>

        <!-- Estado -->
        <div>
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            :class="user.estado === 'activo' ? 'bg-success-50 text-success-700' : 'bg-stone-100 text-stone-600'"
          >
            <span class="h-1.5 w-1.5 rounded-full" :class="user.estado === 'activo' ? 'bg-success-500' : 'bg-stone-400'"></span>
            {{ user.estado === 'activo' ? 'Activo' : 'Inactivo' }}
          </span>
        </div>

        <!-- Actions -->
        <div class="relative flex justify-end">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 opacity-0 transition-all hover:bg-stone-100 hover:text-stone-600 group-hover:opacity-100 cursor-pointer"
            @click.stop="openDetailDrawer(user)"
          >
            <i class="icon-[material-symbols--chevron-right] text-sm"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Drawer -->
    <Teleport to="body">
      <Transition name="drawer">
        <div
          v-if="drawerVisible"
          class="fixed inset-0 z-50 flex justify-end"
          @click="handleOverlayClick"
        >
          <div class="absolute inset-0 bg-black/30 transition-opacity" />

          <div class="relative flex w-full max-w-lg flex-col bg-white shadow-2xl">
            <!-- Header -->
            <div class="flex items-center gap-4 border-b border-stone-200 px-6 py-5">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                :class="selectedUser ? 'bg-brand-purple-500' : 'bg-brand-green-500'"
              >
                {{ selectedUser ? initials(selectedUser.nombre) : '+' }}
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-lg font-semibold text-stone-900">
                  {{ drawerMode === 'create' ? 'Nuevo usuario' : form.nombre || 'Usuario' }}
                </h2>
                <p class="text-sm text-stone-400">
                  {{ drawerMode === 'create' ? 'Crear cuenta y asignar a un complejo' : form.email }}
                </p>
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
              <!-- Detail mode -->
              <div v-if="drawerMode === 'detail'" class="space-y-6">
                <!-- Actions -->
                <div class="flex flex-col gap-2">
                  <button
                    class="flex w-full items-center gap-3 rounded-full border border-stone-200 px-4 py-3 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
                    @click="drawerMode = 'edit'"
                  >
                    <i class="icon-[material-symbols--edit] text-sm text-stone-400"></i>
                    Editar usuario
                  </button>
                  <button
                    class="flex w-full items-center gap-3 rounded-full border border-stone-200 px-4 py-3 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
                    @click="drawerMode = 'assign'"
                  >
                    <i class="icon-[material-symbols--link] text-sm text-stone-400"></i>
                    Asignar a complejo
                  </button>
                  <button
                    class="flex w-full items-center gap-3 rounded-full border px-4 py-3 text-left text-sm font-medium transition-colors cursor-pointer"
                    :class="
                      selectedUser?.estado === 'activo'
                        ? 'border-error-200 text-error-600 hover:bg-error-50'
                        : 'border-success-200 text-success-700 hover:bg-success-50'
                    "
                    @click="toggleUserStatus"
                  >
                    <i class="icon-[material-symbols--power-settings-new] text-sm"></i>
                    {{ selectedUser?.estado === 'activo' ? 'Desactivar usuario' : 'Activar usuario' }}
                  </button>
                </div>

                <!-- Info -->
                <div class="space-y-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">Información</h3>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <p class="text-xs text-stone-400">Nombre</p>
                      <p class="text-sm font-medium text-stone-700">{{ selectedUser?.nombre }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Email</p>
                      <p class="text-sm font-medium text-stone-700">{{ selectedUser?.email }}</p>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Estado</p>
                      <span
                        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        :class="selectedUser?.estado === 'activo' ? 'bg-success-50 text-success-700' : 'bg-stone-100 text-stone-600'"
                      >
                        <span class="h-1.5 w-1.5 rounded-full" :class="selectedUser?.estado === 'activo' ? 'bg-success-500' : 'bg-stone-400'"></span>
                        {{ selectedUser?.estado === 'activo' ? 'Activo' : 'Inactivo' }}
                      </span>
                    </div>
                    <div>
                      <p class="text-xs text-stone-400">Registrado</p>
                      <p class="text-sm font-medium text-stone-700">{{ formatDate(selectedUser?.createdAt) }}</p>
                    </div>
                  </div>
                </div>

                <!-- Memberships -->
                <div class="space-y-4">
                  <h3 class="text-xs font-semibold uppercase tracking-wider text-stone-400">Complejos asignados</h3>
                  <div v-if="selectedUser?.memberships?.length === 0" class="rounded-lg border border-dashed border-stone-200 py-6 text-center">
                    <p class="text-sm text-stone-400">Sin complejos asignados</p>
                  </div>
                  <div v-else class="space-y-2">
                    <div
                      v-for="m in selectedUser?.memberships"
                      :key="m._id"
                      class="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3"
                    >
                      <div>
                        <p class="text-sm font-medium text-stone-700">{{ m.club?.nombre }}</p>
                        <p class="text-xs text-stone-400">{{ roleLabel(m.role) }} · {{ m.estado === 'activo' ? 'Activo' : 'Inactivo' }}</p>
                      </div>
                      <button
                        v-if="m.estado === 'activo'"
                        class="text-xs font-medium text-error-500 transition-colors hover:text-error-600 cursor-pointer"
                        @click="handleRemoveFromClub(m._id)"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Create mode -->
              <div v-else-if="drawerMode === 'create'" class="space-y-6">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Nombre completo</label>
                  <input
                    v-model="form.nombre"
                    type="text"
                    placeholder="Juan Pérez"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Email</label>
                  <input
                    v-model="form.email"
                    type="email"
                    placeholder="juan@ejemplo.com"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Contraseña</label>
                  <input
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Mínimo 6 caracteres"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                  />
                  <div class="!mt-2 flex items-center justify-between">
                    <p class="text-[11px] text-stone-400">El usuario podrá cambiarla después</p>
                    <div class="flex gap-2">
                      <button
                        class="text-[11px] font-medium text-stone-400 transition-colors hover:text-stone-600 cursor-pointer"
                        @click="showPassword = !showPassword"
                      >
                        {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                      </button>
                      <button
                        class="text-[11px] font-medium text-brand-green-500 transition-colors hover:text-brand-green-600 cursor-pointer"
                        @click="generatePassword"
                      >
                        Generar
                      </button>
                    </div>
                  </div>
                </div>

                <div class="border-t border-stone-100 pt-6">
                  <h3 class="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-400">Asignar a complejo (opcional)</h3>

                  <div>
                    <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Complejo</label>
                    <Select
                      v-model="form.clubId"
                      :options="clubOptions"
                      option-label="label"
                      option-value="value"
                      placeholder="Sin asignar"
                      show-clear
                      :filter="allClubs.length > 8"
                      filter-placeholder="Buscar complejo"
                      class="h-[42px] w-full text-sm"
                    />
                  </div>

                  <div v-if="form.clubId" class="mt-4">
                    <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Rol en el complejo</label>
                    <div class="flex gap-2">
                      <button
                        v-for="r in clubRoleOptions"
                        :key="r.value"
                        class="rounded-full border px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                        :class="
                          form.role === r.value
                            ? 'border-brand-green-300 bg-brand-green-50 text-brand-green-700'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        "
                        @click="form.role = r.value"
                      >
                        {{ r.label }}
                      </button>
                    </div>
                    <p class="!mt-2 text-[11px] text-stone-400">{{ roleDescription(form.role) }}</p>
                  </div>
                </div>
              </div>

              <!-- Edit mode -->
              <div v-else-if="drawerMode === 'edit'" class="space-y-6">
                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Nombre completo</label>
                  <input
                    v-model="form.nombre"
                    type="text"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Email</label>
                  <input
                    v-model="form.email"
                    type="email"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Nueva contraseña</label>
                  <input
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="Dejar vacío para no cambiar"
                    class="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 outline-none transition-colors placeholder:text-stone-400 focus:border-brand-green-500 focus:ring-1 focus:ring-brand-green-500"
                  />
                  <div class="!mt-2 flex items-center justify-end gap-2">
                    <button
                      class="text-[11px] font-medium text-stone-400 transition-colors hover:text-stone-600 cursor-pointer"
                      @click="showPassword = !showPassword"
                    >
                      {{ showPassword ? 'Ocultar' : 'Mostrar' }}
                    </button>
                    <button
                      class="text-[11px] font-medium text-brand-green-500 transition-colors hover:text-brand-green-600 cursor-pointer"
                      @click="generatePassword"
                    >
                      Generar
                    </button>
                  </div>
                </div>
              </div>

              <!-- Assign mode -->
              <div v-else-if="drawerMode === 'assign'" class="space-y-6">
                <p class="text-sm text-stone-500">
                  Asignar <span class="font-medium text-stone-700">{{ selectedUser?.nombre }}</span> a un complejo con un rol específico.
                </p>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Complejo</label>
                  <Select
                    v-model="assignClubId"
                    :options="clubOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="Seleccionar complejo"
                    :filter="allClubs.length > 8"
                    filter-placeholder="Buscar complejo"
                    class="h-[42px] w-full text-sm"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-xs font-semibold tracking-wider text-stone-400 uppercase">Rol</label>
                  <div class="flex gap-2">
                    <button
                      v-for="r in clubRoleOptions"
                      :key="r.value"
                      class="rounded-full border px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
                      :class="
                        assignRole === r.value
                          ? 'border-brand-green-300 bg-brand-green-50 text-brand-green-700'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      "
                      @click="assignRole = r.value"
                    >
                      {{ r.label }}
                    </button>
                  </div>
                  <p class="!mt-2 text-[11px] text-stone-400">{{ roleDescription(assignRole) }}</p>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div v-if="drawerMode !== 'detail'" class="flex items-center justify-end gap-3 border-t border-stone-200 px-6 py-4">
              <button
                class="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 cursor-pointer"
                @click="drawerMode === 'assign' || drawerMode === 'edit' ? drawerMode = 'detail' : closeDrawer()"
              >
                {{ drawerMode === 'assign' || drawerMode === 'edit' ? 'Volver' : 'Cancelar' }}
              </button>
              <button
                class="flex items-center gap-2 rounded-full bg-brand-lime-500 px-5 py-2.5 text-sm font-medium text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="saving || !canSave"
                @click="handleSave"
              >
                <i v-if="saving" class="icon-[material-symbols--progress-activity] animate-spin text-xs"></i>
                {{ saving ? 'Guardando...' : saveLabel }}
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
import Select from 'primevue/select'
import adminService from '@/services/adminService'

const users = ref([])
const stats = ref({ total: 0 })
const loading = ref(false)
const search = ref('')
const activeRole = ref(null)
const activeClubId = ref(null)
const allClubs = ref([])

const clubOptions = computed(() =>
  allClubs.value.map((c) => ({ value: c._id, label: c.nombre })),
)

const drawerVisible = ref(false)
const drawerMode = ref('create')
const selectedUser = ref(null)
const saving = ref(false)
const showPassword = ref(false)

const assignClubId = ref(null)
const assignRole = ref('tenant_admin')

const form = ref(getEmptyForm())

function getEmptyForm() {
  return {
    nombre: '',
    email: '',
    password: '',
    clubId: null,
    role: 'tenant_admin',
  }
}

const roleFilters = [
  { label: 'Todos', value: null },
  { label: 'Admin', value: 'tenant_admin' },
  { label: 'Empleado', value: 'employee' },
  { label: 'Cliente', value: 'customer' },
]

const clubRoleOptions = [
  { label: 'Admin', value: 'tenant_admin' },
  { label: 'Empleado', value: 'employee' },
  { label: 'Cliente', value: 'customer' },
]

const roleLabel = (role) => {
  const map = { tenant_admin: 'Admin', employee: 'Empleado', customer: 'Cliente', superadmin: 'Superadmin' }
  return map[role] || role
}

// Columnas de la grilla. Va en una constante porque el encabezado y las filas
// tienen que compartirlas sí o sí: definidas por separado se desalinean apenas
// se agrega una columna.
const COLUMNAS = { gridTemplateColumns: '2fr 2fr 1.5fr 1.2fr 1fr 40px' }

const ROLE_CHIP = {
  superadmin: 'bg-brand-green-100 text-brand-green-700',
  tenant_admin: 'bg-brand-lime-100 text-brand-lime-800',
  employee: 'bg-stone-100 text-stone-600',
  customer: 'border border-stone-200 bg-white text-stone-500',
}

// Los roles de un usuario para la columna "Rol": el global (superadmin) más los
// de sus complejos activos, sin repetir. Un usuario puede ser admin en un club y
// empleado en otro, así que la columna es una lista y no un valor único.
const userRoles = (user) => {
  const roles = []
  if (user.globalRole === 'superadmin') roles.push('superadmin')
  for (const m of user.memberships || []) {
    if (m.estado === 'activo' && !roles.includes(m.role)) roles.push(m.role)
  }
  if (!roles.length) return [{ value: 'sin_rol', label: 'Sin rol', clase: 'bg-stone-100 text-stone-500' }]
  return roles.map((r) => ({ value: r, label: roleLabel(r), clase: ROLE_CHIP[r] || 'bg-stone-100 text-stone-600' }))
}

const roleDescription = (role) => {
  const map = {
    tenant_admin: 'Acceso total al complejo: canchas, turnos, caja, reportes',
    employee: 'Puede gestionar turnos y ver canchas',
    customer: 'Puede reservar turnos',
  }
  return map[role] || ''
}

const canSave = computed(() => {
  if (drawerMode.value === 'create') return form.value.nombre && form.value.email && form.value.password?.length >= 6
  if (drawerMode.value === 'edit') return form.value.nombre && form.value.email
  if (drawerMode.value === 'assign') return assignClubId.value && assignRole.value
  return false
})

const saveLabel = computed(() => {
  if (drawerMode.value === 'create') return 'Crear usuario'
  if (drawerMode.value === 'edit') return 'Guardar cambios'
  if (drawerMode.value === 'assign') return 'Asignar'
  return 'Guardar'
})

const fetchUsers = async () => {
  loading.value = true
  try {
    const params = {}
    if (search.value) params.search = search.value
    if (activeRole.value) params.role = activeRole.value
    if (activeClubId.value) params.clubId = activeClubId.value

    const response = await adminService.getUsers(params)
    users.value = response.users
    stats.value = response.stats
  } catch (err) {
    console.error('Error fetching users:', err)
  } finally {
    loading.value = false
  }
}

const fetchClubs = async () => {
  try {
    const response = await adminService.getClubs({ limit: 100 })
    allClubs.value = response.clubs
  } catch (err) {
    console.error('Error fetching clubs:', err)
  }
}

let searchTimeout = null
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchUsers, 300)
})

watch([activeRole, activeClubId], fetchUsers)

onMounted(() => {
  fetchUsers()
  fetchClubs()
})

const openCreateDrawer = () => {
  drawerMode.value = 'create'
  selectedUser.value = null
  form.value = getEmptyForm()
  showPassword.value = true
  drawerVisible.value = true
}

const openDetailDrawer = (user) => {
  drawerMode.value = 'detail'
  selectedUser.value = user
  form.value = {
    nombre: user.nombre,
    email: user.email,
    password: '',
    clubId: null,
    role: 'tenant_admin',
  }
  showPassword.value = false
  drawerVisible.value = true
}

const closeDrawer = () => {
  drawerVisible.value = false
  drawerMode.value = 'create'
  selectedUser.value = null
  form.value = getEmptyForm()
  showPassword.value = false
  assignClubId.value = null
  assignRole.value = 'tenant_admin'
}

const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) closeDrawer()
}

const handleSave = async () => {
  saving.value = true
  try {
    if (drawerMode.value === 'create') {
      await adminService.createUser(form.value)
    } else if (drawerMode.value === 'edit') {
      const payload = { nombre: form.value.nombre, email: form.value.email }
      if (form.value.password) payload.password = form.value.password
      await adminService.updateUser(selectedUser.value._id, payload)
    } else if (drawerMode.value === 'assign') {
      await adminService.assignUserToClub(selectedUser.value._id, assignClubId.value, assignRole.value)
    }
    closeDrawer()
    await fetchUsers()
  } catch (err) {
    console.error('Error saving:', err)
  } finally {
    saving.value = false
  }
}

const toggleUserStatus = async () => {
  if (!selectedUser.value) return
  try {
    const newEstado = selectedUser.value.estado === 'activo' ? 'inactivo' : 'activo'
    await adminService.updateUser(selectedUser.value._id, { estado: newEstado })
    closeDrawer()
    await fetchUsers()
  } catch (err) {
    console.error('Error toggling status:', err)
  }
}

const handleRemoveFromClub = async (membershipId) => {
  try {
    await adminService.removeUserFromClub(membershipId)
    closeDrawer()
    await fetchUsers()
  } catch (err) {
    console.error('Error removing from club:', err)
  }
}

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  form.value.password = password
  showPassword.value = true
}

const initials = (nombre) => {
  if (!nombre) return '??'
  const parts = nombre.split(' ')
  return parts.map((p) => p[0]).join('').substring(0, 2).toUpperCase()
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
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
