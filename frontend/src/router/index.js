import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import AppLayout from '@/layouts/AppLayout.vue'
import BackofficeLayout from '@/layouts/BackofficeLayout.vue'
import PublicLayout from '@/layouts/PublicLayout.vue'
import LoginView from '@/views/auth/Login.vue'
import RegisterView from '@/views/auth/Register.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard',
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
    {
      // Interfaz pública (sin login obligatorio): búsqueda y reserva.
      path: '/reservar',
      component: PublicLayout,
      children: [
        {
          path: '',
          name: 'public-buscar',
          component: () => import('@/views/public/BuscarView.vue'),
        },
        {
          path: ':slug',
          name: 'public-club',
          component: () => import('@/views/public/ClubDetailView.vue'),
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
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { guestOnly: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
    },
  ],
})

router.beforeEach(async (to) => {
  const { initializeAuth, isAuthenticated, isSuperadmin } = useAuth()

  await initializeAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.requiresSuperadmin && !isSuperadmin.value) {
    return { name: 'dashboard' }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
