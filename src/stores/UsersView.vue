<script setup>
import { ref, onMounted, computed } from 'vue'
import AppLayout from '../layouts/AppLayout.vue'
import { useUsersStore }  from '../stores/users'
import { useAuthStore }   from '../stores/auth'

const usersStore = useUsersStore()
const auth       = useAuthStore()

// Solo el rol admin puede ver esta vista
const isAdmin = computed(() => auth.user?.role === 'admin')

// ── Formulario nuevo usuario ───────────────────────────────────────────────────
const showForm  = ref(false)
const saving    = ref(false)
const formError = ref('')
const toggling  = ref(null) // id del usuario cuyo status está cambiando

const form = ref({ name: '', email: '', password: '', role: 'capturista' })

const openCreate = () => {
  form.value  = { name: '', email: '', password: '', role: 'capturista' }
  formError.value = ''
  showForm.value  = true
}
const closeForm = () => { showForm.value = false }

const saveForm = async () => {
  if (!form.value.name || !form.value.email || !form.value.password) {
    formError.value = 'Nombre, correo y contraseña son requeridos.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await usersStore.create({ ...form.value })
    closeForm()
  } catch (e) {
    formError.value = e.response?.data?.message || 'Error al crear usuario.'
  } finally {
    saving.value = false
  }
}

// ── Toggle status ─────────────────────────────────────────────────────────────
const toggleStatus = async (user) => {
  if (toggling.value) return          // evitar doble click
  toggling.value = user.id
  try {
    await usersStore.toggleStatus(user.id)
  } catch (e) {
    alert(e.response?.data?.message || 'Error al cambiar estatus.')
  } finally {
    toggling.value = null
  }
}

onMounted(() => {
  if (isAdmin.value) usersStore.fetchAll()
})
</script>

<template>
  <AppLayout>
    <div class="page">

      <!-- Acceso denegado -->
      <div v-if="!isAdmin" class="denied card">
        <span class="denied-icon">🔒</span>
        <h3>Acceso restringido</h3>
        <p>Esta sección es visible solo para administradores.</p>
      </div>

      <template v-else>

        <!-- Encabezado -->
        <div class="page-header">
          <div>
            <h2>Usuarios</h2>
            <p class="subtitle">Gestiona los usuarios y su acceso al sistema.</p>
          </div>
          <button class="btn-primary" @click="openCreate">+ Nuevo usuario</button>
        </div>

        <!-- Stats rápidos -->
        <div class="stats-row">
          <div class="stat card">
            <span class="stat-value">{{ usersStore.items.length }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat card">
            <span class="stat-value green">{{ usersStore.active.length }}</span>
            <span class="stat-label">Activos</span>
          </div>
          <div class="stat card">
            <span class="stat-value red">{{ usersStore.inactive.length }}</span>
            <span class="stat-label">Inactivos</span>
          </div>
        </div>

        <!-- Estado de carga -->
        <div v-if="usersStore.loading" class="state-msg">Cargando usuarios…</div>
        <div v-else-if="usersStore.error" class="state-msg error">{{ usersStore.error }}</div>

        <!-- Tabla -->
        <div v-else class="table-wrap card">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estatus</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="usersStore.items.length === 0">
                <td colspan="5" class="empty-row">No hay usuarios registrados.</td>
              </tr>
              <tr v-for="user in usersStore.items" :key="user.id">
                <td>
                  <div class="user-cell">
                    <div class="avatar">{{ user.name?.charAt(0)?.toUpperCase() || '?' }}</div>
                    <span>{{ user.name }}</span>
                  </div>
                </td>
                <td>{{ user.email }}</td>
                <td>
                  <span class="badge badge-gray">{{ user.role }}</span>
                </td>
                <td>
                  <span :class="['badge', user.status === 'active' ? 'badge-green' : 'badge-red']">
                    {{ user.status === 'active' ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td>
                  <!-- No puede desactivarse a sí mismo -->
                  <button
                    v-if="user.id !== auth.user?.id"
                    :class="['toggle-btn', user.status === 'active' ? 'toggle-deactivate' : 'toggle-activate']"
                    :disabled="toggling === user.id"
                    @click="toggleStatus(user)"
                  >
                    {{ toggling === user.id ? '…' : (user.status === 'active' ? 'Desactivar' : 'Activar') }}
                  </button>
                  <span v-else class="self-label">Tú</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modal crear usuario -->
        <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
          <div class="modal">
            <div class="modal-header">
              <h3>Nuevo usuario</h3>
              <button class="close-btn" @click="closeForm">✕</button>
            </div>

            <div class="form-group">
              <label>Nombre *</label>
              <input v-model="form.name" placeholder="Nombre completo" />
            </div>
            <div class="form-group">
              <label>Correo electrónico *</label>
              <input v-model="form.email" type="email" placeholder="correo@empresa.com" />
            </div>
            <div class="form-group">
              <label>Contraseña *</label>
              <input v-model="form.password" type="password" placeholder="Mínimo 6 caracteres" />
            </div>
            <div class="form-group">
              <label>Rol</label>
              <select v-model="form.role">
                <option value="capturista">Capturista</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <p v-if="formError" class="form-error">{{ formError }}</p>

            <div class="modal-actions">
              <button class="btn-ghost" @click="closeForm">Cancelar</button>
              <button class="btn-primary" :disabled="saving" @click="saveForm">
                {{ saving ? 'Creando…' : 'Crear usuario' }}
              </button>
            </div>
          </div>
        </div>

      </template>
    </div>
  </AppLayout>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 24px; }

.page-header {
  display: flex; justify-content: space-between;
  align-items: flex-start; gap: 16px;
}
.subtitle { font-size: 13px; color: var(--text); margin-top: 2px; }

/* Acceso denegado */
.denied {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 60px; text-align: center;
}
.denied-icon { font-size: 40px; }
.denied h3   { margin: 0; }
.denied p    { color: var(--text); font-size: 14px; }

/* Stats */
.stats-row { display: flex; gap: 12px; }
.stat {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; padding: 16px; gap: 4px;
}
.stat-value { font-size: 24px; font-weight: 700; color: var(--text-h); }
.stat-value.green { color: #16a34a; }
.stat-value.red   { color: #dc2626; }
.stat-label { font-size: 12px; color: var(--text); }

/* Table */
.table-wrap { padding: 0; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
thead { background: var(--bg); }
th {
  padding: 12px 16px; text-align: left;
  font-size: 12px; font-weight: 600;
  color: var(--text); text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border);
}
td {
  padding: 12px 16px; font-size: 14px;
  border-bottom: 1px solid var(--border); color: var(--text-h);
}
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--accent-bg); }

.user-cell { display: flex; align-items: center; gap: 10px; }
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--accent-bg); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; flex-shrink: 0;
}

.empty-row { text-align: center; color: var(--text); padding: 32px; }

/* Toggle buttons */
.toggle-btn {
  font-size: 12px; font-weight: 500; border: 1px solid;
  border-radius: 6px; padding: 4px 12px; cursor: pointer;
  transition: opacity 0.15s;
}
.toggle-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.toggle-deactivate { border-color: #dc2626; color: #dc2626; background: rgba(220,38,38,.08); }
.toggle-deactivate:hover:not(:disabled) { background: rgba(220,38,38,.18); }
.toggle-activate   { border-color: #16a34a; color: #16a34a; background: rgba(22,163,74,.08); }
.toggle-activate:hover:not(:disabled)   { background: rgba(22,163,74,.18); }

.self-label { font-size: 12px; color: var(--text); font-style: italic; }

/* Buttons */
.btn-primary {
  background: var(--accent); color: #fff; border: none;
  border-radius: 8px; padding: 9px 18px; font-size: 14px; font-weight: 500;
  cursor: pointer; transition: opacity 0.15s;
}
.btn-primary:hover:not(:disabled) { opacity: 0.88; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost {
  background: none; border: 1px solid var(--border);
  border-radius: 8px; padding: 9px 18px; font-size: 14px;
  cursor: pointer; color: var(--text);
}
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
  z-index: 100; padding: 16px;
}
.modal {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 14px; box-shadow: var(--shadow-md);
  padding: 24px; width: 100%; max-width: 420px;
  display: flex; flex-direction: column; gap: 16px;
}
.modal-header { display: flex; align-items: center; justify-content: space-between; }
.modal-header h3 { margin: 0; font-size: 16px; }
.close-btn { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--text); }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 500; color: var(--text-h); }
.form-group input, .form-group select {
  border: 1px solid var(--border); border-radius: 8px;
  padding: 9px 12px; font-size: 14px; background: var(--bg);
  color: var(--text-h); outline: none; transition: border-color 0.15s;
}
.form-group input:focus, .form-group select:focus { border-color: var(--accent); }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.form-error { font-size: 13px; color: #dc2626; margin: 0; }
.state-msg { text-align: center; color: var(--text); padding: 40px 0; }
.state-msg.error { color: #dc2626; }
</style>
