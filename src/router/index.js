import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login',    component: () => import('../views/LoginView.vue') },
  { path: '/register', component: () => import('../views/RegisterView.vue') },
  { path: '/403', component: () => import('../views/ForbiddenView.vue') },

  { path: '/', redirect: '/dashboard' },

  {
    path: '/dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true, title: 'Dashboard' },
  },
  {
    path: '/accounts',
    component: () => import('../views/AccountsView.vue'),
    meta: { requiresAuth: true, title: 'Cuentas' },
  },
  {
    path: '/transactions',
    component: () => import('../views/TransactionsView.vue'),
    meta: { requiresAuth: true, title: 'Transacciones' },
  },
  {
    path: '/categories',
    component: () => import('../views/CategoriesView.vue'),
    meta: { requiresAuth: true, title: 'Categorías' },
  },
  {
    path: '/budgets',
    component: () => import('../views/BudgetsView.vue'),
    meta: { requiresAuth: true, title: 'Presupuestos' },
  },
  {
    path: '/reports',
    component: () => import('../views/ReportsView.vue'),
    meta: { requiresAuth: true, title: 'Reportes' },
  },
  {
    path: '/users',
    component: () => import('../views/UsersView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, title: 'Usuarios' },
  },
  {
    path: '/profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true, title: 'Perfil' },
  },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/login'
  }

  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return '/403'
  }
})

export default router