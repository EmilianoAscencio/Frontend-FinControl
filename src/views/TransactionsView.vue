<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../services/api'
import TransactionFormModal from '../components/TransactionFormModal.vue'

const transactions = ref([])
const accounts     = ref([])
const categories   = ref([])
const loading      = ref(false)
const errorMsg     = ref('')

const filters = reactive({ type: '', categoryId: '', accountId: '' })

const showModal = ref(false)
const modalMode = ref('create')
const modalInit = ref({})
const saving    = ref(false)
const editingId = ref(null)

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

const openCreate = () => {
  modalMode.value = 'create'
  modalInit.value = {}
  showModal.value = true
}

const openEdit = (tx) => {
  modalMode.value = 'edit'
  modalInit.value = { type: tx.type, amount: tx.amount, categoryId: tx.categoryId || '', accountId: tx.accountId || '', date: tx.date || '' }
  editingId.value = tx.id
  showModal.value = true
}

const handleSubmit = async (payload) => {
  saving.value = true
  try {
    if (modalMode.value === 'create') await api.post('/api/transactions', payload)
    else                              await api.put(`/api/transactions/${editingId.value}`, payload)
    showModal.value = false
    await fetchData()
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al guardar.'
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
      <button class="btn-primary" @click="openCreate">+ Nueva transacción</button>
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

    <TransactionFormModal
      :show="showModal"
      :mode="modalMode"
      :initial="modalInit"
      :accounts="accounts"
      :categories="categories"
      :saving="saving"
      @close="showModal = false"
      @submit="handleSubmit"
    />

  </div>
</template>

<style scoped>
.tx-page         { display: flex; flex-direction: column; gap: 20px; }
.filters-card    { padding: 16px 20px; display: flex; flex-direction: column; gap: 14px; }
.filters-grid    { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.filters-actions { display: flex; justify-content: flex-end; gap: 10px; }
.tx-amount       { font-family: var(--mono); font-size: 13px; font-weight: 600; }
.pos { color: #16a34a; }
.neg { color: #dc2626; }
</style>