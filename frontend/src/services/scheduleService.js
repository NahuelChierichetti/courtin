import api from './api'

const scheduleService = {
  async getHorarios(clubId) {
    const { data } = await api.get(`/clubs/${clubId}/horarios`, {
      headers: { 'x-club-id': clubId },
    })
    return data.horarios
  },

  async updateHorarios(clubId, horarios) {
    const { data } = await api.put(`/clubs/${clubId}/horarios`, horarios, {
      headers: { 'x-club-id': clubId },
    })
    return data.horarios
  },
}

export default scheduleService
