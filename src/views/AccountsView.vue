<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { onMounted } from 'vue'
import api from '../services/api'

// Tasas de cambio (espejo del backend) 
const RATES = {
  MXN: 1, USD: 17.50, EUR: 19.20, GBP: 22.10, JPY: 0.12,
  PEN: 4.70, CAD: 13.00, BRL: 3.50, ARS: 0.02, COP: 0.0044, CLP: 0.019,
}
const CURRENCIES = [
  { code: 'MXN', name: 'Peso Mexicano' },
  { code: 'USD', name: 'Dólar Americano' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'Libra Esterlina' },
  { code: 'JPY', name: 'Yen Japonés' },
  { code: 'PEN', name: 'Sol Peruano' },
  { code: 'CAD', name: 'Dólar Canadiense' },
  { code: 'BRL', name: 'Real Brasileño' },
  { code: 'ARS', name: 'Peso Argentino' },
  { code: 'COP', name: 'Peso Colombiano' },
  { code: 'CLP', name: 'Peso Chileno' },
]

const convertToMXN   = (amount, currency) => (RATES[currency] ?? 1) * Number(amount)
const convertBetween = (amount, from, to) => {
  if (from === to) return Number(amount)
  return (Number(amount) * (RATES[from] ?? 1)) / (RATES[to] ?? 1)
}

// Estado 
const accounts = ref([])
const loading  = ref(false)
const errorMsg = ref('')

// Modal cuenta 
const showModal  = ref(false)
const modalMode  = ref('create')
const modalError = ref('')
const saving     = ref(false)
const editingId  = ref(null)

const TYPES = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'banco',    label: 'Banco' },
  { value: 'tarjeta',  label: 'Tarjeta' },
]

const emptyForm = () => ({ name: '', type: 'efectivo', initialBalance: 0, currency: 'MXN' })
const form      = reactive(emptyForm())

// Modal transferencia 
const showTransfer  = ref(false)
const transferError = ref('')
const transferring  = ref(false)
const transferResult = ref(null)

const emptyTransfer = () => ({
  fromAccountId: '',
  toAccountId:   '',
  amount:        '',
  description:   '',
  date:          new Date().toISOString().slice(0, 10),
})
const transferForm = reactive(emptyTransfer())

// Vista previa de conversión
const transferPreview = computed(() => {
  if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount) return null
  const from = accounts.value.find((a) => a.id === transferForm.fromAccountId)
  const to   = accounts.value.find((a) => a.id === transferForm.toAccountId)
  if (!from || !to || transferForm.fromAccountId === transferForm.toAccountId) return null

  const fromCur = (from.currency || 'MXN').toUpperCase()
  const toCur   = (to.currency   || 'MXN').toUpperCase()
  const amt     = Number(transferForm.amount)
  if (isNaN(amt) || amt <= 0) return null

  const converted = convertBetween(amt, fromCur, toCur)
  const rate      = (RATES[fromCur] ?? 1) / (RATES[toCur] ?? 1)
  return { fromCur, toCur, fromAmt: amt, toAmt: converted, rate }
})

// Carga datos 
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

// CRUD cuenta 
const openCreate = () => {
  modalMode.value  = 'create'
  modalError.value = ''
  editingId.value  = null
  Object.assign(form, emptyForm())
  showModal.value  = true
}

const openEdit = (acc) => {
  modalMode.value  = 'edit'
  modalError.value = ''
  editingId.value  = acc.id
  Object.assign(form, {
    name:           acc.name,
    type:           acc.type,
    initialBalance: acc.initialBalance,
    currency:       acc.currency || 'MXN',
  })
  showModal.value = true
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

// Transferencia 
const openTransfer = (acc) => {
  transferError.value  = ''
  transferResult.value = null
  Object.assign(transferForm, emptyTransfer())
  if (acc) transferForm.fromAccountId = acc.id
  showTransfer.value = true
}

const closeTransfer = () => { if (transferring.value) return; showTransfer.value = false }

// Resetear cuenta destino si es igual a la origen
watch(() => transferForm.fromAccountId, () => {
  if (transferForm.toAccountId === transferForm.fromAccountId) transferForm.toAccountId = ''
})

const executeTransfer = async () => {
  transferError.value  = ''
  transferResult.value = null

  if (!transferForm.fromAccountId || !transferForm.toAccountId)
    { transferError.value = 'Selecciona la cuenta de origen y destino.'; return }
  if (transferForm.fromAccountId === transferForm.toAccountId)
    { transferError.value = 'Las cuentas no pueden ser la misma.'; return }
  if (!transferForm.amount || Number(transferForm.amount) <= 0)
    { transferError.value = 'El monto debe ser mayor a 0.'; return }

  transferring.value = true
  try {
    const { data } = await api.post('/api/accounts/transfer', {
      fromAccountId: transferForm.fromAccountId,
      toAccountId:   transferForm.toAccountId,
      amount:        Number(transferForm.amount),
      description:   transferForm.description.trim(),
      date:          transferForm.date,
    })
    transferResult.value = data.data
    await fetchAccounts()
  } catch (err) {
    transferError.value = err.response?.data?.message || 'Error al realizar la transferencia.'
  } finally {
    transferring.value = false
  }
}

// Helpers
const currentBalance = (acc) => acc.balance ?? acc.initialBalance ?? 0

// Saldo consolidado en MXN (convierte cada cuenta a MXN antes de sumar)
const totalBalanceMXN = computed(() =>
  accounts.value
    .filter((a) => a.status === 'active')
    .reduce((sum, a) => sum + convertToMXN(currentBalance(a), (a.currency || 'MXN').toUpperCase()), 0)
)
const activeCount = computed(() => accounts.value.filter((a) => a.status === 'active').length)

// Formatear monto en la moneda de la cuenta
const fmtCurrency = (n, currency = 'MXN') => {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency.toUpperCase() }).format(n ?? 0)
  } catch {
    return `${currency} ${Number(n ?? 0).toFixed(2)}`
  }
}
const fmtMXN    = (n) => fmtCurrency(n, 'MXN')
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
      <div class="header-actions">
        <button class="btn-ghost" @click="openTransfer(null)">⇄ Transferir</button>
        <button class="btn-primary" @click="openCreate">+ Nueva cuenta</button>
      </div>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <!-- Resumen -->
    <div v-if="accounts.length" class="summary-bar">
      <div class="card summary-card">
        <span class="summary-label">Saldo consolidado en MXN (cuentas activas)</span>
        <span class="summary-value">{{ fmtMXN(totalBalanceMXN) }}</span>
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
              <td class="acc-balance mono current">
                {{ fmtCurrency(currentBalance(acc), acc.currency || 'MXN') }}
              </td>
              <td>
                <span class="currency-tag">{{ acc.currency || 'MXN' }}</span>
              </td>
              <td>
                <span class="badge" :class="acc.status === 'active' ? 'badge-green' : 'badge-red'">
                  {{ acc.status === 'active' ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                  <button class="btn-ghost" @click="openTransfer(acc)" :disabled="acc.status !== 'active'">Transferir</button>
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

    <!-- Modal: Crear / Editar cuenta -->
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
              <label>Moneda *</label>
              <select v-model="form.currency" :disabled="saving">
                <option v-for="c in CURRENCIES" :key="c.code" :value="c.code">
                  {{ c.code }} — {{ c.name }}
                </option>
              </select>
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

    <!-- ══ Modal: Transferencia ══ -->
    <Teleport to="body">
      <div v-if="showTransfer" class="modal-backdrop" @click.self="closeTransfer">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>Transferir fondos</h3>
            <button class="close-btn" @click="closeTransfer" :disabled="transferring">✕</button>
          </div>
          <div class="modal-body">

            <!-- Resultado exitoso -->
            <template v-if="transferResult">
              <div class="transfer-success">
                <span class="ts-icon">✅</span>
                <p class="ts-title">Transferencia realizada</p>
                <div class="ts-detail">
                  <span>{{ transferResult.fromAccount }}</span>
                  <span class="ts-arrow">→</span>
                  <span>{{ transferResult.toAccount }}</span>
                </div>
                <div class="ts-amounts">
                  <span class="ts-from">
                    {{ fmtCurrency(transferResult.fromAmount, transferResult.fromCurrency) }}
                  </span>
                  <span class="ts-eq">≈</span>
                  <span class="ts-to">
                    {{ fmtCurrency(transferResult.toAmount, transferResult.toCurrency) }}
                  </span>
                </div>
                <p v-if="transferResult.fromCurrency !== transferResult.toCurrency" class="ts-rate">
                  Tipo de cambio: 1 {{ transferResult.fromCurrency }} = {{ transferResult.exchangeRate }} {{ transferResult.toCurrency }}
                </p>
              </div>
              <div class="modal-footer" style="border:none; padding-top:0">
                <button class="btn-primary" @click="Object.assign(transferForm, emptyTransfer()); transferResult = null">
                  Nueva transferencia
                </button>
                <button class="btn-ghost" @click="closeTransfer">Cerrar</button>
              </div>
            </template>

            <!-- Formulario -->
            <template v-else>
              <div class="field">
                <label>Cuenta origen *</label>
                <select v-model="transferForm.fromAccountId" :disabled="transferring">
                  <option value="">Selecciona cuenta origen</option>
                  <option
                    v-for="a in accounts.filter(a => a.status === 'active')"
                    :key="a.id"
                    :value="a.id"
                  >
                    {{ a.name }} ({{ a.currency || 'MXN' }}) — {{ fmtCurrency(currentBalance(a), a.currency || 'MXN') }}
                  </option>
                </select>
              </div>

              <div class="field">
                <label>Monto a transferir *</label>
                <input
                  v-model.number="transferForm.amount"
                  type="number" min="0.01" step="0.01"
                  placeholder="0.00"
                  :disabled="transferring"
                />
              </div>

              <div class="field">
                <label>Cuenta destino *</label>
                <select v-model="transferForm.toAccountId" :disabled="transferring">
                  <option value="">Selecciona cuenta destino</option>
                  <option
                    v-for="a in accounts.filter(a => a.status === 'active' && a.id !== transferForm.fromAccountId)"
                    :key="a.id"
                    :value="a.id"
                  >
                    {{ a.name }} ({{ a.currency || 'MXN' }}) — {{ fmtCurrency(currentBalance(a), a.currency || 'MXN') }}
                  </option>
                </select>
              </div>

              <!-- Vista previa de conversión -->
              <div v-if="transferPreview" class="conversion-preview">
                <template v-if="transferPreview.fromCur !== transferPreview.toCur">
                  <span class="cp-label">Conversión automática</span>
                  <div class="cp-amounts">
                    <span class="cp-from">{{ fmtCurrency(transferPreview.fromAmt, transferPreview.fromCur) }}</span>
                    <span class="cp-arrow">→</span>
                    <span class="cp-to">{{ fmtCurrency(transferPreview.toAmt, transferPreview.toCur) }}</span>
                  </div>
                  <span class="cp-rate">
                    1 {{ transferPreview.fromCur }} = {{ transferPreview.rate.toFixed(4) }} {{ transferPreview.toCur }}
                  </span>
                </template>
                <template v-else>
                  <span class="cp-label cp-same">Misma moneda — sin conversión</span>
                </template>
              </div>

              <div class="field">
                <label>Descripción (opcional)</label>
                <input v-model="transferForm.description" type="text" placeholder="Ej. Pago de renta" :disabled="transferring" maxlength="120" />
              </div>

              <div class="field">
                <label>Fecha *</label>
                <input v-model="transferForm.date" type="date" :disabled="transferring" />
              </div>

              <p v-if="transferError" class="error-msg">{{ transferError }}</p>

              <div class="modal-footer" style="border:none; padding: 4px 0 0">
                <button class="btn-ghost" @click="closeTransfer" :disabled="transferring">Cancelar</button>
                <button class="btn-primary" @click="executeTransfer" :disabled="transferring">
                  {{ transferring ? 'Transfiriendo…' : 'Confirmar transferencia' }}
                </button>
              </div>
            </template>

          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.accounts-page  { display: flex; flex-direction: column; gap: 20px; }
.header-actions { display: flex; gap: 10px; align-items: center; }

/* Summary */
.summary-bar   { display: flex; gap: 16px; flex-wrap: wrap; }
.summary-card  { display: flex; flex-direction: column; gap: 4px; padding: 16px 22px; min-width: 200px; }
.summary-label { font-size: 12px; color: var(--text); }
.summary-value { font-size: 22px; font-weight: 700; color: var(--accent); }
.secondary-val { color: var(--text-h); }

/* Table */
.acc-name      { font-weight: 500; }
.acc-type-icon { font-size: 16px; margin-right: 6px; }
.mono          { font-family: var(--mono); font-size: 13px; }
.current       { color: var(--accent); font-weight: 600; }
.currency-tag  {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 99px;
  background: var(--accent-bg);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
}

/* States */
.state-box  { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; color: var(--text); font-size: 14px; }
.empty-icon { font-size: 40px; margin: 0; }
.spinner    { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Conversion preview */
.conversion-preview {
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 10px;
  padding: 12px 16px;
  display: flex; flex-direction: column; gap: 4px;
}
.cp-label   { font-size: 11px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: .05em; }
.cp-same    { color: var(--text); }
.cp-amounts { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; }
.cp-from    { color: var(--text-h); }
.cp-arrow   { color: var(--accent); font-size: 18px; }
.cp-to      { color: #16a34a; }
.cp-rate    { font-size: 11px; color: var(--text); }

/* Transfer success */
.transfer-success {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; padding: 16px 0; text-align: center;
}
.ts-icon   { font-size: 40px; }
.ts-title  { font-size: 16px; font-weight: 700; color: var(--text-h); margin: 0; }
.ts-detail { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text); }
.ts-arrow  { color: var(--accent); font-size: 18px; }
.ts-amounts { display: flex; align-items: center; gap: 12px; font-size: 18px; font-weight: 700; }
.ts-from   { color: #dc2626; }
.ts-eq     { color: var(--text); font-size: 20px; }
.ts-to     { color: #16a34a; }
.ts-rate   { font-size: 12px; color: var(--text); margin: 0; }

@media (max-width: 700px) {
  th:nth-child(2), td:nth-child(2) { display: none; }
}
@media (max-width: 560px) {
  th:nth-child(4), td:nth-child(4) { display: none; }
}
</style>