import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { isChunkLoadError } from '@/utils/chunkErrors'
import AppLayout from '@/layouts/AppLayout.vue'
import BackofficeLayout from '@/layouts/BackofficeLayout.vue'
import PublicLayout from '@/layouts/PublicLayout.vue'
import LoginView from '@/views/auth/Login.vue'
import RegisterChoiceView from '@/views/auth/RegisterChoice.vue'
import RegisterView from '@/views/auth/Register.vue'
import RegisterClubView from '@/views/auth/RegisterClub.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      // Sitio del cliente (raíz): descubrimiento, reserva y cuenta del jugador.
      path: '/',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'public-home',
          component: () => import('@/views/public/PublicHomeView.vue'),
        },
        {
          // La búsqueda vive en el home: eran dos páginas corriendo la misma
          // query. `/buscar` queda por los links ya compartidos, con sus
          // filtros intactos.
          path: 'buscar',
          redirect: (to) => ({ name: 'public-home', query: to.query }),
        },
        {
          path: 'club/:slug',
          name: 'public-club',
          component: () => import('@/views/public/ClubDetailView.vue'),
        },
        {
          path: 'mis-reservas',
          name: 'mis-reservas',
          component: () => import('@/views/public/MisReservasView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'cuenta',
          name: 'cuenta',
          component: () => import('@/views/public/CuentaView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'favoritos',
          name: 'favoritos',
          component: () => import('@/views/public/FavoritosView.vue'),
          meta: { requiresAuth: true },
        },
        {
          // `mis-notificaciones` y no `notificaciones`: ese nombre ya lo usa la
          // campanita del panel del complejo.
          path: 'notificaciones',
          name: 'mis-notificaciones',
          component: () => import('@/views/public/MisNotificacionesView.vue'),
          meta: { requiresAuth: true },
        },
      ],
    },
    {
      // Página de venta, dirigida al dueño del complejo. Fuera de `PublicLayout`
      // a propósito: ese layout le habla al jugador (buscador de canchas en el
      // encabezado) y acá la audiencia es la que paga. Trae su propio chrome.
      path: '/complejos',
      name: 'landing-complejos',
      component: () => import('@/views/landing/LandingComplejosView.vue'),
    },
    {
      // `/suma-tu-complejo` fue la URL con la que se probó el rediseño de esta
      // misma página. Queda como redirección y no se borra: cualquier link que
      // se haya compartido mientras se probaba tiene que seguir llegando.
      path: '/suma-tu-complejo',
      redirect: '/complejos',
    },
    {
      // Gestión de una reserva por token (invitado sin cuenta).
      path: '/reserva/:token',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'public-reserva',
          component: () => import('@/views/public/ReservaManageView.vue'),
        },
      ],
    },
    {
      // Backoffice del complejo (tenant_admin/employee).
      path: '/panel',
      component: AppLayout,
      meta: { requiresAuth: true, requiresClubStaff: true },
      children: [
        {
          path: '',
          redirect: '/panel/dashboard',
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'turnos',
          name: 'turnos',
          component: () => import('@/views/TurnosView.vue'),
          meta: { title: 'Turnos' },
        },
        {
          path: 'clientes',
          name: 'clientes',
          component: () => import('@/views/ClientesView.vue'),
          meta: { title: 'Clientes' },
        },
        {
          path: 'caja',
          name: 'caja',
          component: () => import('@/views/CajaView.vue'),
          meta: { title: 'Control de caja' },
        },
        {
          path: 'canchas',
          name: 'canchas',
          component: () => import('@/views/CanchasView.vue'),
          meta: { title: 'Canchas' },
        },
        {
          path: 'horarios',
          name: 'horarios',
          component: () => import('@/views/HorariosView.vue'),
          meta: { title: 'Horarios' },
        },
        {
          path: 'reportes',
          name: 'reportes',
          component: () => import('@/views/ReportesView.vue'),
          meta: { title: 'Reportes' },
        },
        {
          path: 'equipo',
          name: 'equipo',
          component: () => import('@/views/EquipoView.vue'),
          meta: { title: 'Equipo' },
        },
        {
          // Accesible aun con el complejo suspendido: es donde ve la deuda y
          // paga. Su endpoint queda fuera del guard de suscripción en el backend.
          path: 'suscripcion',
          name: 'suscripcion',
          component: () => import('@/views/SuscripcionView.vue'),
          meta: { title: 'Suscripción' },
        },
        {
          path: 'configuracion',
          name: 'configuracion',
          component: () => import('@/views/ConfiguracionView.vue'),
          meta: { title: 'Configuración' },
        },
        {
          path: 'notificaciones',
          name: 'notificaciones',
          component: () => import('@/views/NotificacionesView.vue'),
          meta: { title: 'Notificaciones' },
        },
      ],
    },
    {
      path: '/admin',
      component: BackofficeLayout,
      meta: { requiresAuth: true, requiresSuperadmin: true },
      children: [
        {
          path: '',
          redirect: '/admin/complejos',
        },
        {
          path: 'complejos',
          name: 'admin-complejos',
          component: () => import('@/views/admin/ComplejosView.vue'),
        },
        {
          path: 'usuarios',
          name: 'admin-usuarios',
          component: () => import('@/views/admin/UsuariosView.vue'),
        },
        {
          path: 'suscripciones',
          name: 'admin-suscripciones',
          component: () => import('@/views/admin/SuscripcionesView.vue'),
          meta: { title: 'Suscripciones' },
        },
        {
          path: 'reportes',
          name: 'admin-reportes',
          component: () => import('@/views/PlaceholderView.vue'),
          meta: { title: 'Reportes' },
        },
      ],
    },
    // --- Acceso del cliente/jugador ---
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true, variant: 'customer' },
    },
    {
      // Bifurcación del registro. `/registro` no es un formulario: es la
      // elección entre las dos altas, que son productos distintos.
      path: '/registro',
      name: 'registro',
      component: RegisterChoiceView,
      meta: { guestOnly: true },
    },
    {
      path: '/registro/jugador',
      name: 'registro-jugador',
      component: RegisterView,
      meta: { guestOnly: true },
    },
    {
      path: '/recuperar',
      name: 'recuperar',
      component: () => import('@/views/auth/ForgotPassword.vue'),
      meta: { guestOnly: true, variant: 'customer' },
    },
    {
      // Destino del link del email. Sin `guestOnly`: si alguien ya tiene sesión
      // abierta en el navegador y hace clic en el link, igual tiene que poder
      // cambiar la contraseña en vez de que lo rebote a su panel.
      path: '/restablecer',
      name: 'restablecer',
      component: () => import('@/views/auth/ResetPassword.vue'),
    },
    // --- Acceso del complejo ---
    {
      path: '/panel/login',
      name: 'panel-login',
      component: LoginView,
      meta: { guestOnly: true, variant: 'club' },
    },
    {
      path: '/panel/registro',
      name: 'panel-registro',
      component: RegisterClubView,
      meta: { guestOnly: true },
    },
    {
      // Destino del link de confirmación de email. Sin `guestOnly`: el link
      // suele abrirse en el mismo navegador donde ya hay sesión iniciada.
      path: '/verificar',
      name: 'verificar',
      component: () => import('@/views/auth/VerifyEmail.vue'),
    },
    {
      // Destino del link de invitación. Sin `guestOnly`: alguien con sesión
      // abierta igual tiene que poder aceptar una invitación a otro complejo.
      path: '/invitacion/:token',
      name: 'invitacion',
      component: () => import('@/views/auth/AcceptInvitation.vue'),
    },
    {
      path: '/panel/recuperar',
      name: 'panel-recuperar',
      component: () => import('@/views/auth/ForgotPassword.vue'),
      meta: { guestOnly: true, variant: 'club' },
    },
    // --- Redirects de compatibilidad (estructura anterior) ---
    {
      path: '/reservar',
      redirect: '/',
    },
    {
      path: '/reservar/:slug',
      redirect: (to) => `/club/${to.params.slug}`,
    },
    {
      path: '/register',
      redirect: '/registro',
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],

  // Cada pantalla nueva arranca arriba. Sin esto el scroll se hereda de la
  // pantalla anterior: entrar a la ficha de un complejo desde el buscador te
  // dejaba a media página, mirando el bloque de instalaciones.
  //
  // Las dos excepciones son las que espera cualquiera:
  //   • volver con el botón atrás repone dónde estabas (`savedPosition`);
  //   • cambiar sólo la query de la misma pantalla no mueve nada — el buscador
  //     escribe los filtros en la URL, y saltar arriba en cada clic de filtro
  //     sería mareante.
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    if (to.path === from.path) return false

    // El panel no scrollea la ventana sino su <main> (el layout es h-screen),
    // así que ahí el `top: 0` de abajo no toca nada y hay que moverlo a mano.
    document.querySelector('main')?.scrollTo({ top: 0 })

    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const { initializeAuth, isAuthenticated, isSuperadmin, hasClubAccess, resolveLanding } =
    useAuth()

  await initializeAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    // El backoffice manda a su propio login; el sitio del cliente al suyo.
    const loginName = to.path.startsWith('/panel') ? 'panel-login' : 'login'
    return {
      name: loginName,
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.requiresSuperadmin && !isSuperadmin.value) {
    return resolveLanding()
  }

  if (to.meta.requiresClubStaff && !hasClubAccess.value) {
    return resolveLanding()
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return resolveLanding()
  }

  return true
})

// Sin esto, cuando un deploy deja sin chunk a una pestaña vieja la navegación
// muere en silencio: el usuario aprieta el link y no pasa absolutamente nada,
// porque vue-router aborta la ruta y deja la pantalla anterior puesta.
//
// La salida es recargar de verdad contra la URL destino (no `router.push`, que
// volvería a pedir el mismo chunk fantasma): así el browser trae el index.html
// nuevo, con los hashes que sí existen, y aterriza donde el usuario quería ir.
//
// La marca en sessionStorage evita el ciclo de recargas si el chunk falta por
// algo que un deploy no arregla; se limpia sola en cuanto una navegación
// termina bien, que es justo lo que pasa cuando la recarga funcionó.
const CHUNK_RELOAD_KEY = 'courtin_chunk_reload'

// sessionStorage tira excepción en contextos con el almacenamiento bloqueado, y
// esto corre dentro del manejador de errores: si acá explota, no queda nadie
// atrás para atajarlo.
const readReloadMark = () => {
  try {
    return sessionStorage.getItem(CHUNK_RELOAD_KEY)
  } catch {
    return null
  }
}

const writeReloadMark = (value) => {
  try {
    if (value === null) sessionStorage.removeItem(CHUNK_RELOAD_KEY)
    else sessionStorage.setItem(CHUNK_RELOAD_KEY, value)
  } catch {
    // Sin marca no hay protección contra el ciclo, pero tampoco podemos
    // recargar a ciegas: de eso se encarga el chequeo de `writeReloadMark`
    // fallido más abajo, que directamente no recarga.
  }
}

router.onError((error, to) => {
  if (!isChunkLoadError(error)) return
  if (readReloadMark() === to.fullPath) return

  writeReloadMark(to.fullPath)
  // Si la marca no se pudo guardar, recargar sería apostar a un ciclo infinito.
  if (readReloadMark() !== to.fullPath) return

  window.location.assign(to.fullPath)
})

router.afterEach(() => {
  if (readReloadMark() !== null) writeReloadMark(null)
})

export default router
