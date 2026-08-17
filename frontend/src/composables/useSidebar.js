import { computed, ref, watch, onMounted, onUnmounted } from 'vue'

const STORAGE_KEY = 'courtin_sidebar_collapsed'

// Estado a nivel módulo: el panel y el backoffice comparten la misma preferencia,
// y sobrevive a la navegación entre layouts y a recargas de página.
const collapsed = ref(localStorage.getItem(STORAGE_KEY) === '1')

watch(collapsed, (value) => {
  localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
})

// En mobile el sidebar es un drawer: `collapsed` (colapsar a íconos) no aplica y
// lo que manda es si el panel está abierto encima del contenido. Es estado
// efímero a propósito: no se persiste, cada navegación arranca cerrado.
const mobileOpen = ref(false)

// Breakpoint `lg` de Tailwind: por debajo el sidebar es drawer, por encima es
// columna fija. Se sigue por matchMedia y no por clases CSS porque el modo
// "colapsado a íconos" cambia qué se renderiza, no sólo cómo se ve.
const DESKTOP_QUERY = '(min-width: 1024px)'
const desktopMq = typeof window !== 'undefined' ? window.matchMedia(DESKTOP_QUERY) : null
const isDesktop = ref(desktopMq ? desktopMq.matches : true)

desktopMq?.addEventListener('change', (e) => {
  isDesktop.value = e.matches
  // Al pasar a desktop el drawer deja de existir: si quedaba abierto, su
  // overlay taparía el contenido para siempre.
  if (e.matches) mobileOpen.value = false
})

// Sidebar reducido a íconos. Sólo tiene sentido en desktop: dentro del drawer
// hay ancho de sobra y el menú se muestra completo.
const railed = computed(() => collapsed.value && isDesktop.value)

const isMac = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.userAgent)

// Etiqueta del atajo para los tooltips, según la plataforma.
export const SIDEBAR_SHORTCUT_LABEL = isMac ? '⌘B' : 'Ctrl+B'
// Formato normalizado que espera aria-keyshortcuts.
export const SIDEBAR_SHORTCUT_ARIA = isMac ? 'Meta+B' : 'Control+B'

export function useSidebar() {
  const toggleSidebar = () => {
    collapsed.value = !collapsed.value
  }

  return {
    collapsed,
    railed,
    isDesktop,
    toggleSidebar,
    mobileOpen,
    openMobile: () => (mobileOpen.value = true),
    closeMobile: () => (mobileOpen.value = false),
    shortcutLabel: SIDEBAR_SHORTCUT_LABEL,
    shortcutAria: SIDEBAR_SHORTCUT_ARIA,
  }
}

// Mientras el drawer está abierto el fondo no debe scrollear: en iOS el scroll
// se "roba" al body y al cerrar el panel la página quedó en otro lugar.
watch(mobileOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

// Atajo ⌘B / Ctrl+B. Se registra desde los layouts (no a nivel módulo) para que
// sólo esté activo donde existe un sidebar, y no en las vistas públicas.
export function useSidebarShortcut() {
  const onKeydown = (event) => {
    if (event.key === 'Escape' && mobileOpen.value) {
      mobileOpen.value = false
      return
    }
    if (!event.key || event.key.toLowerCase() !== 'b') return
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return

    // En un editor de texto enriquecido ⌘B significa "negrita": ahí no interceptamos.
    if (event.target?.isContentEditable) return

    event.preventDefault()
    collapsed.value = !collapsed.value
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
