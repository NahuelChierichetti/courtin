import axios from 'axios'
import { clearToken, getToken } from '@/utils/authStorage'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const requestUrl = error.config?.url || ''
    const isAuthRequest =
      requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register')
    const pathname = window.location.pathname
    const AUTH_PAGES = ['/login', '/registro', '/panel/login', '/panel/registro']
    const isAuthPage = AUTH_PAGES.includes(pathname)

    if (status === 401 && !isAuthRequest) {
      clearToken()

      if (!isAuthPage) {
        // El backoffice manda a su propio login; el sitio del cliente al suyo.
        const loginPath = pathname.startsWith('/panel') ? '/panel/login' : '/login'
        const redirect = `${pathname}${window.location.search}`
        window.location.href = `${loginPath}?redirect=${encodeURIComponent(redirect)}`
      }
    }

    return Promise.reject(error)
  },
)

export default api