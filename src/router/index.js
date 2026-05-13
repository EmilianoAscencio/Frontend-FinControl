import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', component: () => import('../views/LoginView.vue') },
  {
    path: '/',
    redirect: '/dashboard',
  },
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
    meta: { requiresAuth: true, title: 'Usuarios' },
  },
]

const router = createRouter({ history: createWebHistory(), routes })

// Guard de autenticación
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/login'
  }
})

export default router
