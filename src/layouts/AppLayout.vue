<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const sidebarOpen  = ref(true)
const dropdownOpen = ref(false)
const notifOpen    = ref(false)
const searchQuery  = ref('')

// Notificaciones (alertas de presupuesto) 
const alerts       = ref([])
const notifLoading = ref(false)

const loadAlerts = async () => {
  if (!auth.isAuthenticated) return
  notifLoading.value = true
  try {
    const { data } = await api.get('/api/dashboard/summary')
    const budgets  = data.data?.budgetOverview || []
    alerts.value   = budgets.filter((b) => b.exceeded || b.percentage >= 80)
  } catch {
    alerts.value = []
  } finally {
    notifLoading.value = false
  }
}

const alertCount  = computed(() => alerts.value.length)

const alertLabel = (b) => {
  if (b.exceeded)         return 'Excedido'
  if (b.percentage >= 90) return 'Crítico'
  return 'En riesgo'
}
const alertColor = (b) => {
  if (b.exceeded)         return '#dc2626'
  if (b.percentage >= 90) return '#ea580c'
  return '#ca8a04'
}

const toggleNotif = () => {
  notifOpen.value    = !notifOpen.value
  dropdownOpen.value = false
}
const closeNotif = () => { notifOpen.value = false }

// Toggle tema oscuro/claro 
const isDark = ref(false)
const initTheme = () => {
  isDark.value = localStorage.getItem('fc-theme') === 'dark'
  document.documentElement.classList.toggle('dark-mode', isDark.value)
}
const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark-mode', isDark.value)
  localStorage.setItem('fc-theme', isDark.value ? 'dark' : 'light')
}
onMounted(() => {
  initTheme()
  loadAlerts()
})

const userName = computed(() => auth.user?.name  || auth.user?.email || 'Usuario')
const userRole = computed(() => auth.user?.role  || '')

const initials = computed(() => {
  const name = auth.user?.name || auth.user?.email || '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
})

const allNavItems = [
  { label: 'Dashboard',     icon: '▦',  to: '/dashboard' },
  { label: 'Cuentas',       icon: '🏦', to: '/accounts' },
  { label: 'Transacciones', icon: '↕',  to: '/transactions' },
  { label: 'Categorías',    icon: '🏷',  to: '/categories' },
  { label: 'Presupuestos',  icon: '📊', to: '/budgets' },
  { label: 'Reportes',      icon: '📄', to: '/reports' },
  { label: 'Usuarios',      icon: '👥', to: '/users', adminOnly: true },
]

const navItems = computed(() =>
  allNavItems.filter((item) => !item.adminOnly || auth.isAdmin)
)

const isActive = (to) => route.path.startsWith(to)

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
  notifOpen.value    = false
}
const closeDropdown = () => { dropdownOpen.value = false }
const closeAll      = () => { dropdownOpen.value = false; notifOpen.value = false }

const handleLogout = async () => {
  closeAll()
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell" @click="closeAll">

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: !sidebarOpen }">
      <div class="sidebar-header">
        <span class="logo" v-if="sidebarOpen">💜 FinControl</span>
        <span class="logo-icon" v-else>💜</span>
        <button class="toggle-btn" @click.stop="sidebarOpen = !sidebarOpen">
          {{ sidebarOpen ? '‹' : '›' }}
        </button>
      </div>

      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.to) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label" v-if="sidebarOpen">{{ item.label }}</span>
        </router-link>
      </nav>
    </aside>

    <!-- Main -->
    <div class="main-wrapper">

      <!-- Topbar -->
      <header class="navbar">

        <div class="navbar-search">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="Buscar..."
          />
        </div>

        <div class="navbar-right">

          <!-- Tema claro/oscuro -->
          <button class="icon-btn" @click.stop="toggleTheme" :title="isDark ? 'Cambiar a claro' : 'Cambiar a oscuro'">
            <span>{{ isDark ? '☀️' : '🌙' }}</span>
          </button>

          <!-- Notificaciones -->
          <div class="notif-wrap" @click.stop="toggleNotif">
            <button class="icon-btn" :class="{ 'icon-btn-active': notifOpen }" title="Notificaciones">
              <span>🔔</span>
            </button>
            <span v-if="alertCount > 0" class="notif-badge">{{ alertCount > 9 ? '9+' : alertCount }}</span>

            <!-- Dropdown notificaciones -->
            <div v-if="notifOpen" class="notif-dropdown" @click.stop>

              <div class="notif-header">
                <span class="notif-title">Notificaciones</span>
                <button class="notif-refresh" @click="loadAlerts" :disabled="notifLoading" title="Actualizar">
                  {{ notifLoading ? '...' : '↻' }}
                </button>
              </div>

              <!-- Sin alertas -->
              <div v-if="!notifLoading && alertCount === 0" class="notif-empty">
                <span class="notif-empty-icon">✅</span>
                <p>Todos los presupuestos<br>están bajo control</p>
              </div>

              <!-- Cargando -->
              <div v-else-if="notifLoading" class="notif-empty">
                <span class="notif-spin"></span>
                <p>Cargando…</p>
              </div>

              <!-- Lista de alertas -->
              <div v-else class="notif-list">
                <div
                  v-for="b in alerts"
                  :key="b.id"
                  class="notif-item"
                  @click="router.push('/budgets'); closeNotif()"
                >
                  <div class="notif-item-left">
                    <span class="notif-dot" :style="{ background: alertColor(b) }"></span>
                  </div>
                  <div class="notif-item-body">
                    <p class="notif-item-name">{{ b.name || `Presupuesto` }}</p>
                    <p class="notif-item-sub">
                      <span :style="{ color: alertColor(b), fontWeight: 600 }">{{ alertLabel(b) }}</span>
                      &nbsp;·&nbsp;{{ b.percentage }}% usado
                    </p>
                  </div>
                  <span class="notif-item-pct" :style="{ color: alertColor(b) }">
                    {{ b.percentage }}%
                  </span>
                </div>
              </div>

              <div class="notif-footer">
                <button class="notif-footer-btn" @click="router.push('/budgets'); closeNotif()">
                  Ver todos los presupuestos →
                </button>
              </div>

            </div>
          </div>

          <!-- Avatar + Dropdown -->
          <div class="avatar-wrap" @click.stop="toggleDropdown">
            <div class="avatar">{{ initials }}</div>

            <div v-if="dropdownOpen" class="dropdown" @click.stop>
              <div class="dropdown-header">
                <div class="avatar avatar-lg">{{ initials }}</div>
                <div class="dropdown-info">
                  <span class="dropdown-name">{{ userName }}</span>
                  <span class="dropdown-role">{{ userRole }}</span>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item" @click="router.push('/profile'); closeDropdown()">
                👤 Perfil
              </button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item dropdown-item-danger" @click="handleLogout">
                🚪 Cerrar sesión
              </button>
            </div>
          </div>

        </div>
      </header>

      <!-- Contenido -->
      <main class="main-content">
        <slot />
      </main>

    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100svh;
  background: var(--bg);
}

/* Sidebar  */
.sidebar {
  width: 220px;
  min-height: 100svh;
  background: var(--code-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: width 0.25s ease;
  flex-shrink: 0;
}
.sidebar.collapsed { width: 60px; }

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 14px;
  border-bottom: 1px solid var(--border);
  gap: 8px;
}
.logo      { font-size: 16px; font-weight: 600; color: var(--text-h); white-space: nowrap; }
.logo-icon { font-size: 20px; }

.toggle-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text);
  width: 24px;
  height: 24px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  gap: 2px;
  flex: 1;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--text);
  font-size: 14px;
  transition: background 0.15s;
  white-space: nowrap;
  overflow: hidden;
}
.nav-item:hover  { background: var(--accent-bg); color: var(--text-h); }
.nav-item.active { background: var(--accent-bg); color: var(--accent); font-weight: 600; }
.nav-icon { font-size: 16px; flex-shrink: 0; }

/* Topbar */
.navbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  gap: 16px;
}

.navbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 12px;
  flex: 1;
  max-width: 340px;
}
.search-icon  { font-size: 14px; opacity: 0.5; }
.search-input {
  background: none;
  border: none;
  outline: none;
  color: var(--text);
  font-size: 13px;
  width: 100%;
}
.search-input::placeholder { color: var(--text); opacity: 0.45; }

.navbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: border-color 0.15s;
}
.icon-btn:hover       { border-color: var(--accent); }
.icon-btn-active      { border-color: var(--accent); background: var(--accent-bg); }

/* Notificaciones */
.notif-wrap {
  position: relative;
  cursor: pointer;
}

.notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border-radius: 99px;
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  line-height: 1;
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  z-index: 100;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border);
}
.notif-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
}
.notif-refresh {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s;
}
.notif-refresh:hover:not(:disabled) { color: var(--accent); }
.notif-refresh:disabled { opacity: 0.45; }

.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 16px;
  color: var(--text);
  font-size: 13px;
  text-align: center;
}
.notif-empty-icon { font-size: 28px; }
.notif-empty p    { margin: 0; line-height: 1.4; }

.notif-spin {
  width: 20px; height: 20px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.notif-list { display: flex; flex-direction: column; max-height: 260px; overflow-y: auto; }

.notif-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--border);
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover      { background: var(--accent-bg); }

.notif-item-left  { display: flex; align-items: flex-start; padding-top: 3px; }
.notif-dot        { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.notif-item-body  { flex: 1; min-width: 0; }
.notif-item-name  { font-size: 13px; font-weight: 500; color: var(--text-h); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notif-item-sub   { font-size: 11px; color: var(--text); margin: 0; }

.notif-item-pct   { font-size: 12px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }

.notif-footer {
  border-top: 1px solid var(--border);
  padding: 8px 14px;
}
.notif-footer-btn {
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 12px;
  color: var(--accent);
  text-align: center;
  padding: 4px 0;
  transition: opacity 0.15s;
}
.notif-footer-btn:hover { opacity: 0.75; }

/* Avatar */
.avatar-wrap {
  position: relative;
  cursor: pointer;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  flex-shrink: 0;
}
.avatar-lg {
  width: 42px;
  height: 42px;
  font-size: 15px;
}

/* Dropdown */
.dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 220px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,.15);
  z-index: 100;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 12px;
}

.dropdown-info {
  display: flex;
  flex-direction: column; 
  gap: 2px;
  min-width: 0;
}
.dropdown-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dropdown-role {
  font-size: 11px;
  color: var(--text);
  opacity: 0.7;
  text-transform: capitalize;
}

.dropdown-divider { height: 1px; background: var(--border); }

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  text-align: left;
  transition: background 0.15s;
}
.dropdown-item:hover { background: var(--accent-bg); color: var(--text-h); }

.dropdown-item-danger       { color: #dc2626; }
.dropdown-item-danger:hover { background: #fef2f2; color: #dc2626; }

/* Main */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>