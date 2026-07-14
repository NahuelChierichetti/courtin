import api from './api'

const uploadService = {
  // Sube una imagen y devuelve la URL (Cloudinary).
  async uploadImage(clubId, file) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('clubId', clubId)
    const { data } = await api.post('/uploads', fd, {
      headers: { 'x-club-id': clubId, 'Content-Type': 'multipart/form-data' },
    })
    return data.url
  },
}

export default uploadService
