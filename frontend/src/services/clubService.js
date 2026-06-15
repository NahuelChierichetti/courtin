import api from './api'

const clubService = {
  async getClubs() {
    const { data } = await api.get('/clubs')
    return data.clubs
  },

  async getConfig(clubId) {
    const { data } = await api.get(`/clubs/${clubId}/config`, {
      headers: { 'x-club-id': clubId },
    })
    return data.club
  },

  async updateConfig(clubId, config) {
    const { data } = await api.put(`/clubs/${clubId}/config`, config, {
      headers: { 'x-club-id': clubId },
    })
    return data.club
  },
}

export default clubService
