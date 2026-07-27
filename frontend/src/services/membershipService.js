import api from '@/services/api'

const membershipService = {
  async listByClub(clubId) {
    const { data } = await api.get(`/memberships/club/${clubId}`)
    return data
  },

  // Cambia rol o estado de un miembro. El clubId va en la ruta porque el
  // backend lo necesita para autorizar y para acotar el alcance al complejo.
  async update(clubId, id, payload) {
    const { data } = await api.put(`/memberships/club/${clubId}/${id}`, payload)
    return data
  },
}

export default membershipService
