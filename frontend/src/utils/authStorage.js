const AUTH_TOKEN_KEY = 'courtin_token'

const getToken = () => localStorage.getItem(AUTH_TOKEN_KEY)

const setToken = (token) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

const clearToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export { AUTH_TOKEN_KEY, getToken, setToken, clearToken }