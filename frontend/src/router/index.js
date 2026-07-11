import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import AppLayout from '@/layouts/AppLayout.vue'
import BackofficeLayout from '@/layouts/BackofficeLayout.vue'
import PublicLayout from '@/layouts/PublicLayout.vue'
import LoginView from '@/views/auth/Login.vue'
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
          name: 'public-buscar',
          component: () => import('@/views/public/BuscarView.vue'),
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
      ],
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
          component: () => import('@/views/PlaceholderView.vue'),
          meta: { title: 'Clientes' },
        },
        {
          path: 'caja',
          name: 'caja',
          component: () => import('@/views/PlaceholderView.vue'),
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
          component: () => import('@/views/PlaceholderView.vue'),
          meta: { title: 'Reportes' },
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
          component: () => import('@/views/PlaceholderView.vue'),
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
          component: () => import('@/views/PlaceholderView.vue'),
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
      path: '/registro',
      name: 'registro',
      component: RegisterView,
      meta: { guestOnly: true },
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

export default router
