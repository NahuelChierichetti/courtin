import api from '@/services/api'

const authService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials)
    return data
  },

  async register(payload) {
    const { data } = await api.post('/auth/register', payload)
    return data
  },

  // Alta de complejo: crea usuario dueño + club + membership tenant_admin.
  async registerClub(payload) {
    const { data } = await api.post('/auth/register-club', payload)
    return data
  },

  async getMe() {
    const { data } = await api.get('/auth/me')
    return data
  },
}

export default authService