import api from './api'

// Analytics del complejo (dashboard + reportes) con datos reales.
const statsService = {
  async getDashboard(clubId, period = 'hoy') {
    const { data } = await api.get('/stats/dashboard', {
      params: { clubId, period },
      headers: { 'x-club-id': clubId },
    })
    return data
  },

  async getReports(clubId, params = {}) {
    const { data } = await api.get('/stats/reports', {
      params: { clubId, ...params },
      headers: { 'x-club-id': clubId },
    })
    return data
  },
}

export default statsService
