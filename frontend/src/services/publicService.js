import api from './api'

// Servicio de la interfaz pública (sin autenticación obligatoria).
const publicService = {
  // Descubrimiento de clubes publicados. Filtros opcionales: ciudad, tipo
  // (deporte) y q (texto libre).
  async searchClubs({ ciudad, tipo, q } = {}) {
    const { data } = await api.get('/public/clubs', { params: { ciudad, tipo, q } })
    return data.clubs
  },

  async getClub(slug) {
    const { data } = await api.get(`/public/clubs/${slug}`)
    return { club: data.club, courts: data.courts }
  },

  // Ciudades con clubes publicados (para el filtro del buscador).
  async getCities() {
    const { data } = await api.get('/public/cities')
    return data.cities
  },

  // Slots de una cancha para una fecha ("YYYY-MM-DD") y una duración (min).
  async getAvailability(slug, courtId, fecha, duracion) {
    const { data } = await api.get(`/public/clubs/${slug}/courts/${courtId}/availability`, {
      params: { fecha, duracion },
    })
    return data // { fecha, abierto, nombre, duracion, duracionTurno, slots }
  },

  // Reserva como invitado. Devuelve { manageToken, reservation }.
  async createReservation(slug, payload) {
    const { data } = await api.post(`/public/clubs/${slug}/reservations`, payload)
    return data
  },

  // Gestión por token (sin cuenta).
  async getReservationByToken(token) {
    const { data } = await api.get(`/reservations/manage/${token}`)
    return data.reservation
  },

  async cancelReservationByToken(token) {
    const { data } = await api.patch(`/reservations/manage/${token}/cancel`)
    return data.reservation
  },
}

export default publicService
