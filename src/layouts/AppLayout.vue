<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const sidebarOpen = ref(true)

const userName = computed(() => auth.user?.name || auth.user?.email || 'Usuario')

const navItems = [
  { label: 'Dashboard',     icon: '▦',  to: '/dashboard' },
  { label: 'Cuentas',       icon: '🏦', to: '/accounts' },
  { label: 'Transacciones', icon: '↕',  to: '/transactions' },
  { label: 'Categorías',    icon: '🏷',  to: '/categories' },
  { label: 'Presupuestos',  icon: '📊', to: '/budgets' },
  { label: 'Reportes',      icon: '📄', to: '/reports' },
  { label: 'Usuarios',      icon: '👥', to: '/users' },
]

const isActive = (to) => route.path.startsWith(to)

const handleLogout = async () => {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">

    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: !sidebarOpen }">
      <div class="sidebar-header">
        <span class="logo" v-if="sidebarOpen">💜 FinControl</span>
        <span class="logo-icon" v-else>💜</span>
        <button class="toggle-btn" @click="sidebarOpen = !sidebarOpen">
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

      <!-- Navbar -->
      <header class="navbar">
        <span class="page-title">{{ route.meta.title || 'FinControl' }}</span>
        <div class="navbar-right">
          <span class="user-name">{{ userName }}</span>
          <button class="logout-btn" @click="handleLogout">Cerrar sesión</button>
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

/* Sidebar */
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
.nav-item:hover   { background: var(--accent-bg); color: var(--text-h); }
.nav-item.active  { background: var(--accent-bg); color: var(--accent); font-weight: 600; }
.nav-icon { font-size: 16px; flex-shrink: 0; }

/*  Main  */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.navbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.page-title  { font-weight: 600; color: var(--text-h); font-size: 15px; }
.navbar-right { display: flex; align-items: center; gap: 16px; }
.user-name   { font-size: 14px; color: var(--text); }

.logout-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 5px 12px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text);
  transition: border-color 0.2s, color 0.2s;
}
.logout-btn:hover { border-color: var(--accent); color: var(--accent); }

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
</style>
