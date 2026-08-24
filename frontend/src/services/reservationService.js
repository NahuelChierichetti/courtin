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

  // Lo que queda del día de hoy en el club: los turnos de la fecha actual que
  // todavía no terminaron (en curso o por comenzar), ordenados por inicio y
  // acotados a `limit`. Devuelve el sobre completo porque la tarjeta del
  // dashboard necesita los contadores: `restantes` (cuántos quedan, aunque no
  // entren en la lista) y `total` (cuántos hubo hoy).
  async getUpcomingReservations(clubId, { limit = 6 } = {}) {
    const { data } = await api.get(`/reservations/club/${clubId}/upcoming`, {
      params: { limit },
      headers: { 'x-club-id': clubId },
    })
    return {
      reservations: data.reservations || [],
      restantes: data.restantes ?? (data.reservations?.length || 0),
      total: data.total ?? 0,
      fecha: data.fecha || null,
    }
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

  // Devuelve el pago de una reserva por MercadoPago. Sólo tenant_admin.
  async refundReservation(clubId, id) {
    const { data } = await api.post(
      `/reservations/club/${clubId}/${id}/refund`,
      {},
      { headers: { 'x-club-id': clubId } },
    )
    return data.reservation
  },

  // Reservas del cliente logueado (las que hizo con su cuenta). Scope por token,
  // sin clubId. Alimenta la vista "Mis reservas" del sitio del cliente.
  async getMyReservations() {
    const { data } = await api.get('/reservations/my')
    return data.reservations
  },

  // Cancela una reserva propia desde la cuenta. El backend valida la tolerancia
  // de cancelación del complejo y avisa al club.
  async cancelMyReservation(id) {
    const { data } = await api.patch(`/reservations/my/${id}/cancel`)
    return data.reservation
  },
}

export default reservationService
