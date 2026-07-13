import api from './api'

// Servicio de clientes del complejo (CRM liviano, dedup por email).
const clientService = {
  async getClients(clubId, params = {}) {
    const { data } = await api.get('/clients', {
      params: { clubId, ...params },
      headers: { 'x-club-id': clubId },
    })
    return data // { clients, resumen }
  },

  async getClient(clubId, id) {
    const { data } = await api.get(`/clients/${id}`, { headers: { 'x-club-id': clubId } })
    return data // { client, reservations }
  },

  async updateClient(clubId, id, payload) {
    const { data } = await api.patch(`/clients/${id}`, { ...payload, clubId }, { headers: { 'x-club-id': clubId } })
    return data.client
  },
}

export default clientService
