import { readonly, ref, watch } from 'vue'
import userNotificationService from '@/services/userNotificationService'
import { useAuth } from '@/composables/useAuth'

// Estado compartido: la campanita del header y la vista de notificaciones tienen
// que mostrar el mismo contador, y marcar una como leída desde la vista debe
// bajar el número del header sin recargar.
const notifications = ref([])
const unreadCount = ref(0)
const isLoading = ref(false)

const { isAuthenticated } = useAuth()

const reset = () => {
  notifications.value = []
  unreadCount.value = 0
}

watch(isAuthenticated, (auth) => {
  if (!auth) reset()
})

const fetch = async () => {
  if (!isAuthenticated.value) return

  isLoading.value = true
  try {
    const data = await userNotificationService.getNotifications()
    notifications.value = data.notifications
    unreadCount.value = data.unreadCount
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

const markRead = async (id) => {
  const target = notifications.value.find((n) => n._id === id)
  if (!target || target.leida) return

  notifications.value = notifications.value.map((n) =>
    n._id === id ? { ...n, leida: true } : n,
  )
  unreadCount.value = Math.max(0, unreadCount.value - 1)

  try {
    await userNotificationService.markRead(id)
  } catch (error) {
    console.error(error)
    // El servidor manda: si falló, se vuelve a lo que él dice en vez de dejar
    // el contador inventado.
    await fetch()
  }
}

const markAllRead = async () => {
  if (unreadCount.value === 0) return

  const previas = notifications.value
  notifications.value = notifications.value.map((n) => ({ ...n, leida: true }))
  unreadCount.value = 0

  try {
    await userNotificationService.markAllRead()
  } catch (error) {
    console.error(error)
    notifications.value = previas
    await fetch()
  }
}

export const useUserNotifications = () => ({
  notifications: readonly(notifications),
  unreadCount: readonly(unreadCount),
  isLoading: readonly(isLoading),
  fetch,
  markRead,
  markAllRead,
})
