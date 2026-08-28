import { defineConfig } from 'vitepress'

// Centro de ayuda de CourtIn (help.courtinapp.com).
//
// La audiencia es UNA SOLA: la persona que administra un complejo. No el
// jugador que reserva una cancha. Todo lo que se escribe acá asume que quien
// lee tiene el panel abierto en otra pestaña y quiere resolver algo concreto.
export default defineConfig({
  lang: 'es-AR',
  title: 'Ayuda de CourtIn',
  description:
    'Cómo usar CourtIn para administrar tu complejo: turnos, canchas, horarios, cobros, caja y reportes.',
  cleanUrls: true,
  lastUpdated: true,
  appearance: 'dark',

  // El README es para quien mantiene este sitio, no para el complejo que lo lee.
  // Sin esto VitePress lo publica como una página más en help.courtinapp.com.
  srcExclude: ['README.md'],

  markdown: {
    // Una captura sin epígrafe obliga a leer el párrafo anterior para saber qué
    // se está mirando. El texto alternativo ya dice qué muestra cada imagen, así
    // que un párrafo que contiene SÓLO una imagen se convierte en
    // <figure> + <figcaption>: el mismo texto sirve de epígrafe y de
    // accesibilidad, sin escribirlo dos veces.
    config: (md) => {
      md.core.ruler.push('figure_con_epigrafe', (state) => {
        const tokens = state.tokens
        for (let i = 0; i < tokens.length - 2; i++) {
          const [abre, contenido, cierra] = [tokens[i], tokens[i + 1], tokens[i + 2]]
          if (abre.type !== 'paragraph_open') continue
          if (contenido.type !== 'inline' || cierra.type !== 'paragraph_close') continue

          const hijos = contenido.children || []
          const imagen = hijos.length === 1 && hijos[0].type === 'image' ? hijos[0] : null
          if (!imagen) continue

          const epigrafe = imagen.content || ''
          abre.type = 'figure_open'
          abre.tag = 'figure'
          cierra.type = 'figure_close'
          cierra.tag = 'figure'
          if (!epigrafe) continue

          const caption = new state.Token('html_block', '', 0)
          caption.content = `<figcaption>${md.utils.escapeHtml(epigrafe)}</figcaption>\n`
          tokens.splice(i + 2, 0, caption)
          i += 1
        }
      })
    },
  },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#347048' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
      },
    ],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Ayuda de CourtIn' }],
  ],

  themeConfig: {
    logo: { light: '/logo-green.svg', dark: '/logo-lime.svg' },
    siteTitle: 'Ayuda',

    nav: [
      { text: 'Primeros pasos', link: '/primeros-pasos/', activeMatch: '/primeros-pasos/' },
      { text: 'El panel', link: '/panel/turnos', activeMatch: '/panel/' },
      { text: 'Reservas online', link: '/reservas-online/link-de-reservas', activeMatch: '/reservas-online/' },
      { text: 'Tu cuenta', link: '/cuenta/suscripcion', activeMatch: '/cuenta/' },
      { text: 'Ir al panel', link: 'https://courtinapp.com/panel' },
    ],

    sidebar: [
      {
        text: 'Primeros pasos',
        collapsed: false,
        items: [
          { text: 'Qué es CourtIn', link: '/primeros-pasos/' },
          { text: 'Crear tu cuenta', link: '/primeros-pasos/crear-cuenta' },
          { text: 'Puesta en marcha', link: '/primeros-pasos/puesta-en-marcha' },
        ],
      },
      {
        text: 'El día a día',
        collapsed: false,
        items: [
          { text: 'Turnos', link: '/panel/turnos' },
          { text: 'Turnos fijos', link: '/panel/turnos-fijos' },
          { text: 'Clientes', link: '/panel/clientes' },
          { text: 'Control de caja', link: '/panel/caja' },
          { text: 'Notificaciones', link: '/panel/notificaciones' },
        ],
      },
      {
        text: 'Configurar el complejo',
        collapsed: false,
        items: [
          { text: 'Canchas y precios', link: '/panel/canchas' },
          { text: 'Horarios', link: '/panel/horarios' },
          { text: 'Datos del complejo', link: '/panel/configuracion' },
          { text: 'Equipo y permisos', link: '/panel/equipo' },
        ],
      },
      {
        text: 'Reservas online',
        collapsed: false,
        items: [
          { text: 'Tu link de reservas', link: '/reservas-online/link-de-reservas' },
          { text: 'Cobrar con MercadoPago', link: '/reservas-online/mercadopago' },
          { text: 'Señas y devoluciones', link: '/reservas-online/senas-y-devoluciones' },
        ],
      },
      {
        text: 'Medir y crecer',
        collapsed: false,
        items: [
          { text: 'Dashboard', link: '/panel/dashboard' },
          { text: 'Reportes', link: '/panel/reportes' },
        ],
      },
      {
        text: 'Tu cuenta',
        collapsed: false,
        items: [{ text: 'Plan y facturación', link: '/cuenta/suscripcion' }],
      },
    ],

    outline: { level: [2, 3], label: 'En esta página' },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Buscar', buttonAriaLabel: 'Buscar' },
          modal: {
            noResultsText: 'Sin resultados para',
            resetButtonTitle: 'Limpiar',
            footer: {
              selectText: 'para seleccionar',
              navigateText: 'para navegar',
              closeText: 'para cerrar',
            },
          },
        },
      },
    },

    docFooter: { prev: 'Anterior', next: 'Siguiente' },
    darkModeSwitchLabel: 'Tema',
    lightModeSwitchTitle: 'Cambiar a modo claro',
    darkModeSwitchTitle: 'Cambiar a modo oscuro',
    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Secciones',
    lastUpdated: {
      text: 'Actualizado',
      formatOptions: { dateStyle: 'long' },
    },

    footer: {
      message:
        '¿No encontraste lo que buscabas? Escribinos a <a href="mailto:hola@courtinapp.com">hola@courtinapp.com</a>.',
      copyright: 'CourtIn — gestión para complejos deportivos',
    },
  },
})
