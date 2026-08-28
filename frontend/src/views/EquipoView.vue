<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import membershipService from '@/services/membershipService'
import invitationService from '@/services/invitationService'
import InviteMemberModal from '@/components/equipo/InviteMemberModal.vue'
import { dayjs, formatInTz, DEFAULT_TZ } from '@/utils/datetime'

const { currentClubId, currentClub, user } = useAuth()
const toast = useToast()

const tz = computed(() => currentClub.value?.timezone || DEFAULT_TZ)

const memberships = ref([])
const invitations = ref([])
const loading = ref(false)
const inviteOpen = ref(false)
// Id de la fila con una acción en curso: evita doble clic y da feedback.
const busyId = ref(null)

const ROLE_META = {
  tenant_admin: { label: 'Administrador', class: 'bg-brand-green-100 text-brand-green-700' },
  employee: { label: 'Empleado', class: 'bg-brand-purple-100 text-brand-purple-700' },
  customer: { label: 'Cliente', class: 'bg-stone-100 text-stone-600' },
}
const roleMeta = (role) => ROLE_META[role] || ROLE_META.customer

const fetchAll = async () => {
  if (!currentClubId.value) {
    memberships.value = []
    invitations.value = []
    return
  }

  loading.value = true
  try {
    const [m, i] = await Promise.all([
      membershipService.listByClub(currentClubId.value),
      invitationService.listByClub(currentClubId.value),
    ])
    // El equipo son los roles de gestión: los clientes viven en su propia vista.
    memberships.value = (m.memberships || []).filter((x) =>
      ['tenant_admin', 'employee'].includes(x.role),
    )
    invitations.value = i.invitations || []
  } catch (err) {
    console.error(err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo cargar el equipo.',
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)
watch(currentClubId, fetchAll)

const activos = computed(() => memberships.value.filter((m) => m.estado === 'activo'))
const admins = computed(() => activos.value.filter((m) => m.role === 'tenant_admin').length)

const esUnoMismo = (m) => String(m.user?._id) === String(user.value?._id)

const initials = (m) => {
  const n = m.user?.nombre || m.user?.email || '?'
  return (
    n
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  )
}

const fmtDate = (d) => (d ? formatInTz(d, tz.value, 'DD MMM YYYY') : '—')

const diasParaVencer = (expiresAt) => {
  const dias = dayjs.utc(expiresAt).diff(dayjs.utc(), 'day')
  if (dias <= 0) return 'vence hoy'
  return dias === 1 ? 'vence mañana' : `vence en ${dias} días`
}

// --- Acciones sobre miembros ---
const updateMember = async (m, payload, successMsg) => {
  busyId.value = m._id
  try {
    const data = await membershipService.update(currentClubId.value, m._id, payload)
    const i = memberships.value.findIndex((x) => x._id === m._id)
    if (i >= 0) memberships.value[i] = data.membership
    toast.add({ severity: 'success', summary: 'Listo', detail: successMsg, life: 3000 })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo aplicar',
      detail: error.response?.data?.message || 'Intentá de nuevo.',
      life: 5000,
    })
  } finally {
    busyId.value = null
  }
}

const toggleRole = (m) => {
  const nuevo = m.role === 'tenant_admin' ? 'employee' : 'tenant_admin'
  updateMember(m, { role: nuevo }, `${m.user?.nombre} ahora es ${roleMeta(nuevo).label.toLowerCase()}.`)
}

const toggleEstado = (m) => {
  const nuevo = m.estado === 'activo' ? 'inactivo' : 'activo'
  const msg =
    nuevo === 'inactivo'
      ? `${m.user?.nombre} ya no tiene acceso al complejo.`
      : `${m.user?.nombre} recuperó el acceso.`
  updateMember(m, { estado: nuevo }, msg)
}

// --- Invitaciones ---
const onInvited = (email) => {
  toast.add({
    severity: 'success',
    summary: 'Invitación enviada',
    detail: `Le llegó un email a ${email}.`,
    life: 4000,
  })
  fetchAll()
}

const revoke = async (inv) => {
  busyId.value = inv._id
  try {
    await invitationService.revoke(currentClubId.value, inv._id)
    invitations.value = invitations.value.filter((x) => x._id !== inv._id)
    toast.add({
      severity: 'success',
      summary: 'Invitación revocada',
      detail: `El link enviado a ${inv.email} dejó de funcionar.`,
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'No se pudo revocar',
      detail: error.response?.data?.message || 'Intentá de nuevo.',
      life: 5000,
    })
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold text-brand-green-900 sm:text-2xl">Equipo</h1>
        <p class="mt-1 text-sm text-stone-500">
          Quiénes pueden gestionar el complejo. Cada persona elige su propia contraseña.
        </p>
      </div>
      <button
        v-if="currentClubId"
        class="flex h-10 shrink-0 items-center gap-2 rounded-full bg-brand-lime-500 px-5 text-sm font-semibold text-brand-green-900 transition-colors hover:bg-brand-lime-600 cursor-pointer"
        @click="inviteOpen = true"
      >
        <i class="icon-[material-symbols--person-add] text-base"></i> Invitar
      </button>
    </div>

    <!-- No club -->
    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--apartment] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-brand-green-900">Sin club seleccionado</h3>
      <p class="!mt-2 text-sm text-stone-500">
        Seleccioná un club desde el encabezado para ver su equipo.
      </p>
    </div>

    <template v-else>
      <!-- Tiles -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 bg-brand-green-50 text-brand-green-500">
            <i class="icon-[material-symbols--group] text-xl"></i>
          </span>
          <p class="mt-3 text-xs font-medium text-stone-500 sm:mt-4 sm:text-sm">Miembros activos</p>
          <p class="mt-1 text-xl font-bold font-secondary text-brand-green-900 sm:text-2xl">{{ activos.length }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 bg-brand-purple-50 text-brand-purple-500">
            <i class="icon-[material-symbols--shield-outline] text-xl"></i>
          </span>
          <p class="mt-3 text-xs font-medium text-stone-500 sm:mt-4 sm:text-sm">Administradores</p>
          <p class="mt-1 text-xl font-bold font-secondary text-brand-green-900 sm:text-2xl">{{ admins }}</p>
        </div>
        <div class="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm sm:p-5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-11 sm:w-11 bg-warning-50 text-warning-600">
            <i class="icon-[material-symbols--mail-outline] text-xl"></i>
          </span>
          <p class="mt-3 text-xs font-medium text-stone-500 sm:mt-4 sm:text-sm">Invitaciones pendientes</p>
          <p class="mt-1 text-xl font-bold font-secondary text-brand-green-900 sm:text-2xl">{{ invitations.length }}</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i>
      </div>

      <template v-else>
        <!-- Miembros -->
        <div class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
          <div class="border-b border-black/[0.06] px-4 py-4 sm:px-6">
            <h2 class="text-sm font-semibold text-brand-green-900">Miembros</h2>
          </div>

          <div class="divide-y divide-black/[0.05]">
            <div
              v-for="m in memberships"
              :key="m._id"
              class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:gap-4 sm:px-6"
              :class="{ 'opacity-60': m.estado !== 'activo' }"
            >
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                :class="m.estado === 'activo' ? 'bg-brand-green-100 text-brand-green-600' : 'bg-stone-200 text-stone-500'"
              >
                {{ initials(m) }}
              </span>

              <div class="min-w-0 flex-1">
                <p class="flex items-center gap-2 truncate text-sm font-medium text-brand-green-900">
                  {{ m.user?.nombre || 'Sin nombre' }}
                  <span v-if="esUnoMismo(m)" class="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                    vos
                  </span>
                </p>
                <p class="truncate text-xs text-stone-400">{{ m.user?.email }}</p>
              </div>

              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="roleMeta(m.role).class">
                {{ roleMeta(m.role).label }}
              </span>

              <span
                v-if="m.estado !== 'activo'"
                class="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-500"
              >
                Sin acceso
              </span>

              <!-- Nadie edita su propio acceso: es la forma más fácil de quedarse afuera. -->
              <div v-if="!esUnoMismo(m)" class="flex items-center gap-1">
                <button
                  :disabled="busyId === m._id"
                  class="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
                  :title="m.role === 'tenant_admin' ? 'Pasar a empleado' : 'Pasar a administrador'"
                  @click="toggleRole(m)"
                >
                  <i class="icon-[material-symbols--swap-horiz] text-sm"></i> Cambiar rol
                </button>
                <button
                  :disabled="busyId === m._id"
                  class="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  :class="
                    m.estado === 'activo'
                      ? 'text-error-600 hover:bg-error-50'
                      : 'text-success-600 hover:bg-success-50'
                  "
                  @click="toggleEstado(m)"
                >
                  <i
                    :class="
                      m.estado === 'activo'
                        ? 'icon-[material-symbols--block]'
                        : 'icon-[material-symbols--check-circle-outline]'
                    "
                    class="text-sm"
                  ></i>
                  {{ m.estado === 'activo' ? 'Quitar acceso' : 'Reactivar' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Invitaciones pendientes -->
        <div v-if="invitations.length" class="rounded-2xl border border-black/[0.06] bg-white shadow-sm">
          <div class="border-b border-black/[0.06] px-4 py-4 sm:px-6">
            <h2 class="text-sm font-semibold text-brand-green-900">Invitaciones pendientes</h2>
            <p class="mt-0.5 text-xs text-stone-500">Todavía no aceptaron el email.</p>
          </div>

          <div class="divide-y divide-black/[0.05]">
            <div v-for="inv in invitations" :key="inv._id" class="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5 sm:gap-4 sm:px-6">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-50 text-warning-600">
                <i class="icon-[material-symbols--schedule] text-lg"></i>
              </span>

              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-brand-green-900">{{ inv.nombre || inv.email }}</p>
                <p class="truncate text-xs text-stone-400">
                  <template v-if="inv.nombre">{{ inv.email }} · </template>
                  Enviada el {{ fmtDate(inv.createdAt) }} · {{ diasParaVencer(inv.expiresAt) }}
                </p>
              </div>

              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="roleMeta(inv.role).class">
                {{ roleMeta(inv.role).label }}
              </span>

              <button
                :disabled="busyId === inv._id"
                class="flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-error-600 transition-colors hover:bg-error-50 disabled:opacity-50 cursor-pointer"
                @click="revoke(inv)"
              >
                <i class="icon-[material-symbols--close] text-sm"></i> Revocar
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <InviteMemberModal
      :visible="inviteOpen"
      :club-id="currentClubId"
      @close="inviteOpen = false"
      @invited="onInvited"
    />
  </div>
</template>
