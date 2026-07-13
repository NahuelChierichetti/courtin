<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50 flex justify-end" @click="handleOverlayClick">
        <div class="absolute inset-0 bg-black/30 transition-opacity" />

        <div class="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
          <!-- Header -->
          <div class="flex items-center gap-4 border-b border-black/[0.06] px-6 py-5">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primitive-orange-500 text-sm font-bold text-white">
              {{ initials }}
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="truncate text-lg font-semibold text-primitive-dark-500">{{ client?.nombre || 'Cliente' }}</h2>
              <p class="truncate text-sm text-neutral-400">{{ client?.email }}</p>
            </div>
            <button class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer" @click="emit('close')">
              <i class="icon-[material-symbols--close] text-sm"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <!-- Stats -->
            <div class="grid grid-cols-2 gap-3">
              <div class="rounded-2xl border border-black/[0.06] p-4">
                <p class="text-xs text-neutral-400">Reservas</p>
                <p class="mt-1 text-xl font-bold font-secondary text-primitive-dark-500">{{ client?.reservasCount ?? 0 }}</p>
              </div>
              <div class="rounded-2xl border border-black/[0.06] p-4">
                <p class="text-xs text-neutral-400">Total gastado</p>
                <p class="mt-1 text-xl font-bold font-secondary text-success-600">{{ money(client?.totalGastado || 0) }}</p>
              </div>
            </div>

            <!-- Contacto -->
            <div>
              <p class="mb-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Contacto</p>
              <div class="space-y-2 rounded-2xl border border-black/[0.06] p-4 text-sm">
                <p class="flex items-center gap-2 text-slate-600">
                  <i class="icon-[material-symbols--mail-outline] text-slate-400"></i>{{ client?.email }}
                </p>
                <p v-if="client?.telefono" class="flex items-center gap-2 text-slate-600">
                  <i class="icon-[material-symbols--call] text-slate-400"></i>{{ client.telefono }}
                </p>
                <p class="flex items-center gap-2 text-slate-500">
                  <i class="icon-[material-symbols--calendar-month] text-slate-400"></i>
                  Cliente desde {{ fmtDate(client?.primeraReserva) }}
                  <span v-if="client?.user" class="ml-1 inline-flex items-center gap-1 rounded-full bg-primitive-blue-50 px-2 py-0.5 text-[10px] font-semibold text-primitive-blue-600">
                    <i class="icon-[material-symbols--verified] text-[10px]"></i> Con cuenta
                  </span>
                </p>
              </div>
            </div>

            <!-- Notas -->
            <div>
              <p class="mb-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Notas</p>
              <textarea
                v-model="notas"
                rows="2"
                placeholder="Notas internas del cliente (preferencias, observaciones...)"
                class="w-full rounded-xl border border-black/[0.08] px-3 py-2.5 text-sm text-primitive-dark-500 outline-none transition-colors placeholder:text-neutral-400 focus:border-primitive-orange-400 focus:ring-2 focus:ring-primitive-orange-100"
              ></textarea>
              <button
                v-if="notas !== (client?.notas || '')"
                class="mt-2 rounded-full bg-primitive-orange-500 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primitive-orange-600 disabled:opacity-60 cursor-pointer"
                :disabled="savingNotas"
                @click="saveNotas"
              >
                {{ savingNotas ? 'Guardando...' : 'Guardar notas' }}
              </button>
            </div>

            <!-- Reservas -->
            <div>
              <p class="mb-2 text-xs font-semibold tracking-wider text-neutral-400 uppercase">Historial de reservas</p>
              <div v-if="loading" class="flex items-center justify-center py-8">
                <i class="icon-[material-symbols--progress-activity] animate-spin text-xl text-slate-300"></i>
              </div>
              <div v-else-if="!reservations.length" class="rounded-2xl bg-slate-50 py-6 text-center text-sm text-slate-400">
                Sin reservas registradas.
              </div>
              <div v-else class="space-y-2">
                <div v-for="r in reservations" :key="r._id" class="flex items-center gap-3 rounded-xl border border-black/[0.06] px-3 py-2.5">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="sportMeta(r.court?.tipo).bg">
                    <span class="h-2 w-2 rounded-full" :class="sportMeta(r.court?.tipo).dot"></span>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-primitive-dark-500">{{ r.court?.nombre || 'Cancha' }}</p>
                    <p class="text-xs text-neutral-400">{{ fmtDateTime(r.inicio) }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-semibold font-secondary text-slate-700">{{ money(r.precioFinal || 0) }}</p>
                    <span class="inline-flex items-center gap-1 text-[11px]" :class="estadoMeta(r.estado).text">
                      <span class="h-1.5 w-1.5 rounded-full" :class="estadoMeta(r.estado).dot"></span>{{ estadoMeta(r.estado).label }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import clientService from '@/services/clientService'
import { dayjs, formatCurrency, formatInTz, DEFAULT_TZ } from '@/utils/datetime'
import { sportMeta, ESTADO_META } from '@/utils/turnos'

const props = defineProps({
  visible: Boolean,
  clientId: String,
  initialClient: Object,
})
const emit = defineEmits(['close', 'updated'])

const { currentClubId, currentClub } = useAuth()
const toast = useToast()

const tz = computed(() => currentClub.value?.timezone || DEFAULT_TZ)
const moneda = computed(() => currentClub.value?.moneda || 'ARS')

const client = ref(null)
const reservations = ref([])
const loading = ref(false)
const notas = ref('')
const savingNotas = ref(false)

const initials = computed(() => {
  const n = client.value?.nombre || client.value?.email || '?'
  return n.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
})

const money = (n) => formatCurrency(n, moneda.value)
const fmtDate = (d) => (d ? formatInTz(d, tz.value, 'DD MMM YYYY') : '—')
const fmtDateTime = (d) => (d ? formatInTz(d, tz.value, 'ddd DD MMM · HH:mm') : '—')
const estadoMeta = (e) => ESTADO_META[e] || ESTADO_META.pendiente

const fetchDetail = async () => {
  if (!props.clientId || !currentClubId.value) return
  loading.value = true
  try {
    const data = await clientService.getClient(currentClubId.value, props.clientId)
    client.value = data.client
    reservations.value = data.reservations
    notas.value = data.client.notas || ''
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      client.value = props.initialClient || null
      notas.value = props.initialClient?.notas || ''
      reservations.value = []
      fetchDetail()
    }
  },
)

const saveNotas = async () => {
  savingNotas.value = true
  try {
    const updated = await clientService.updateClient(currentClubId.value, props.clientId, { notas: notas.value })
    client.value = { ...client.value, notas: updated.notas }
    emit('updated', updated)
    toast.add({ severity: 'success', summary: 'Notas guardadas', life: 2500 })
  } catch (err) {
    console.error(err)
    toast.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron guardar las notas.', life: 4000 })
  } finally {
    savingNotas.value = false
  }
}

const handleOverlayClick = (e) => {
  if (e.target === e.currentTarget) emit('close')
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
