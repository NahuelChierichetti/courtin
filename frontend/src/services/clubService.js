import api from './api'

const clubService = {
  async getClubs() {
    const { data } = await api.get('/clubs')
    return data.clubs
  },
}

export default clubService
