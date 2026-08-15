import { computed, readonly, ref } from 'vue'
import authService from '@/services/authService'
import invitationService from '@/services/invitationService'
import { clearToken, getToken, setToken } from '@/utils/authStorage'

const CLUB_ID_KEY = 'courtin_active_club'

const token = ref(getToken())
const user = ref(null)
const memberships = ref([])
// Clubes disponibles para superadmin (no tienen membresías). AppLayout los
// carga vía clubService y los cachea acá para que `currentClub` pueda resolver
// timezone/moneda del club seleccionado en el header.
const superadminClubs = ref([])
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
  superadminClubs.value = []
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

// Solicitud de alta de complejo.
//
// A diferencia de `register`, NO deja la sesión iniciada: el backend no devuelve
// token porque el club queda pendiente de aprobación y todavía no hay panel al
// que entrar. La sesión se abre después, desde /panel/login, cuando llega el
// email de aprobación.
const registerClub = async (payload) => {
  isLoading.value = true

  try {
    return await authService.registerClub(payload)
  } finally {
    isLoading.value = false
  }
}

// Define la contraseña nueva desde el link del email y deja la sesión iniciada:
// quien llegó hasta acá ya probó que controla la casilla.
const resetPassword = async ({ token: resetToken, password }) => {
  isLoading.value = true

  try {
    const data = await authService.resetPassword({ token: resetToken, password })
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

// Acepta una invitación de staff: crea o vincula la cuenta, suma la membresía y
// deja la sesión iniciada con el complejo ya cargado.
const acceptInvitation = async (inviteToken, payload) => {
  isLoading.value = true

  try {
    const data = await invitationService.accept(inviteToken, payload)
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

// Recarga los datos del usuario en sesión. Se usa cuando algo cambió del lado
// del servidor (p. ej. el email quedó verificado) y hay que reflejarlo sin
// obligar a cerrar y volver a iniciar sesión.
const refreshUser = async () => {
  if (!token.value) return null

  const me = await authService.getMe()
  user.value = me.user
  if (me.memberships) memberships.value = me.memberships
  return me.user
}

// Guarda los datos personales y refleja el resultado del servidor en la sesión,
// para que el nombre del header cambie sin recargar.
const updateProfile = async (payload) => {
  isLoading.value = true

  try {
    const updated = await authService.updateMe(payload)
    user.value = { ...user.value, ...updated }
    return user.value
  } finally {
    isLoading.value = false
  }
}

const logout = () => {
  clearSession()
  isInitialized.value = true
}

const isSuperadmin = computed(() => user.value?.globalRole === 'superadmin')

// Staff del complejo: superadmin, o quien tenga una membresía de gestión
// (tenant_admin/employee). Un cliente/jugador no tiene ninguna de estas.
const CLUB_STAFF_ROLES = ['tenant_admin', 'employee']
const hasClubAccess = computed(
  () =>
    isSuperadmin.value ||
    memberships.value.some((m) => CLUB_STAFF_ROLES.includes(m.role)),
)

// Destino de aterrizaje según el rol del usuario logueado. Se usa tras
// login/registro y para resolver rutas guestOnly cuando ya hay sesión.
const resolveLanding = () => {
  if (isSuperadmin.value) return '/admin'
  if (hasClubAccess.value) return '/panel/dashboard'
  return '/mis-reservas'
}

const currentClub = computed(() => {
  if (!currentClubId.value) return null
  // Usuarios con membresías: resolver el club desde ahí.
  const m = memberships.value.find(
    (m) => (m.club._id || m.club) === currentClubId.value,
  )
  if (m?.club) return m.club
  // Superadmin (sin membresías): resolver desde la lista de clubes cacheada.
  return superadminClubs.value.find((c) => c._id === currentClubId.value) || null
})

const setCurrentClubId = (clubId) => {
  persistClubId(clubId)
}

// Cachea la lista completa de clubes del superadmin para que `currentClub`
// pueda resolver timezone/moneda del club elegido en el header.
const setSuperadminClubs = (clubs) => {
  superadminClubs.value = Array.isArray(clubs) ? clubs : []
}

// Actualiza los datos del club activo (timezone, moneda, etc.) en las membresías
// para que currentClub se refleje en toda la app sin re-loguear.
const patchCurrentClub = (clubData) => {
  if (!clubData?._id) return
  memberships.value = memberships.value.map((m) => {
    const cid = m.club?._id || m.club
    if (cid === clubData._id) {
      return { ...m, club: { ...(typeof m.club === 'object' ? m.club : {}), ...clubData } }
    }
    return m
  })
  superadminClubs.value = superadminClubs.value.map((c) =>
    c._id === clubData._id ? { ...c, ...clubData } : c,
  )
}

export const useAuth = () => ({
  user: readonly(user),
  token: readonly(token),
  memberships: readonly(memberships),
  superadminClubs: readonly(superadminClubs),
  currentClubId: readonly(currentClubId),
  currentClub,
  isSuperadmin,
  hasClubAccess,
  resolveLanding,
  isLoading: readonly(isLoading),
  isInitialized: readonly(isInitialized),
  isAuthenticated: computed(() => Boolean(token.value && user.value)),
  initializeAuth,
  login,
  register,
  registerClub,
  resetPassword,
  acceptInvitation,
  refreshUser,
  updateProfile,
  // Verificación blanda: no bloquea el uso, sólo alimenta el aviso del panel.
  isEmailVerified: computed(() => Boolean(user.value?.emailVerifiedAt)),
  logout,
  setCurrentClubId,
  setSuperadminClubs,
  patchCurrentClub,
})