<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const sidebarOpen  = ref(true)
const dropdownOpen = ref(false)
const searchQuery  = ref('')

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

const toggleDropdown = () => { dropdownOpen.value = !dropdownOpen.value }
const closeDropdown  = ()  => { dropdownOpen.value = false }

const handleLogout = async () => {
  closeDropdown()
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell" @click="closeDropdown">

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

          <!-- Notificaciones -->
          <button class="icon-btn" title="Notificaciones">
            <span>🔔</span>
          </button>

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

/* ── Sidebar ── */
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

/* ── Topbar ── */
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
.icon-btn:hover { border-color: var(--accent); }

/* ── Avatar ── */
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

/* ── Dropdown ── */
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

/* ── Main ── */
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