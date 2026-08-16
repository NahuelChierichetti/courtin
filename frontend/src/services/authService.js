import api from '@/services/api'

const authService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials)
    return data
  },

  // Acceso con Google. `credential` es el ID token que devuelve el botón; el
  // backend lo verifica contra Google y responde con nuestro propio token.
  // Sirve para entrar y para registrarse: `nuevo` dice cuál de las dos fue.
  async loginWithGoogle(credential) {
    const { data } = await api.post('/auth/google', { credential })
    return data
  },

  async register(payload) {
    const { data } = await api.post('/auth/register', payload)
    return data
  },

  // Alta de complejo: crea usuario dueño + club + membership tenant_admin.
  async registerClub(payload) {
    const { data } = await api.post('/auth/register-club', payload)
    return data
  },

  async getMe() {
    const { data } = await api.get('/auth/me')
    return data
  },

  // Datos personales de la cuenta en sesión. El email no se cambia por acá.
  async updateMe(payload) {
    const { data } = await api.patch('/auth/me', payload)
    return data.user
  },

  // Cambio de contraseña con la sesión abierta. Exige la contraseña actual.
  async changePassword({ currentPassword, password }) {
    const { data } = await api.put('/auth/me/password', { currentPassword, password })
    return data
  },

  // Pide el link de recuperación. Responde igual exista o no la cuenta.
  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  },

  // Valida el link antes de mostrar el formulario.
  async verifyResetToken(token) {
    const { data } = await api.get('/auth/reset-password', { params: { token } })
    return data
  },

  // Define la contraseña nueva. Devuelve token + user: deja la sesión iniciada.
  async resetPassword({ token, password }) {
    const { data } = await api.post('/auth/reset-password', { token, password })
    return data
  },

  // Confirma el email desde el link. Pública: puede abrirse sin sesión.
  async verifyEmail(token) {
    const { data } = await api.post('/auth/verify-email', { token })
    return data
  },

  // Reenvía el link a la casilla de la cuenta en sesión.
  async resendVerification() {
    const { data } = await api.post('/auth/resend-verification')
    return data
  },
}

export default authService