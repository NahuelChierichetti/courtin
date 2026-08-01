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

  // URL de autorización de MercadoPago. El redirect lo hace el navegador: el
  // complejo tiene que loguearse en MercadoPago y aceptar el permiso.
  async getMpConnectUrl(clubId) {
    const { data } = await api.get(`/clubs/${clubId}/pagos/mp/connect-url`, {
      headers: { 'x-club-id': clubId },
    })
    return data.url
  },

  async disconnectMp(clubId) {
    const { data } = await api.delete(`/clubs/${clubId}/pagos/mp`, {
      headers: { 'x-club-id': clubId },
    })
    return data.club
  },
}

export default clubService
