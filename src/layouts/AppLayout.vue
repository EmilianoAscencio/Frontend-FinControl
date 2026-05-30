<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

/*  Responsive */
const isMobile      = ref(false)
const checkMobile   = () => { isMobile.value = window.innerWidth < 768 }
const sidebarExpanded = ref(true)   // desktop: expandido/colapsado
const mobileOpen      = ref(false)  // mobile: sidebar abierto

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  initTheme()
  loadAlerts()
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))

/*  Notificaciones  */
const alerts       = ref([])
const notifLoading = ref(false)
const notifOpen    = ref(false)
const dropdownOpen = ref(false)

const loadAlerts = async () => {
  if (!auth.isAuthenticated) return
  notifLoading.value = true
  try {
    const { data } = await api.get('/api/dashboard/summary')
    alerts.value = (data.data?.budgetOverview || []).filter(b => b.exceeded || b.percentage >= 80)
  } catch { alerts.value = [] }
  finally { notifLoading.value = false }
}
const alertCount = computed(() => alerts.value.length)
const alertLabel = (b) => b.exceeded ? 'Excedido' : b.percentage >= 90 ? 'Crítico' : 'En riesgo'
const alertColor = (b) => b.exceeded ? '#ef4444' : b.percentage >= 90 ? '#f97316' : '#eab308'

/* Tema  */
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

/* Usuario */
const userName = computed(() => auth.user?.name || auth.user?.email || 'Usuario')
const userRole = computed(() => auth.user?.role  || 'user')
const initials = computed(() => {
  const n = auth.user?.name || auth.user?.email || '?'
  return n.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
})

/* Navegación */
const allNavItems = [
  { label: 'Dashboard',     to: '/dashboard',    icon: 'dashboard'    },
  { label: 'Cuentas',       to: '/accounts',     icon: 'accounts'     },
  { label: 'Transacciones', to: '/transactions', icon: 'transactions' },
  { label: 'Categorías',    to: '/categories',   icon: 'categories'   },
  { label: 'Presupuestos',  to: '/budgets',      icon: 'budgets'      },
  { label: 'Reportes',      to: '/reports',      icon: 'reports'      },
  { label: 'Usuarios',      to: '/users',        icon: 'users', adminOnly: true },
]
const navItems = computed(() => allNavItems.filter(i => !i.adminOnly || auth.isAdmin))
const isActive = (to) => route.path.startsWith(to)

/* Acciones  */
const toggleSidebar  = () => {
  if (isMobile.value) mobileOpen.value = !mobileOpen.value
  else sidebarExpanded.value = !sidebarExpanded.value
}
const toggleDropdown = () => { dropdownOpen.value = !dropdownOpen.value; notifOpen.value = false }
const toggleNotif    = () => { notifOpen.value = !notifOpen.value; dropdownOpen.value = false }
const closeAll       = () => { dropdownOpen.value = false; notifOpen.value = false }
const closeMobile    = () => { mobileOpen.value = false; closeAll() }

const handleLogout = async () => {
  closeAll()
  await auth.logout()
  router.push('/login')
}

const navTo = (to) => {
  router.push(to)
  if (isMobile.value) mobileOpen.value = false
}

/* Íconos SVG */
const ICONS = {
  dashboard: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>`,
  accounts:  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"/></svg>`,
  transactions: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>`,
  categories: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L9.568 3z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z"/></svg>`,
  budgets:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>`,
  reports:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>`,
  users:      `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>`,
  menu:       `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/></svg>`,
  chevron:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>`,
  bell:       `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>`,
  sun:        `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>`,
  moon:       `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>`,
  profile:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>`,
  logout:     `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/></svg>`,
  refresh:    `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>`,
}
</script>

<template>
  <div class="app-shell" @click="closeAll">

    <!-- Overlay mobile -->
    <Transition name="fade">
      <div v-if="mobileOpen && isMobile" class="sidebar-overlay" @click="closeMobile"></div>
    </Transition>

    <!--SIDEBAR -->
    <aside
      class="sidebar"
      :class="{
        'sidebar--collapsed': !sidebarExpanded && !isMobile,
        'sidebar--mobile-open': mobileOpen && isMobile,
        'sidebar--mobile': isMobile,
      }"
      @click.stop
    >
      <!-- Logo / Header -->
      <div class="sidebar-header">
        <div class="sidebar-logo" v-if="sidebarExpanded || isMobile">
          <div class="logo-mark">FC</div>
          <span class="logo-text">FinControl</span>
        </div>

        <button
          class="sidebar-toggle"
          :class="{ 'sidebar-toggle--solo': !sidebarExpanded && !isMobile }"
          @click="toggleSidebar"
          :title="sidebarExpanded ? 'Colapsar menú' : 'Expandir menú'"
          v-if="!isMobile"
        >
          <span class="icon" v-html="ICONS.chevron" :style="{ transform: sidebarExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }"></span>
        </button>

        <button v-if="isMobile" class="sidebar-close" @click="closeMobile">✕</button>
      </div>

      <!-- Navegación -->
      <nav class="sidebar-nav">
        <p class="nav-section-label" v-if="sidebarExpanded || isMobile">MENÚ</p>
        <button
          v-for="item in navItems"
          :key="item.to"
          class="nav-item"
          :class="{ 'nav-item--active': isActive(item.to) }"
          @click="navTo(item.to)"
          :title="(!sidebarExpanded && !isMobile) ? item.label : ''"
        >
          <span class="nav-icon" v-html="ICONS[item.icon]"></span>
          <span class="nav-label" v-if="sidebarExpanded || isMobile">{{ item.label }}</span>
        </button>
      </nav>

      <!-- Footer del sidebar -->
      <div class="sidebar-footer" v-if="sidebarExpanded || isMobile">
        <div class="sf-user" @click="navTo('/profile')">
          <div class="sf-avatar">{{ initials }}</div>
          <div class="sf-info">
            <p class="sf-name">{{ userName }}</p>
            <p class="sf-role">{{ userRole }}</p>
          </div>
        </div>
      </div>
      <div class="sidebar-footer sidebar-footer--mini" v-else>
        <div class="sf-avatar sf-avatar--mini" @click="navTo('/profile')" title="Mi perfil">{{ initials }}</div>
      </div>

    </aside>

    <!--  MAIN -->
    <div class="main-wrapper">

      <!-- Topbar -->
      <header class="topbar" @click.stop>

        <!-- Hamburger (mobile) / logo (mobile) -->
        <div class="topbar-left">
          <button class="topbar-hamburger" @click.stop="toggleSidebar" v-if="isMobile">
            <span class="icon" v-html="ICONS.menu"></span>
          </button>
          <span class="topbar-brand" v-if="isMobile">FinControl</span>
        </div>

        <!-- Acciones derecha -->
        <div class="topbar-right">

          <!-- Tema -->
          <button class="top-icon-btn" @click.stop="toggleTheme" :title="isDark ? 'Modo claro' : 'Modo oscuro'">
            <span class="icon" v-html="isDark ? ICONS.sun : ICONS.moon"></span>
          </button>

          <!-- Notificaciones -->
          <div class="top-popover-wrap" @click.stop="toggleNotif">
            <button class="top-icon-btn" :class="{ 'top-icon-btn--active': notifOpen }" title="Notificaciones">
              <span class="icon" v-html="ICONS.bell"></span>
            </button>
            <span v-if="alertCount > 0" class="notif-dot">{{ alertCount > 9 ? '9+' : alertCount }}</span>

            <Transition name="pop">
              <div v-if="notifOpen" class="top-popover notif-popover" @click.stop>
                <div class="popover-head">
                  <span class="popover-title">Notificaciones</span>
                  <button class="popover-action" @click="loadAlerts" :disabled="notifLoading">
                    <span class="icon" v-html="ICONS.refresh"></span>
                  </button>
                </div>

                <div v-if="notifLoading" class="popover-state">
                  <span class="spinner"></span>
                </div>
                <div v-else-if="alertCount === 0" class="popover-state">
                  <span style="font-size:28px">✅</span>
                  <p>Todos los presupuestos<br>están bajo control</p>
                </div>
                <div v-else class="notif-list">
                  <div
                    v-for="b in alerts"
                    :key="b.id"
                    class="notif-item"
                    @click="navTo('/budgets')"
                  >
                    <span class="notif-pip" :style="{ background: alertColor(b) }"></span>
                    <div class="notif-body">
                      <p class="notif-name">{{ b.name || 'Presupuesto' }}</p>
                      <p class="notif-sub" :style="{ color: alertColor(b) }">
                        {{ alertLabel(b) }} · {{ b.percentage }}%
                      </p>
                    </div>
                    <div class="notif-bar-wrap">
                      <div class="notif-bar" :style="{ width: Math.min(b.percentage, 100) + '%', background: alertColor(b) }"></div>
                    </div>
                  </div>
                </div>

                <div class="popover-foot">
                  <button class="popover-foot-btn" @click="navTo('/budgets')">
                    Ver todos los presupuestos →
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Avatar + Dropdown -->
          <div class="top-popover-wrap" @click.stop="toggleDropdown">
            <button class="avatar-btn" :class="{ 'avatar-btn--active': dropdownOpen }">
              <div class="avatar">{{ initials }}</div>
              <div class="avatar-info" v-if="!isMobile">
                <span class="avatar-name">{{ userName }}</span>
                <span class="avatar-role">{{ userRole }}</span>
              </div>
              <span class="avatar-chevron icon" v-html="ICONS.chevron" v-if="!isMobile" style="transform: rotate(-90deg)"></span>
            </button>

            <Transition name="pop">
              <div v-if="dropdownOpen" class="top-popover user-popover" @click.stop>
                <div class="user-popover-head">
                  <div class="avatar avatar--lg">{{ initials }}</div>
                  <div>
                    <p class="uh-name">{{ userName }}</p>
                    <p class="uh-role">{{ userRole }}</p>
                  </div>
                </div>
                <div class="popover-divider"></div>
                <button class="popover-menu-item" @click="navTo('/profile'); closeAll()">
                  <span class="icon" v-html="ICONS.profile"></span>
                  Mi perfil
                </button>
                <div class="popover-divider"></div>
                <button class="popover-menu-item popover-menu-item--danger" @click="handleLogout">
                  <span class="icon" v-html="ICONS.logout"></span>
                  Cerrar sesión
                </button>
              </div>
            </Transition>
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
/* 
   APP SHELL
*/
.app-shell {
  display: flex;
  height: 100svh;
  overflow: hidden;
  background: var(--bg);
}

/* 
   SIDEBAR
 */
.sidebar {
  width: 240px;
  height: 100svh;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  transition: width 0.22s ease;
  z-index: 201;
}

.sidebar--collapsed { width: 68px; }

/* Mobile: fuera de la pantalla por defecto */
.sidebar--mobile {
  position: fixed;
  top: 0; left: 0;
  height: 100svh;
  width: 260px;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  box-shadow: var(--shadow-lg);
}
.sidebar--mobile-open { transform: translateX(0); }

/* Overlay */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  backdrop-filter: blur(2px);
}

/* Header */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px;
  border-bottom: 1px solid var(--border);
  gap: 8px;
  min-height: 60px;
  flex-shrink: 0;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 9px;
  overflow: hidden;
}

.logo-mark {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  letter-spacing: 0.03em;
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-h);
  white-space: nowrap;
}

.sidebar-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--text);
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.sidebar-toggle:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
.sidebar-toggle .icon { transition: transform 0.22s ease; }
/* When toggle is the only element (sidebar collapsed) — center it */
.sidebar-toggle--solo { margin: 0 auto; }

.sidebar-close {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text);
  cursor: pointer;
  padding: 4px;
}

/* Nav */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  padding: 12px 8px 8px;
  gap: 1px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
.sidebar-nav::-webkit-scrollbar { width: 0; }

.nav-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
  opacity: 0.45;
  padding: 0 10px 6px;
  margin: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
  width: 100%;
}
.nav-item:hover { background: var(--accent-bg); color: var(--accent); }

.nav-item--active {
  background: var(--accent-bg2);
  color: var(--accent);
  font-weight: 600;
  position: relative;
}
.nav-item--active::before {
  content: '';
  position: absolute;
  left: 0; top: 6px; bottom: 6px;
  width: 3px;
  background: var(--accent);
  border-radius: 0 3px 3px 0;
}

.nav-icon {
  width: 20px; height: 20px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.nav-icon :deep(svg) { width: 20px; height: 20px; }

.nav-label { overflow: hidden; text-overflow: ellipsis; }

/*  Sidebar Footer */
.sidebar-footer {
  border-top: 1px solid var(--border);
  padding: 12px 10px;
  flex-shrink: 0;
}

.sidebar-footer--mini {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.sf-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.sf-user:hover { background: var(--accent-bg); }

.sf-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sf-avatar--mini {
  width: 32px; height: 32px;
  cursor: pointer;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  transition: opacity 0.15s;
}
.sf-avatar--mini:hover { opacity: 0.8; }

.sf-info { overflow: hidden; }
.sf-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
.sf-role {
  font-size: 11px;
  color: var(--text);
  text-transform: capitalize;
  margin: 0;
}

/* 
   MAIN WRAPPER
═*/
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100svh;
  overflow: hidden;
}

/* 
   TOPBAR
 */
.topbar {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-card);
  gap: 12px;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-brand {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-h);
}

.topbar-hamburger {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 8px;
  transition: background 0.15s;
}
.topbar-hamburger:hover { background: var(--accent-bg); color: var(--accent); }

.topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

/* Icon buttons */
.top-icon-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--text);
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.top-icon-btn:hover        { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }
.top-icon-btn--active      { border-color: var(--accent); color: var(--accent); background: var(--accent-bg); }

/* Popover wrapper */
.top-popover-wrap { position: relative; }

/* Notifications badge */
.notif-dot {
  position: absolute;
  top: -4px; right: -4px;
  min-width: 16px; height: 16px;
  padding: 0 4px;
  border-radius: 99px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
  line-height: 1;
}

/* Popover base */
.top-popover {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  z-index: 300;
  overflow: hidden;
}

/* ── Notifications popover ── */
.notif-popover { width: 300px; display: flex; flex-direction: column; }

.popover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px 10px;
  border-bottom: 1px solid var(--border);
}
.popover-title { font-size: 13px; font-weight: 600; color: var(--text-h); }
.popover-action {
  background: none; border: none; cursor: pointer;
  color: var(--text); border-radius: 6px; padding: 3px;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.15s;
}
.popover-action:hover:not(:disabled) { color: var(--accent); }
.popover-action:disabled { opacity: 0.4; cursor: not-allowed; }

.popover-state {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 28px 16px; color: var(--text); font-size: 13px; text-align: center;
}
.popover-state p { margin: 0; line-height: 1.5; }

.notif-list { display: flex; flex-direction: column; max-height: 280px; overflow-y: auto; }

.notif-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid var(--border);
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover      { background: var(--accent-bg); }

.notif-pip { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

.notif-body { flex: 1; min-width: 0; }
.notif-name { font-size: 13px; font-weight: 500; color: var(--text-h); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.notif-sub  { font-size: 11px; font-weight: 600; margin: 0; }

.notif-bar-wrap {
  width: 50px; height: 4px;
  background: var(--border);
  border-radius: 99px;
  overflow: hidden;
  flex-shrink: 0;
}
.notif-bar { height: 100%; border-radius: 99px; }

.popover-foot {
  border-top: 1px solid var(--border);
  padding: 8px 14px;
}
.popover-foot-btn {
  width: 100%;
  background: none; border: none; cursor: pointer;
  font-size: 12px; color: var(--accent);
  text-align: center; padding: 4px 0;
  transition: opacity 0.15s;
  font-family: var(--font);
}
.popover-foot-btn:hover { opacity: 0.75; }

/* ── Avatar button ── */
.avatar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 5px 10px 5px 6px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.avatar-btn:hover,
.avatar-btn--active { border-color: var(--accent); background: var(--accent-bg); }

.avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  user-select: none;
}
.avatar--lg { width: 36px; height: 36px; font-size: 13px; }

.avatar-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0px;
}
.avatar-name { font-size: 13px; font-weight: 600; color: var(--text-h); white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
.avatar-role { font-size: 11px; color: var(--text); text-transform: capitalize; }
.avatar-chevron { color: var(--text); flex-shrink: 0; }

/* ── User popover ── */
.user-popover { width: 220px; }

.user-popover-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
}
.uh-name { font-size: 13px; font-weight: 600; color: var(--text-h); margin: 0 0 1px; }
.uh-role { font-size: 11px; color: var(--text); margin: 0; text-transform: capitalize; }

.popover-divider { height: 1px; background: var(--border); }

.popover-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  text-align: left;
  font-family: var(--font);
  transition: background 0.12s, color 0.12s;
}
.popover-menu-item:hover { background: var(--accent-bg); color: var(--accent); }
.popover-menu-item--danger { color: #dc2626; }
.popover-menu-item--danger:hover { background: var(--danger-bg); color: #dc2626; }

/* ══════════════════════════════════════════
   MAIN CONTENT
══════════════════════════════════════════ */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Icon helper ── */
.icon { width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.icon :deep(svg) { width: 18px; height: 18px; }

/* ══════════════════════════════════════════
   TRANSICIONES
══════════════════════════════════════════ */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,  .fade-leave-to     { opacity: 0; }

.pop-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.pop-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.pop-enter-from   { opacity: 0; transform: translateY(-6px) scale(0.97); }
.pop-leave-to     { opacity: 0; transform: translateY(-4px) scale(0.98); }

/* ══════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════ */
@media (max-width: 767px) {
  .main-content { padding: 16px; }
  .topbar       { padding: 0 14px; }
  .avatar-btn   { padding: 5px; border-radius: 50%; }
}

@media (max-width: 400px) {
  .top-icon-btn { width: 32px; height: 32px; }
}
</style>