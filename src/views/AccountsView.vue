<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '../services/api'

// State
const accounts = ref([])
const loading  = ref(false)
const errorMsg = ref('')

// Modal 
const showModal  = ref(false)
const modalMode  = ref('create')   // 'create' | 'edit'
const modalError = ref('')
const saving     = ref(false)
const editingId  = ref(null)

const emptyForm = () => ({ name: '', type: 'efectivo', initialBalance: 0, currency: 'MXN' })
const form      = reactive(emptyForm())

const TYPES = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'banco',    label: 'Banco' },
  { value: 'tarjeta',  label: 'Tarjeta' },
]

// Fetch 
const fetchAccounts = async () => {
  errorMsg.value = ''
  loading.value  = true
  try {
    const { data } = await api.get('/api/accounts')
    accounts.value = data.data || []
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al cargar las cuentas.'
  } finally {
    loading.value = false
  }
}

// Modal helpers 
const openCreate = () => {
  modalMode.value  = 'create'
  modalError.value = ''
  editingId.value  = null
  Object.assign(form, emptyForm())
  showModal.value  = true
}

const openEdit = (acc) => {
  modalMode.value        = 'edit'
  modalError.value       = ''
  editingId.value        = acc.id
  form.name              = acc.name
  form.type              = acc.type
  form.initialBalance    = acc.initialBalance
  form.currency          = acc.currency || 'MXN'
  showModal.value        = true
}

const closeModal = () => {
  if (saving.value) return
  showModal.value = false
}

// Save 
const saveAccount = async () => {
  modalError.value = ''
  if (!form.name.trim()) { modalError.value = 'El nombre es requerido.'; return }
  if (!form.type)        { modalError.value = 'El tipo es requerido.'; return }

  saving.value = true
  try {
    if (modalMode.value === 'create') {
      await api.post('/api/accounts', {
        name:           form.name.trim(),
        type:           form.type,
        initialBalance: Number(form.initialBalance) || 0,
        currency:       form.currency || 'MXN',
      })
    } else {
      await api.put(`/api/accounts/${editingId.value}`, {
        name:           form.name.trim(),
        type:           form.type,
        initialBalance: Number(form.initialBalance) || 0,
        currency:       form.currency || 'MXN',
      })
    }
    showModal.value = false
    await fetchAccounts()
  } catch (err) {
    modalError.value = err.response?.data?.message || 'Error al guardar la cuenta.'
  } finally {
    saving.value = false
  }
}

// Toggle status 
const togglingId = ref(null)

const toggleStatus = async (acc) => {
  togglingId.value = acc.id
  const newStatus  = acc.status === 'active' ? 'inactive' : 'active'
  try {
    await api.patch(`/api/accounts/${acc.id}/status`, { status: newStatus })
    acc.status = newStatus
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al cambiar el estado.'
  } finally {
    togglingId.value = null
  }
}

// Utils 
const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

const typeLabel = (t) => TYPES.find((x) => x.value === t)?.label || t

onMounted(fetchAccounts)
</script>

<template>
  <div class="accounts-page">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <h2>Cuentas</h2>
        <p class="page-sub">Administra tus cuentas financieras</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Nueva cuenta</button>
    </div>

    <!-- Error global -->
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <!-- Loading -->
    <div v-if="loading" class="state-box">
      <span class="spinner"></span>
      <p>Cargando cuentas…</p>
    </div>

    <!-- Empty -->
    <div v-else-if="!accounts.length" class="state-box card">
      <p class="empty-icon">🏦</p>
      <p>No tienes cuentas registradas.</p>
      <button class="btn-primary" @click="openCreate">Crear primera cuenta</button>
    </div>

    <!-- Table -->
    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Saldo inicial</th>
              <th>Moneda</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="acc in accounts" :key="acc.id">
              <td class="acc-name">{{ acc.name }}</td>
              <td>
                <span class="badge badge-gray">{{ typeLabel(acc.type) }}</span>
              </td>
              <td class="acc-balance">{{ fmt(acc.initialBalance) }}</td>
              <td>{{ acc.currency || 'MXN' }}</td>
              <td>
                <span class="badge" :class="acc.status === 'active' ? 'badge-green' : 'badge-red'">
                  {{ acc.status === 'active' ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-ghost" @click="openEdit(acc)">Editar</button>
                  <button
                    class="btn-ghost"
                    :class="acc.status === 'active' ? 'btn-ghost-danger' : ''"
                    :disabled="togglingId === acc.id"
                    @click="toggleStatus(acc)"
                  >
                    {{ togglingId === acc.id ? '...' : acc.status === 'active' ? 'Desactivar' : 'Activar' }}
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
            <h3>{{ modalMode === 'create' ? 'Nueva cuenta' : 'Editar cuenta' }}</h3>
            <button class="close-btn" @click="closeModal" :disabled="saving">✕</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label>Nombre *</label>
              <input
                v-model="form.name"
                type="text"
                placeholder="Ej. Cuenta nómina"
                :disabled="saving"
                @keyup.enter="saveAccount"
              />
            </div>

            <div class="field">
              <label>Tipo *</label>
              <select v-model="form.type" :disabled="saving">
                <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>

            <div class="field">
              <label>Saldo inicial</label>
              <input
                v-model.number="form.initialBalance"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                :disabled="saving"
              />
            </div>

            <div class="field">
              <label>Moneda</label>
              <input
                v-model="form.currency"
                type="text"
                placeholder="MXN"
                maxlength="3"
                :disabled="saving"
              />
            </div>

            <p v-if="modalError" class="error-msg">{{ modalError }}</p>
          </div>

          <div class="modal-footer">
            <button class="btn-ghost" @click="closeModal" :disabled="saving">Cancelar</button>
            <button class="btn-primary" @click="saveAccount" :disabled="saving">
              {{ saving ? 'Guardando...' : modalMode === 'create' ? 'Crear cuenta' : 'Guardar cambios' }}
            </button>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.accounts-page { display: flex; flex-direction: column; gap: 20px; }

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.page-sub { font-size: 13px; color: var(--text); margin-top: 2px; }

/* Table */
.table-card { padding: 0; overflow: hidden; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--text-h);
  vertical-align: middle;
}
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--accent-bg); }

.acc-name    { font-weight: 500; }
.acc-balance { font-family: var(--mono); font-size: 13px; }

.row-actions { display: flex; gap: 8px; }

/* Buttons */
.btn-primary {
  padding: 9px 18px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}
.btn-primary:hover    { background: var(--accent-soft); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-ghost {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: none;
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
  white-space: nowrap;
}
.btn-ghost:hover        { border-color: var(--accent); color: var(--accent); }
.btn-ghost:disabled     { opacity: 0.55; cursor: not-allowed; }
.btn-ghost-danger:hover { border-color: #dc2626; color: #dc2626; }

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  width: 100%;
  max-width: 440px;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border);
}
.modal-header h3 { margin: 0; }
.close-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  line-height: 1;
}
.close-btn:hover { color: var(--text-h); }

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--border);
}

/* Form fields */
.field       { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 13px; font-weight: 500; color: var(--text-h); }
.field input,
.field select {
  padding: 9px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  width: 100%;
}
.field input:focus,
.field select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }
.field input:disabled,
.field select:disabled { opacity: 0.6; }

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
  text-align: center;
}
.empty-icon { font-size: 40px; margin: 0; }

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-msg {
  font-size: 13px;
  color: #dc2626;
  margin: 0;
  padding: 10px 14px;
  background: rgba(220, 38, 38, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

@media (max-width: 768px) {
  th:nth-child(4), td:nth-child(4) { display: none; }
}
@media (max-width: 560px) {
  th:nth-child(3), td:nth-child(3) { display: none; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .btn-primary { width: 100%; }
  .modal-footer { flex-direction: column-reverse; }
  .modal-footer .btn-primary,
  .modal-footer .btn-ghost  { width: 100%; }
}
</style>
