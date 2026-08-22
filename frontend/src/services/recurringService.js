import api from './api'

// Turnos fijos: la REGLA que se repite todas las semanas.
//
// Las ocurrencias son reservas normales y se gestionan con `reservationService`
// — cancelar un día suelto es una cancelación de reserva de toda la vida, no
// pasa por acá. Ver docs/turnos-fijos.md.
const recurringService = {
  async getRecurring(clubId, { estado } = {}) {
    const { data } = await api.get(`/recurring/club/${clubId}`, {
      params: { estado },
      headers: { 'x-club-id': clubId },
    })
    return data.recurring
  },

  // Las fechas que se generarían, con su estado (libre / ocupado / cerrado),
  // sin escribir nada. El complejo tiene que poder mirar y arrepentirse.
  async preview(clubId, payload) {
    const { data } = await api.post(`/recurring/club/${clubId}/preview`, payload, {
      headers: { 'x-club-id': clubId },
    })
    return data
  },

  // Crea la regla y materializa el horizonte en el acto: los turnos aparecen
  // en el timeline sin esperar al cron de la madrugada.
  async createRecurring(clubId, payload) {
    const { data } = await api.post(`/recurring/club/${clubId}`, payload, {
      headers: { 'x-club-id': clubId },
    })
    return data
  },

  async updateRecurring(clubId, id, payload) {
    const { data } = await api.patch(`/recurring/club/${clubId}/${id}`, payload, {
      headers: { 'x-club-id': clubId },
    })
    return data
  },

  // Da de baja el turno fijo y libera los turnos futuros. Es la única forma de
  // que un turno fijo deje de existir. Sólo el dueño del complejo.
  async cancelRecurring(clubId, id) {
    const { data } = await api.delete(`/recurring/club/${clubId}/${id}`, {
      headers: { 'x-club-id': clubId },
    })
    return data
  },
}

export default recurringService
