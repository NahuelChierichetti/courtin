import api from './api'

const favoriteService = {
  // Complejos guardados por el jugador, el último primero.
  async getFavorites() {
    const { data } = await api.get('/favorites')
    return data.clubs
  },

  async addFavorite(clubId) {
    const { data } = await api.post(`/favorites/${clubId}`)
    return data
  },

  async removeFavorite(clubId) {
    const { data } = await api.delete(`/favorites/${clubId}`)
    return data
  },
}

export default favoriteService
