import api from './api'

// Notificaciones del jugador. Cuelgan de /me, no de /notifications (esa es la
// campanita del complejo, con permisos de staff).
const userNotificationService = {
  async getNotifications() {
    const { data } = await api.get('/me/notifications')
    return { notifications: data.notifications, unreadCount: data.unreadCount }
  },

  async markRead(id) {
    const { data } = await api.patch(`/me/notifications/${id}/read`)
    return data.notification
  },

  async markAllRead() {
    const { data } = await api.patch('/me/notifications/read-all')
    return data
  },
}

export default userNotificationService
