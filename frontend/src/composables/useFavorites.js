import { computed, readonly, ref, watch } from 'vue'
import favoriteService from '@/services/favoriteService'
import { useAuth } from '@/composables/useAuth'

// Estado compartido a nivel módulo, igual que `useAuth`: el corazón de una card
// del buscador y la vista /favoritos tienen que ver siempre lo mismo, y una sola
// llamada al servidor alcanza para las dos.
//
// La lista completa de clubes sirve a /favoritos; el Set de ids es lo que
// consultan los corazones. Por eso no hace falta un endpoint que marque
// `favorito` en el listado público: se resuelve en el cliente.
const clubs = ref([])
const ids = ref(new Set())
const isLoading = ref(false)
const isLoaded = ref(false)

let loadPromise = null

const { isAuthenticated } = useAuth()

const sync = (lista) => {
  clubs.value = lista
  ids.value = new Set(lista.map((c) => c._id))
}

const reset = () => {
  clubs.value = []
  ids.value = new Set()
  isLoaded.value = false
  loadPromise = null
}

// Al cerrar sesión los favoritos dejan de ser tuyos: si no se limpian, el
// próximo que entre en el mismo navegador ve corazones marcados que no son suyos.
watch(isAuthenticated, (auth) => {
  if (!auth) reset()
})

const load = async ({ force = false } = {}) => {
  if (!isAuthenticated.value) return clubs.value
  if (isLoaded.value && !force) return clubs.value
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    isLoading.value = true
    try {
      sync(await favoriteService.getFavorites())
      isLoaded.value = true
    } catch (error) {
      console.error(error)
    } finally {
      isLoading.value = false
      loadPromise = null
    }
    return clubs.value
  })()

  return loadPromise
}

const isFavorite = (clubId) => ids.value.has(clubId)

// Marca o desmarca. Actualiza el estado local primero para que el corazón
// responda al toque, y lo revierte si el servidor rechaza.
const toggle = async (club) => {
  const clubId = typeof club === 'string' ? club : club?._id
  if (!clubId) return null

  const eraFavorito = ids.value.has(clubId)
  const proximos = new Set(ids.value)
  const clubsPrevios = clubs.value

  if (eraFavorito) {
    proximos.delete(clubId)
    clubs.value = clubs.value.filter((c) => c._id !== clubId)
  } else {
    proximos.add(clubId)
    // Sólo se agrega a la lista si vino el objeto completo; desde una card del
    // buscador viene, desde un id suelto no. En ese caso la vista /favoritos lo
    // trae en su próxima carga.
    if (typeof club === 'object') clubs.value = [club, ...clubs.value]
  }
  ids.value = proximos

  try {
    if (eraFavorito) await favoriteService.removeFavorite(clubId)
    else await favoriteService.addFavorite(clubId)
    return !eraFavorito
  } catch (error) {
    const revertidos = new Set(ids.value)
    if (eraFavorito) revertidos.add(clubId)
    else revertidos.delete(clubId)
    ids.value = revertidos
    clubs.value = clubsPrevios
    throw error
  }
}

export const useFavorites = () => ({
  clubs: readonly(clubs),
  count: computed(() => clubs.value.length),
  isLoading: readonly(isLoading),
  isLoaded: readonly(isLoaded),
  load,
  isFavorite,
  toggle,
})
