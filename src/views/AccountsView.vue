<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '../services/api'

const accounts = ref([])
const loading  = ref(false)
const errorMsg = ref('')

const showModal  = ref(false)
const modalMode  = ref('create')
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

const openCreate = () => {
  modalMode.value  = 'create'
  modalError.value = ''
  editingId.value  = null
  Object.assign(form, emptyForm())
  showModal.value  = true
}

const openEdit = (acc) => {
  modalMode.value     = 'edit'
  modalError.value    = ''
  editingId.value     = acc.id
  form.name           = acc.name
  form.type           = acc.type
  form.initialBalance = acc.initialBalance
  form.currency       = acc.currency || 'MXN'
  showModal.value     = true
}

const closeModal = () => { if (saving.value) return; showModal.value = false }

const saveAccount = async () => {
  modalError.value = ''
  if (!form.name.trim()) { modalError.value = 'El nombre es requerido.'; return }
  if (!form.type)        { modalError.value = 'El tipo es requerido.'; return }

  saving.value = true
  try {
    const payload = {
      name:           form.name.trim(),
      type:           form.type,
      initialBalance: Number(form.initialBalance) || 0,
      currency:       form.currency || 'MXN',
    }
    if (modalMode.value === 'create') await api.post('/api/accounts', payload)
    else                              await api.put(`/api/accounts/${editingId.value}`, payload)
    showModal.value = false
    await fetchAccounts()
  } catch (err) {
    modalError.value = err.response?.data?.message || 'Error al guardar la cuenta.'
  } finally {
    saving.value = false
  }
}

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

const currentBalance = (acc) => acc.balance ?? acc.initialBalance ?? 0

const totalBalance = computed(() =>
  accounts.value
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + currentBalance(a), 0)
)
const activeCount = computed(() => accounts.value.filter((a) => a.status === 'active').length)

const fmt       = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)
const typeLabel = (t) => TYPES.find((x) => x.value === t)?.label || t
const typeIcon  = (t) => t === 'efectivo' ? '💵' : t === 'tarjeta' ? '💳' : '🏦'

onMounted(fetchAccounts)
</script>

<template>
  <div class="accounts-page">

    <div class="page-header">
      <div>
        <h2>Cuentas</h2>
        <p class="page-sub">Administra tus cuentas financieras</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Nueva cuenta</button>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <!-- Summary bar -->
    <div v-if="accounts.length" class="summary-bar">
      <div class="card summary-card">
        <span class="summary-label">Saldo consolidado (cuentas activas)</span>
        <span class="summary-value">{{ fmt(totalBalance) }}</span>
      </div>
      <div class="card summary-card secondary">
        <span class="summary-label">Cuentas activas</span>
        <span class="summary-value secondary-val">{{ activeCount }} / {{ accounts.length }}</span>
      </div>
    </div>

    <div v-if="loading" class="state-box">
      <span class="spinner"></span>
      <p>Cargando cuentas…</p>
    </div>

    <div v-else-if="!accounts.length" class="state-box card">
      <p class="empty-icon">🏦</p>
      <p>No tienes cuentas registradas.</p>
      <button class="btn-primary" @click="openCreate">Crear primera cuenta</button>
    </div>

    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Saldo inicial</th>
              <th>Saldo actual</th>
              <th>Moneda</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="acc in accounts" :key="acc.id">
              <td class="acc-name">
                <span class="acc-type-icon">{{ typeIcon(acc.type) }}</span>
                {{ acc.name }}
              </td>
              <td><span class="badge badge-gray">{{ typeLabel(acc.type) }}</span></td>
              <td class="acc-balance mono">{{ fmt(acc.initialBalance) }}</td>
              <td class="acc-balance mono current">{{ fmt(currentBalance(acc)) }}</td>
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
              <input v-model="form.name" type="text" placeholder="Ej. Cuenta nómina" :disabled="saving" @keyup.enter="saveAccount" />
            </div>
            <div class="field">
              <label>Tipo *</label>
              <select v-model="form.type" :disabled="saving">
                <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>Saldo inicial</label>
              <input v-model.number="form.initialBalance" type="number" min="0" step="0.01" placeholder="0.00" :disabled="saving" />
            </div>
            <div class="field">
              <label>Moneda</label>
              <input v-model="form.currency" type="text" placeholder="MXN" maxlength="3" :disabled="saving" />
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

/* Summary bar */
.summary-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 22px;
  min-width: 200px;
}
.summary-label { font-size: 12px; color: var(--text); }
.summary-value { font-size: 22px; font-weight: 700; color: var(--accent); }
.secondary-val { color: var(--text-h); }

/* Table */
.acc-name { font-weight: 500; display: flex; align-items: center; gap: 6px; }
.acc-type-icon { font-size: 16px; }
.mono { font-family: var(--mono); font-size: 13px; }
.current { color: var(--accent); font-weight: 600; }

/* States */
.state-box {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 48px 24px; color: var(--text); font-size: 14px;
}
.empty-icon { font-size: 40px; margin: 0; }
.spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  th:nth-child(5), td:nth-child(5) { display: none; }
}
@media (max-width: 700px) {
  th:nth-child(3), td:nth-child(3) { display: none; }
}
@media (max-width: 560px) {
  th:nth-child(2), td:nth-child(2) { display: none; }
}
</style>
