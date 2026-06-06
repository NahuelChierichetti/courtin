import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import AppLayout from '@/layouts/AppLayout.vue'
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
          component: () => import('@/views/PlaceholderView.vue'),
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
          component: () => import('@/views/PlaceholderView.vue'),
          meta: { title: 'Canchas' },
        },
        {
          path: 'horarios',
          name: 'horarios',
          component: () => import('@/views/PlaceholderView.vue'),
          meta: { title: 'Horarios' },
        },
        {
          path: 'reportes',
          name: 'reportes',
          component: () => import('@/views/PlaceholderView.vue'),
          meta: { title: 'Reportes' },
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
  const { initializeAuth, isAuthenticated } = useAuth()

  await initializeAuth()

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return { name: 'dashboard' }
  }

  return true
})

export default router
