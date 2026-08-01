import api from '@/services/api'

const subscriptionService = {
  // Catálogo de planes. Público: son los precios de lista.
  async getPlanes() {
    const { data } = await api.get('/subscriptions/planes')
    return data
  },

  // Suscripción del complejo: estado, mora, uso y facturas.
  async getByClub(clubId) {
    const { data } = await api.get(`/subscriptions/club/${clubId}`, {
      headers: { 'x-club-id': clubId },
    })
    return data
  },

  // --- Superadmin ---
  async list() {
    const { data } = await api.get('/subscriptions')
    return data.suscripciones
  },

  async update(clubId, payload) {
    const { data } = await api.put(`/subscriptions/club/${clubId}`, payload)
    return data.suscripcion
  },

  async emitirFactura(clubId, periodo) {
    const { data } = await api.post(`/subscriptions/club/${clubId}/invoices`, { periodo })
    return data.factura
  },

  // Registra un pago hecho por fuera de la plataforma (transferencia, efectivo).
  async pagarManual(invoiceId, notas) {
    const { data } = await api.post(`/subscriptions/invoices/${invoiceId}/pay`, { notas })
    return data
  },
}

export default subscriptionService
