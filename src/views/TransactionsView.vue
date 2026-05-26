<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../services/api'

const transactions = ref([])
const accounts     = ref([])
const categories   = ref([])
const loading      = ref(false)
const errorMsg     = ref('')

const filters = reactive({ type: '', categoryId: '', accountId: '' })

const showModal  = ref(false)
const modalMode  = ref('create')
const modalError = ref('')
const saving     = ref(false)
const editingId  = ref(null)

const exportingCsv = ref(false)

const emptyForm = () => ({ type: 'gasto', amount: '', categoryId: '', accountId: '', date: '' })
const form      = reactive(emptyForm())

const TYPES = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'gasto',   label: 'Gasto'   },
]

const fetchData = async () => {
  loading.value  = true
  errorMsg.value = ''
  try {
    const params = {}
    if (filters.type)       params.type       = filters.type
    if (filters.categoryId) params.categoryId = filters.categoryId
    if (filters.accountId)  params.accountId  = filters.accountId

    const [txRes, accRes, catRes] = await Promise.all([
      api.get('/api/transactions', { params }),
      api.get('/api/accounts'),
      api.get('/api/categories'),
    ])
    transactions.value = txRes.data.data  || []
    accounts.value     = accRes.data.data || []
    categories.value   = catRes.data.data || []
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al cargar datos.'
  } finally {
    loading.value = false
  }
}

const exportCsv = async () => {
  exportingCsv.value = true
  try {
    const params = {}
    if (filters.type)       params.type       = filters.type
    if (filters.categoryId) params.categoryId = filters.categoryId
    if (filters.accountId)  params.accountId  = filters.accountId

    const response = await api.get('/api/transactions/export', { params, responseType: 'blob' })

    const url  = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href  = url
    link.setAttribute('download', 'transacciones.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    errorMsg.value = 'Error al exportar CSV.'
  } finally {
    exportingCsv.value = false
  }
}

const openCreate = () => {
  modalMode.value  = 'create'
  modalError.value = ''
  editingId.value  = null
  Object.assign(form, emptyForm())
  showModal.value  = true
}

const openEdit = (tx) => {
  modalMode.value  = 'edit'
  modalError.value = ''
  editingId.value  = tx.id
  Object.assign(form, { type: tx.type, amount: tx.amount, categoryId: tx.categoryId || '', accountId: tx.accountId || '', date: tx.date || '' })
  showModal.value  = true
}

const closeModal = () => { if (saving.value) return; showModal.value = false }

const save = async () => {
  modalError.value = ''
  if (!form.amount || !form.accountId || !form.categoryId || !form.date) {
    modalError.value = 'Todos los campos son requeridos.'
    return
  }
  saving.value = true
  try {
    const payload = { ...form, amount: Number(form.amount) }
    if (modalMode.value === 'create') await api.post('/api/transactions', payload)
    else                              await api.put(`/api/transactions/${editingId.value}`, payload)
    showModal.value = false
    await fetchData()
  } catch (err) {
    modalError.value = err.response?.data?.message || 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

const remove = async (tx) => {
  if (!confirm('¿Eliminar esta transacción?')) return
  try {
    await api.delete(`/api/transactions/${tx.id}`)
    await fetchData()
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al eliminar.'
  }
}

const fmt          = (n)  => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)
const categoryName = (id) => categories.value.find((c) => c.id === id)?.name || '-'
const accountName  = (id) => accounts.value.find((a) => a.id === id)?.name   || '-'

onMounted(fetchData)
</script>

<template>
  <div class="tx-page">

    <div class="page-header">
      <div>
        <h2>Transacciones</h2>
        <p class="page-sub">Registra y administra tus movimientos</p>
      </div>
      <div class="header-actions">
        <button class="btn-ghost" @click="exportCsv" :disabled="exportingCsv">
          {{ exportingCsv ? 'Exportando...' : 'Exportar CSV' }}
        </button>
        <button class="btn-primary" @click="openCreate">+ Nueva transacción</button>
      </div>
    </div>

    <div class="card filters-card">
      <div class="filters-grid">
        <div class="field">
          <label>Tipo</label>
          <select v-model="filters.type">
            <option value="">Todos</option>
            <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div class="field">
          <label>Categoría</label>
          <select v-model="filters.categoryId">
            <option value="">Todas</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>Cuenta</label>
          <select v-model="filters.accountId">
            <option value="">Todas</option>
            <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
          </select>
        </div>
      </div>
      <div class="filters-actions">
        <button class="btn-ghost" @click="Object.assign(filters, { type: '', categoryId: '', accountId: '' }); fetchData()">Limpiar</button>
        <button class="btn-primary" @click="fetchData">Buscar</button>
      </div>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <div v-if="loading" class="state-box">
      <span class="spinner"></span>
      <p>Cargando transacciones…</p>
    </div>

    <div v-else-if="!transactions.length" class="state-box card">
      <p class="empty-icon">↕</p>
      <p>No hay transacciones registradas.</p>
      <button class="btn-primary" @click="openCreate">Registrar primera transacción</button>
    </div>

    <div v-else class="card table-card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Cuenta</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in transactions" :key="tx.id">
              <td>{{ tx.date || '-' }}</td>
              <td>
                <span class="badge" :class="tx.type === 'ingreso' ? 'badge-green' : 'badge-red'">
                  {{ tx.type }}
                </span>
              </td>
              <td>{{ categoryName(tx.categoryId) }}</td>
              <td>{{ accountName(tx.accountId) }}</td>
              <td class="tx-amount" :class="tx.type === 'ingreso' ? 'pos' : 'neg'">{{ fmt(tx.amount) }}</td>
              <td>
                <div class="row-actions">
                  <button class="btn-ghost" @click="openEdit(tx)">Editar</button>
                  <button class="btn-ghost btn-ghost-danger" @click="remove(tx)">Eliminar</button>
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
            <h3>{{ modalMode === 'create' ? 'Nueva transacción' : 'Editar transacción' }}</h3>
            <button class="close-btn" @click="closeModal" :disabled="saving">✕</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Tipo *</label>
              <select v-model="form.type" :disabled="saving">
                <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div class="field">
              <label>Monto *</label>
              <input v-model.number="form.amount" type="number" min="0.01" step="0.01" placeholder="0.00" :disabled="saving" />
            </div>
            <div class="field">
              <label>Categoría *</label>
              <select v-model="form.categoryId" :disabled="saving">
                <option value="">Selecciona una categoría</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="field">
              <label>Cuenta *</label>
              <select v-model="form.accountId" :disabled="saving">
                <option value="">Selecciona una cuenta</option>
                <option v-for="a in accounts" :key="a.id" :value="a.id">{{ a.name }}</option>
              </select>
            </div>
            <div class="field">
              <label>Fecha *</label>
              <input v-model="form.date" type="date" :disabled="saving" />
            </div>
            <p v-if="modalError" class="error-msg">{{ modalError }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="closeModal" :disabled="saving">Cancelar</button>
            <button class="btn-primary" @click="save" :disabled="saving">
              {{ saving ? 'Guardando...' : modalMode === 'create' ? 'Crear' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.tx-page         { display: flex; flex-direction: column; gap: 20px; }
.filters-card    { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.filters-grid    { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.filters-actions { display: flex; justify-content: flex-end; gap: 10px; }
.header-actions  { display: flex; gap: 10px; align-items: center; }
.tx-amount       { font-family: var(--mono); font-size: 13px; font-weight: 600; }
.pos { color: #16a34a; }
.neg { color: #dc2626; }
</style>