import api from './api'

const adminService = {
  async getClubs(params = {}) {
    const { data } = await api.get('/admin/clubs', { params })
    return data
  },

  async getClubById(id) {
    const { data } = await api.get(`/admin/clubs/${id}`)
    return data
  },

  async createClub(clubData) {
    const { data } = await api.post('/admin/clubs', clubData)
    return data
  },

  async updateClub(id, clubData) {
    const { data } = await api.put(`/admin/clubs/${id}`, clubData)
    return data
  },

  async suspendClub(id) {
    const { data } = await api.patch(`/admin/clubs/${id}/suspend`)
    return data
  },

  async getUsers(params = {}) {
    const { data } = await api.get('/admin/users', { params })
    return data
  },

  async createUser(userData) {
    const { data } = await api.post('/admin/users', userData)
    return data
  },

  async updateUser(id, userData) {
    const { data } = await api.put(`/admin/users/${id}`, userData)
    return data
  },

  async assignUserToClub(userId, clubId, role) {
    const { data } = await api.post(`/admin/users/${userId}/assign`, { clubId, role })
    return data
  },

  async removeUserFromClub(membershipId) {
    const { data } = await api.patch(`/admin/users/memberships/${membershipId}/remove`)
    return data
  },
}

export default adminService
