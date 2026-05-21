<script setup>
import { ref, reactive, onMounted } from 'vue'
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

const fmt       = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)
const typeLabel = (t) => TYPES.find((x) => x.value === t)?.label || t

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
              <th>Moneda</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="acc in accounts" :key="acc.id">
              <td class="acc-name">{{ acc.name }}</td>
              <td><span class="badge badge-gray">{{ typeLabel(acc.type) }}</span></td>
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
.acc-name      { font-weight: 500; }
.acc-balance   { font-family: var(--mono); font-size: 13px; }

@media (max-width: 768px) { th:nth-child(4), td:nth-child(4) { display: none; } }
@media (max-width: 560px) { th:nth-child(3), td:nth-child(3) { display: none; } }
</style>