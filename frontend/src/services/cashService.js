import api from './api'

// Servicio de caja (movimientos de ingreso/egreso del complejo).
const cashService = {
  // Lista movimientos + resumen agregado. params: { desde, hasta, tipo, categoria, metodo }.
  async getMovements(clubId, params = {}) {
    const { data } = await api.get('/cash', {
      params: { clubId, ...params },
      headers: { 'x-club-id': clubId },
    })
    return data // { movimientos, resumen }
  },

  async createMovement(clubId, payload) {
    const { data } = await api.post('/cash', { ...payload, clubId }, { headers: { 'x-club-id': clubId } })
    return data.movimiento
  },

  async updateMovement(clubId, id, payload) {
    const { data } = await api.patch(`/cash/${id}`, { ...payload, clubId }, { headers: { 'x-club-id': clubId } })
    return data.movimiento
  },

  async deleteMovement(clubId, id) {
    const { data } = await api.delete(`/cash/${id}`, { headers: { 'x-club-id': clubId } })
    return data
  },
}

export default cashService
