import api from '@/services/api'

const invitationService = {
  // --- Invitado (público, la identidad la prueba el token del email) ---
  async get(token) {
    const { data } = await api.get(`/invitations/${token}`)
    return data
  },

  // Crea o vincula la cuenta y deja la sesión iniciada.
  async accept(token, payload) {
    const { data } = await api.post(`/invitations/${token}/accept`, payload)
    return data
  },

  // --- Complejo (requiere tenant_admin) ---
  async create({ clubId, email, role, nombre }) {
    const { data } = await api.post('/invitations', { clubId, email, role, nombre })
    return data
  },

  async listByClub(clubId) {
    const { data } = await api.get(`/invitations/club/${clubId}`)
    return data
  },

  // El clubId va en la ruta porque el backend lo necesita para autorizar.
  async revoke(clubId, id) {
    const { data } = await api.delete(`/invitations/club/${clubId}/${id}`)
    return data
  },
}

export default invitationService
