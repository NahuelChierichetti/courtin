import { ref, watch, onMounted, onUnmounted } from 'vue'

const STORAGE_KEY = 'courtin_sidebar_collapsed'

// Estado a nivel módulo: el panel y el backoffice comparten la misma preferencia,
// y sobrevive a la navegación entre layouts y a recargas de página.
const collapsed = ref(localStorage.getItem(STORAGE_KEY) === '1')

watch(collapsed, (value) => {
  localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
})

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
    toggleSidebar,
    shortcutLabel: SIDEBAR_SHORTCUT_LABEL,
    shortcutAria: SIDEBAR_SHORTCUT_ARIA,
  }
}

// Atajo ⌘B / Ctrl+B. Se registra desde los layouts (no a nivel módulo) para que
// sólo esté activo donde existe un sidebar, y no en las vistas públicas.
export function useSidebarShortcut() {
  const onKeydown = (event) => {
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
