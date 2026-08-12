import api from './api'

// Servicio de la interfaz pública (sin autenticación obligatoria).
const publicService = {
  // Descubrimiento de clubes publicados. Filtros opcionales: ciudad, tipo
  // (deporte), q (nombre del complejo) y disponibilidad por fecha
  // ("YYYY-MM-DD") + franja horaria: sólo clubes con un turno libre que empiece
  // entre `hora` y `horaHasta` (ambas "HH:MM"; sin `horaHasta`, de `hora` en
  // adelante).
  async searchClubs({ ciudad, tipo, q, fecha, hora, horaHasta } = {}) {
    const { data } = await api.get('/public/clubs', {
      params: { ciudad, tipo, q, fecha, hora, horaHasta },
    })
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

  // Disponibilidad de un slug (link público del complejo). excludeId evita que
  // el club choque con su propio slug al editar.
  async checkSlug(slug, excludeId) {
    const { data } = await api.get('/public/slug-available', { params: { slug, excludeId } })
    return data // { available, reason }
  },

  // Slots de una cancha para una fecha ("YYYY-MM-DD") y una duración (min).
  async getAvailability(slug, courtId, fecha, duracion) {
    const { data } = await api.get(`/public/clubs/${slug}/courts/${courtId}/availability`, {
      params: { fecha, duracion },
    })
    return data // { fecha, abierto, nombre, duracion, duracionTurno, slots }
  },

  // Disponibilidad de todas las canchas del club para una fecha (vista timeline).
  async getClubAvailability(slug, fecha) {
    const { data } = await api.get(`/public/clubs/${slug}/availability`, { params: { fecha } })
    return data // { fecha, courts: [{ court, abierto, nombre, slots }] }
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

  // Estado del cobro. Además de leer la base, el backend reconcilia contra
  // MercadoPago, así que sirve para sondear mientras llega el webhook.
  async getPaymentStatus(token) {
    const { data } = await api.get(`/public/reservations/${token}/pago`)
    return data.pago
  },

  // Nuevo link de pago tras un rechazo. Devuelve { initPoint, monto, ... }.
  async retryPayment(token) {
    const { data } = await api.post(`/public/reservations/${token}/retry-payment`)
    return data.pago
  },

  async cancelReservationByToken(token) {
    const { data } = await api.patch(`/reservations/manage/${token}/cancel`)
    return data.reservation
  },
}

export default publicService
