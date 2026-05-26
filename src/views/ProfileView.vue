<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth    = useAuthStore()
const loading = ref(false)
const error   = ref('')
const profile = ref(null)

const fetchProfile = async () => {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await api.get('/api/auth/me')
    profile.value  = data.data
  } catch (err) {
    error.value = err.response?.data?.message || 'Error al cargar el perfil.'
  } finally {
    loading.value = false
  }
}

const initials = computed(() => {
  const name = profile.value?.name || profile.value?.email || '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
})

const roleLabel = (role) => {
  const map = {
    admin:       'Administrador',
    capturista:  'Capturista',
    supervisor:  'Supervisor',
    consulta:    'Consulta',
  }
  return map[role] || role || '—'
}

const roleBadgeClass = (role) => {
  const map = {
    admin:      'badge-blue',
    supervisor: 'badge-yellow',
    capturista: 'badge-green',
    consulta:   'badge-gray',
  }
  return map[role] || 'badge-gray'
}

const fmtDate = (str) => {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

onMounted(fetchProfile)
</script>

<template>
  <div class="profile-page">

    <div class="page-header">
      <div>
        <h2>Mi perfil</h2>
        <p class="page-sub">Información de tu cuenta</p>
      </div>
    </div>

    <div v-if="loading" class="state-box">
      <span class="spinner"></span>
      <p>Cargando perfil…</p>
    </div>

    <p v-else-if="error" class="error-msg">{{ error }}</p>

    <template v-else-if="profile">

      <div class="profile-layout">

        <!-- Avatar card -->
        <div class="card avatar-card">
          <div class="big-avatar">{{ initials }}</div>
          <h3 class="profile-name">{{ profile.name || '—' }}</h3>
          <p class="profile-email">{{ profile.email }}</p>
          <span class="badge" :class="roleBadgeClass(profile.role)">
            {{ roleLabel(profile.role) }}
          </span>
        </div>

        <!-- Info card -->
        <div class="card info-card">
          <h3>Detalles de la cuenta</h3>

          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">Nombre completo</span>
              <span class="info-value">{{ profile.name || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Correo electrónico</span>
              <span class="info-value">{{ profile.email }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Rol</span>
              <span class="info-value">
                <span class="badge" :class="roleBadgeClass(profile.role)">
                  {{ roleLabel(profile.role) }}
                </span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Estado</span>
              <span class="info-value">
                <span class="badge" :class="profile.status === 'active' ? 'badge-green' : 'badge-red'">
                  {{ profile.status === 'active' ? 'Activo' : 'Inactivo' }}
                </span>
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">Miembro desde</span>
              <span class="info-value">{{ fmtDate(profile.createdAt) }}</span>
            </div>
            <div v-if="profile.updatedAt" class="info-row">
              <span class="info-label">Última actualización</span>
              <span class="info-value">{{ fmtDate(profile.updatedAt) }}</span>
            </div>
          </div>
        </div>

      </div>

    </template>

  </div>
</template>

<style scoped>
.profile-page { display: flex; flex-direction: column; gap: 20px; }

.profile-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 20px;
  align-items: start;
}

/* Avatar card */
.avatar-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 24px;
  text-align: center;
}

.big-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.profile-name  { font-size: 18px; font-weight: 600; color: var(--text-h); margin: 0; }
.profile-email { font-size: 13px; color: var(--text); margin: 0; }

/* Info card */
.info-card { display: flex; flex-direction: column; gap: 20px; }
.info-card h3 { margin: 0; font-size: 16px; }

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 13px 16px;
  gap: 16px;
  border-bottom: 1px solid var(--border);
}
.info-row:last-child { border-bottom: none; }
.info-row:nth-child(odd) { background: var(--bg); }

.info-label {
  font-size: 13px;
  color: var(--text);
  width: 180px;
  flex-shrink: 0;
  font-weight: 500;
}
.info-value {
  font-size: 14px;
  color: var(--text-h);
  flex: 1;
}

/* States */
.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--text);
  font-size: 14px;
}
.spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .profile-layout { grid-template-columns: 1fr; }
  .info-label { width: 130px; }
}
</style>
