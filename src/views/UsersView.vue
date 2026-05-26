<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

const auth   = useAuthStore()
const users  = ref([])
const loading  = ref(false)
const errorMsg = ref('')

const showModal  = ref(false)
const modalMode  = ref('create')
const modalError = ref('')
const saving     = ref(false)
const editingId  = ref(null)
const togglingId = ref(null)

const ROLES = [
  { value: 'admin', label: 'Admin'   },
  { value: 'user',  label: 'Usuario' },
]

const emptyForm = () => ({ name: '', email: '', password: '', role: 'user' })
const form      = reactive(emptyForm())

// Solo admins pueden gestionar usuarios
const isAdmin = auth.user?.role === 'admin'

const fetchUsers = async () => {
  loading.value  = true
  errorMsg.value = ''
  try {
    const { data } = await api.get('/api/users')
    users.value = data.data ?? []
  } catch (err) {
    errorMsg.value = err.response?.data?.message ?? 'Error al cargar usuarios.'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  if (!isAdmin) return
  modalMode.value  = 'create'
  modalError.value = ''
  editingId.value  = null
  Object.assign(form, emptyForm())
  showModal.value  = true
}

const openEdit = (u) => {
  if (!isAdmin) return
  modalMode.value  = 'edit'
  modalError.value = ''
  editingId.value  = u.id
  form.name     = u.name ?? ''
  form.email    = u.email
  form.password = ''
  form.role     = u.role ?? 'user'
  showModal.value  = true
}

const closeModal = () => { if (!saving.value) showModal.value = false }

const save = async () => {
  modalError.value = ''
  if (!form.email.trim())               { modalError.value = 'El email es requerido.'; return }
  if (modalMode.value === 'create' && !form.password) { modalError.value = 'La contraseña es requerida.'; return }

  saving.value = true
  try {
    const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role }
    if (form.password) payload.password = form.password

    if (modalMode.value === 'create') await api.post('/api/users',               payload)
    else                              await api.put(`/api/users/${editingId.value}`, payload)
    showModal.value = false
    await fetchUsers()
  } catch (err) {
    modalError.value = err.response?.data?.message ?? 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

const toggleStatus = async (u) => {
  if (!isAdmin) return
  togglingId.value = u.id
  const newStatus  = u.status === 'active' ? 'inactive' : 'active'
  try {
    await api.patch(`/api/users/${u.id}/status`, { status: newStatus })
    u.status = newStatus
  } catch (err) {
    errorMsg.value = err.response?.data?.message ?? 'Error al cambiar el estado.'
  } finally {
    togglingId.value = null
  }
}

const roleLabel = (r) => ROLES.find((x) => x.value === r)?.label ?? r

onMounted(fetchUsers)
</script>

<template>
  <div class="users-page">

    <div class="page-header">
      <div>
        <h2>Usuarios</h2>
        <p class="page-sub">Administra los usuarios del sistema</p>
      </div>
      <button v-if="isAdmin" class="btn-primary" @click="openCreate">+ Nuevo usuario</button>
    </div>

    <div v-if="!isAdmin" class="notice-card card">
      🔒 Solo los administradores pueden gestionar usuarios. Puedes consultar la lista.
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <div v-if="loading" class="state-box">
      <span class="spinner"></span>
      <p>Cargando usuarios…</p>
    </div>

    <div v-else-if="!users.length" class="state-box card">
      <p class="empty-icon">👥</p>
      <p>No hay usuarios registrados.</p>
      <button v-if="isAdmin" class="btn-primary" @click="openCreate">Crear primer usuario</button>
    </div>

    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th v-if="isAdmin">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td class="u-name">{{ u.name || '—' }}</td>
              <td>{{ u.email }}</td>
              <td>
                <span class="badge" :class="u.role === 'admin' ? 'badge-gray' : ''">
                  {{ roleLabel(u.role) }}
                </span>
              </td>
              <td>
                <span class="badge" :class="u.status === 'active' ? 'badge-green' : 'badge-red'">
                  {{ u.status === 'active' ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td v-if="isAdmin">
                <div class="row-actions">
                  <button class="btn-ghost" @click="openEdit(u)">Editar</button>
                  <button
                    class="btn-ghost"
                    :class="u.status === 'active' ? 'btn-ghost-danger' : ''"
                    :disabled="togglingId === u.id || u.id === auth.user?.id"
                    @click="toggleStatus(u)"
                  >
                    {{ togglingId === u.id ? '…' : u.status === 'active' ? 'Desactivar' : 'Activar' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>{{ modalMode === 'create' ? 'Nuevo usuario' : 'Editar usuario' }}</h3>
            <button class="close-btn" @click="closeModal" :disabled="saving">✕</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Nombre</label>
              <input v-model="form.name" type="text" placeholder="Nombre completo" :disabled="saving" />
            </div>
            <div class="field">
              <label>Email *</label>
              <input v-model="form.email" type="email" placeholder="correo@ejemplo.com" :disabled="saving" @keyup.enter="save" />
            </div>
            <div class="field">
              <label>Contraseña {{ modalMode === 'edit' ? '(dejar vacío para no cambiar)' : '*' }}</label>
              <input v-model="form.password" type="password" placeholder="••••••••" :disabled="saving" />
            </div>
            <div class="field">
              <label>Rol *</label>
              <select v-model="form.role" :disabled="saving">
                <option v-for="r in ROLES" :key="r.value" :value="r.value">{{ r.label }}</option>
              </select>
            </div>
            <p v-if="modalError" class="error-msg">{{ modalError }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="closeModal" :disabled="saving">Cancelar</button>
            <button class="btn-primary" @click="save" :disabled="saving">
              {{ saving ? 'Guardando…' : modalMode === 'create' ? 'Crear usuario' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.users-page { display: flex; flex-direction: column; gap: 20px; }
.u-name     { font-weight: 500; }
.notice-card { padding: 16px 20px; font-size: 14px; color: var(--text); }

.field input, .field select {
  padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;
  background: var(--bg); color: var(--text-h); font-size: 14px; outline: none;
  transition: border-color .2s; width: 100%;
}
.field input:focus, .field select:focus { border-color: var(--accent); }

.state-box { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; color: var(--text); font-size: 14px; }
.empty-icon { font-size: 40px; margin: 0; }
.spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) { th:nth-child(2), td:nth-child(2) { display: none; } }
</style>
