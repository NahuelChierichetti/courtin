<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuth } from '@/composables/useAuth'
import notificationService from '@/services/notificationService'
import { dayjs } from '@/utils/datetime'

const { currentClubId } = useAuth()
const toast = useToast()

const notifications = ref([])
const unreadCount = ref(0)
const loading = ref(false)

const TIPO_META = {
  reserva: { icon: 'icon-[material-symbols--event-available]', color: 'text-brand-purple-500 bg-brand-purple-50' },
  cancelacion: { icon: 'icon-[material-symbols--cancel]', color: 'text-brand-green-500 bg-brand-green-50' },
  cliente: { icon: 'icon-[material-symbols--person-add]', color: 'text-brand-purple-500 bg-brand-purple-50' },
  pago: { icon: 'icon-[material-symbols--payments]', color: 'text-success-500 bg-success-50' },
  sistema: { icon: 'icon-[material-symbols--info]', color: 'text-stone-500 bg-stone-100' },
}
const meta = (t) => TIPO_META[t] || TIPO_META.sistema

const hace = (f) => {
  const mins = dayjs().diff(dayjs(f), 'minute')
  if (mins < 1) return 'recién'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 24) return `hace ${h} h`
  return dayjs(f).format('DD MMM')
}

const fetch = async () => {
  if (!currentClubId.value) {
    notifications.value = []
    return
  }
  loading.value = true
  try {
    const data = await notificationService.getNotifications(currentClubId.value)
    notifications.value = data.notifications
    unreadCount.value = data.unreadCount
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(fetch)
watch(currentClubId, fetch)

const markRead = async (n) => {
  if (n.leida) return
  n.leida = true
  unreadCount.value = Math.max(0, unreadCount.value - 1)
  try {
    await notificationService.markRead(currentClubId.value, n._id)
  } catch (err) {
    console.error(err)
  }
}

const markAll = async () => {
  try {
    await notificationService.markAllRead(currentClubId.value)
    notifications.value.forEach((n) => (n.leida = true))
    unreadCount.value = 0
    toast.add({ severity: 'success', summary: 'Listo', detail: 'Notificaciones marcadas como leídas.', life: 2500 })
  } catch (err) {
    console.error(err)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-ink-500">Notificaciones</h1>
        <p class="mt-1 text-sm text-stone-500">
          {{ unreadCount ? `${unreadCount} sin leer` : 'Todo al día' }}
        </p>
      </div>
      <button
        v-if="unreadCount"
        class="flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-sm font-semibold text-stone-600 shadow-sm transition-colors hover:bg-stone-50 cursor-pointer"
        @click="markAll"
      >
        <i class="icon-[material-symbols--done-all] text-base text-brand-green-500"></i> Marcar todas como leídas
      </button>
    </div>

    <div v-if="!currentClubId" class="flex flex-col items-center justify-center py-24 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
        <i class="icon-[material-symbols--apartment] text-2xl text-stone-400"></i>
      </div>
      <h3 class="mt-4 text-lg font-semibold text-ink-500">Sin club seleccionado</h3>
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
      <div v-if="loading" class="flex items-center justify-center py-16"><i class="icon-[material-symbols--progress-activity] animate-spin text-2xl text-stone-300"></i></div>

      <div v-else-if="!notifications.length" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
          <i class="icon-[material-symbols--notifications] text-xl text-stone-400"></i>
        </div>
        <h3 class="mt-4 text-sm font-semibold text-ink-500">Sin notificaciones</h3>
        <p class="mt-1 text-xs text-stone-500">Acá vas a ver reservas, cancelaciones y nuevos clientes.</p>
      </div>

      <div v-else class="divide-y divide-black/[0.05]">
        <button
          v-for="n in notifications"
          :key="n._id"
          class="flex w-full items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-stone-50 cursor-pointer"
          :class="{ 'bg-brand-green-50/40': !n.leida }"
          @click="markRead(n)"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="meta(n.tipo).color">
            <i :class="meta(n.tipo).icon" class="text-base"></i>
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-ink-500">{{ n.titulo }}</p>
              <span v-if="!n.leida" class="h-2 w-2 shrink-0 rounded-full bg-brand-green-500"></span>
            </div>
            <p class="mt-0.5 text-sm text-stone-500">{{ n.mensaje }}</p>
          </div>
          <span class="shrink-0 text-xs text-stone-400">{{ hace(n.createdAt) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
