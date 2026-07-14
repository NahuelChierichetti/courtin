import api from './api'

const notificationService = {
  async getNotifications(clubId) {
    const { data } = await api.get('/notifications', {
      params: { clubId },
      headers: { 'x-club-id': clubId },
    })
    return data // { notifications, unreadCount }
  },

  async markRead(clubId, id) {
    const { data } = await api.patch(`/notifications/${id}/read`, { clubId }, { headers: { 'x-club-id': clubId } })
    return data
  },

  async markAllRead(clubId) {
    const { data } = await api.patch('/notifications/read-all', { clubId }, { headers: { 'x-club-id': clubId } })
    return data
  },
}

export default notificationService
