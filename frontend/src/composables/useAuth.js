import { computed, readonly, ref } from 'vue'
import authService from '@/services/authService'
import { clearToken, getToken, setToken } from '@/utils/authStorage'

const token = ref(getToken())
const user = ref(null)
const isLoading = ref(false)
const isInitialized = ref(false)

let initPromise = null

const setSession = (sessionToken, sessionUser) => {
  setToken(sessionToken)
  token.value = sessionToken
  user.value = sessionUser
}

const clearSession = () => {
  clearToken()
  token.value = null
  user.value = null
}

const initializeAuth = async () => {
  if (isInitialized.value) return

  if (!token.value) {
    isInitialized.value = true
    return
  }

  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    isLoading.value = true

    try {
      const data = await authService.getMe()
      user.value = data.user
    } catch (error) {
      clearSession()
    } finally {
      isLoading.value = false
      isInitialized.value = true
      initPromise = null
    }
  })()

  return initPromise
}

const login = async (credentials) => {
  isLoading.value = true

  try {
    const data = await authService.login(credentials)
    setSession(data.token, data.user)
    isInitialized.value = true
    return data
  } finally {
    isLoading.value = false
  }
}

const register = async (payload) => {
  isLoading.value = true

  try {
    const data = await authService.register(payload)
    setSession(data.token, data.user)
    isInitialized.value = true
    return data
  } finally {
    isLoading.value = false
  }
}

const logout = () => {
  clearSession()
  isInitialized.value = true
}

export const useAuth = () => ({
  user: readonly(user),
  token: readonly(token),
  isLoading: readonly(isLoading),
  isInitialized: readonly(isInitialized),
  isAuthenticated: computed(() => Boolean(token.value && user.value)),
  initializeAuth,
  login,
  register,
  logout,
})