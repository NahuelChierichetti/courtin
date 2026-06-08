import { computed, readonly, ref } from 'vue'
import authService from '@/services/authService'
import { clearToken, getToken, setToken } from '@/utils/authStorage'

const CLUB_ID_KEY = 'courtin_active_club'

const token = ref(getToken())
const user = ref(null)
const memberships = ref([])
const currentClubId = ref(localStorage.getItem(CLUB_ID_KEY))
const isLoading = ref(false)
const isInitialized = ref(false)

let initPromise = null

const persistClubId = (clubId) => {
  currentClubId.value = clubId
  if (clubId) {
    localStorage.setItem(CLUB_ID_KEY, clubId)
  } else {
    localStorage.removeItem(CLUB_ID_KEY)
  }
}

const setSession = (sessionToken, sessionUser, sessionMemberships) => {
  setToken(sessionToken)
  token.value = sessionToken
  user.value = sessionUser
  if (sessionMemberships) {
    memberships.value = sessionMemberships
    if (sessionMemberships.length > 0 && !currentClubId.value) {
      persistClubId(sessionMemberships[0].club._id || sessionMemberships[0].club)
    }
  }
}

const clearSession = () => {
  clearToken()
  localStorage.removeItem(CLUB_ID_KEY)
  token.value = null
  user.value = null
  memberships.value = []
  currentClubId.value = null
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
      if (data.memberships) {
        memberships.value = data.memberships
        if (data.memberships.length > 0 && !currentClubId.value) {
          persistClubId(data.memberships[0].club._id || data.memberships[0].club)
        }
      }
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
    setToken(data.token)
    token.value = data.token

    const me = await authService.getMe()
    setSession(data.token, me.user, me.memberships)
    isInitialized.value = true

    return {
      ...data,
      user: me.user,
      memberships: me.memberships,
    }
  } finally {
    isLoading.value = false
  }
}

const register = async (payload) => {
  isLoading.value = true

  try {
    const data = await authService.register(payload)
    setToken(data.token)
    token.value = data.token

    const me = await authService.getMe()
    setSession(data.token, me.user, me.memberships)
    isInitialized.value = true

    return {
      ...data,
      user: me.user,
      memberships: me.memberships,
    }
  } finally {
    isLoading.value = false
  }
}

const logout = () => {
  clearSession()
  isInitialized.value = true
}

const isSuperadmin = computed(() => user.value?.globalRole === 'superadmin')

const currentClub = computed(() => {
  if (!currentClubId.value || memberships.value.length === 0) return null
  const m = memberships.value.find(
    (m) => (m.club._id || m.club) === currentClubId.value,
  )
  return m?.club || null
})

const setCurrentClubId = (clubId) => {
  persistClubId(clubId)
}

export const useAuth = () => ({
  user: readonly(user),
  token: readonly(token),
  memberships: readonly(memberships),
  currentClubId: readonly(currentClubId),
  currentClub,
  isSuperadmin,
  isLoading: readonly(isLoading),
  isInitialized: readonly(isInitialized),
  isAuthenticated: computed(() => Boolean(token.value && user.value)),
  initializeAuth,
  login,
  register,
  logout,
  setCurrentClubId,
})