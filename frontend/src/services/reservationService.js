import api from './api'

const reservationService = {
  // Lista las reservas de un club dentro de un rango de instantes UTC
  // [desde, hasta) (ISO). Opcionalmente filtra por cancha y estado.
  async getReservations(clubId, { desde, hasta, courtId, estado } = {}) {
    const { data } = await api.get(`/reservations/club/${clubId}`, {
      params: { desde, hasta, courtId, estado },
      headers: { 'x-club-id': clubId },
    })
    return data.reservations
  },

  // Próximos turnos del club a partir de ahora (en curso o por comenzar).
  // El backend acota el resultado a `limit` (por defecto 6) ordenado por inicio.
  async getUpcomingReservations(clubId, { limit = 6 } = {}) {
    const { data } = await api.get(`/reservations/club/${clubId}/upcoming`, {
      params: { limit },
      headers: { 'x-club-id': clubId },
    })
    return data.reservations
  },

  async createReservation(clubId, payload) {
    const { data } = await api.post(`/reservations/club/${clubId}`, payload, {
      headers: { 'x-club-id': clubId },
    })
    return data.reservation
  },

  async updateReservation(clubId, id, payload) {
    const { data } = await api.put(`/reservations/club/${clubId}/${id}`, payload, {
      headers: { 'x-club-id': clubId },
    })
    return data.reservation
  },

  async cancelReservation(clubId, id) {
    const { data } = await api.patch(
      `/reservations/club/${clubId}/${id}/cancel`,
      {},
      { headers: { 'x-club-id': clubId } },
    )
    return data.reservation
  },
}

export default reservationService
