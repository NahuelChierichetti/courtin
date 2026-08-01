import api from './api'

const courtService = {
  // Devuelve { courts, cupo }. `cupo` trae el límite de canchas del plan, para
  // poder deshabilitar el alta antes de intentarla.
  async getCourts(clubId) {
    const { data } = await api.get('/courts', {
      params: { clubId },
      headers: { 'x-club-id': clubId },
    })
    return { courts: data.courts, cupo: data.cupo || null }
  },

  async getCourtById(id, clubId) {
    const { data } = await api.get(`/courts/${id}`, {
      headers: { 'x-club-id': clubId },
    })
    return data.court
  },

  async createCourt(courtData, clubId) {
    const { data } = await api.post(
      '/courts',
      { ...courtData, clubId },
      { headers: { 'x-club-id': clubId } },
    )
    return data.court
  },

  async updateCourt(id, courtData, clubId) {
    const { data } = await api.put(
      `/courts/${id}`,
      { ...courtData, clubId },
      { headers: { 'x-club-id': clubId } },
    )
    return data.court
  },

  async deleteCourt(id, clubId) {
    const { data } = await api.delete(`/courts/${id}`, {
      headers: { 'x-club-id': clubId },
    })
    return data.court
  },
}

export default courtService
