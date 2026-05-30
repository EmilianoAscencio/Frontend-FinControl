<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useBudgetsStore }  from '../stores/budgets'
import api                  from '../services/api'

Chart.register(...registerables)

const store      = useBudgetsStore()
const categories = ref([])

// Carga inicial 
onMounted(async () => {
  const catRes = await api.get('/api/categories').catch(() => ({ data: { data: [] } }))
  categories.value = catRes.data.data ?? []

  await store.fetchAll()
  for (const b of store.budgets) {
    store.fetchProgress(b.id)
  }
})

// Helpers 
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const catName = (id) => categories.value.find((c) => c.id === id)?.name ?? id
const catIcon = (id) => categories.value.find((c) => c.id === id)?.icon ?? '📦'

const formatPeriod = (month) => {
  if (!month) return ''
  const [yr, mo] = month.split('-')
  return `${MONTHS[Number(mo) - 1]} ${yr}`
}

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

// Devuelve color hex según % consumido
const barColor = (pct) => {
  if (pct >= 100) return '#dc2626'
  if (pct >= 80)  return '#ea580c'
  if (pct >= 60)  return '#ca8a04'
  return '#16a34a'
}

const statusLabel = (pct, exceeded) => {
  if (exceeded || pct >= 100) return 'Excedido'
  if (pct >= 80)              return 'En riesgo'
  if (pct >= 60)              return 'Atención'
  return 'En control'
}

// Presupuestos enriquecidos con datos de progreso
const enriched = computed(() =>
  store.budgets.map((b) => {
    const prog = store.progress[b.id]
    return {
      ...b,
      displayName: b.name || catName(b.categoryId),
      catLabel:    catName(b.categoryId),
      spent:       prog?.spent      ?? 0,
      remaining:   prog?.remaining  ?? b.limitAmount,
      percentage:  prog?.percentage ?? 0,
      exceeded:    prog?.exceeded   ?? false,
    }
  })
)

// Formulario 
const showModal  = ref(false)
const modalMode  = ref('create')
const editingId  = ref(null)
const modalError = ref('')
const saving     = ref(false)
const togglingId = ref(null)

const today = new Date()
const emptyForm = () => ({
  name:       '',
  categoryId: '',
  amount:     '',
  month:      today.getMonth() + 1,
  year:       today.getFullYear(),
})
const form = ref(emptyForm())

const openCreate = () => {
  modalMode.value  = 'create'
  editingId.value  = null
  modalError.value = ''
  form.value       = emptyForm()
  showModal.value  = true
}

const openEdit = (b) => {
  modalMode.value  = 'edit'
  editingId.value  = b.id
  modalError.value = ''
  const [yr, mo] = (b.month || '-').split('-')
  form.value = {
    name:       b.name || '',
    categoryId: b.categoryId,
    amount:     b.limitAmount,
    month:      Number(mo),
    year:       Number(yr),
  }
  showModal.value  = true
}

const closeModal = () => { if (!saving.value) showModal.value = false }

const saveBudget = async () => {
  modalError.value = ''
  if (!form.value.categoryId || !form.value.amount || !form.value.month || !form.value.year) {
    modalError.value = 'Todos los campos son requeridos.'
    return
  }
  if (Number(form.value.amount) <= 0) {
    modalError.value = 'El monto debe ser mayor a cero.'
    return
  }
  saving.value = true
  try {
    const monthStr = `${form.value.year}-${String(form.value.month).padStart(2, '0')}`
    const payload = {
      categoryId:  form.value.categoryId,
      limitAmount: Number(form.value.amount),
      month:       monthStr,
      name:        form.value.name?.trim() || undefined,
    }
    if (modalMode.value === 'create') {
      const created = await store.create(payload)
      store.fetchProgress(created.id)
    } else {
      await store.update(editingId.value, payload)
      store.fetchProgress(editingId.value)
    }
    showModal.value = false
  } catch (err) {
    modalError.value = err.response?.data?.message ?? 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

const remove = async (id) => {
  if (!confirm('¿Eliminar este presupuesto?')) return
  togglingId.value = id
  try   { await store.remove(id) }
  catch { store.error = 'Error al eliminar.' }
  finally { togglingId.value = null }
}

// Solo categorías de gasto para presupuestos
const expenseCategories = computed(() => categories.value.filter((c) => c.type === 'expense' || c.type === 'gasto'))

// Detail modal
const detailOpen    = ref(false)
const detailBudget  = ref(null)
const detailTx      = ref([])
const detailLoading = ref(false)
const donutRef      = ref(null)
let donutChart      = null

const closeDetail = () => {
  detailOpen.value = false
  if (donutChart) { donutChart.destroy(); donutChart = null }
}

const buildDonut = () => {
  if (!donutRef.value || !detailBudget.value) return
  if (donutChart) { donutChart.destroy(); donutChart = null }
  const b         = detailBudget.value
  const spent     = b.spent || 0
  const remaining = b.exceeded ? 0 : Math.max(b.remaining, 0)
  donutChart = new Chart(donutRef.value.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: ['Gastado', 'Restante'],
      datasets: [{
        data: [spent || 0.001, remaining || (spent ? 0 : 0.001)],
        backgroundColor: [barColor(b.percentage), '#e2e8f0'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (c) => ' ' + fmt(c.parsed) } },
      },
      cutout: '68%',
    },
  })
}

const openDetail = async (b) => {
  if (donutChart) { donutChart.destroy(); donutChart = null }
  detailBudget.value  = b
  detailTx.value      = []
  detailLoading.value = true
  detailOpen.value    = true
  try {
    const [yr, mo] = b.month.split('-')
    const firstDay = `${b.month}-01`
    const lastDay  = new Date(Number(yr), Number(mo), 0).toISOString().slice(0, 10)
    const { data } = await api.get('/api/transactions', {
      params: { categoryId: b.categoryId, startDate: firstDay, endDate: lastDay },
    })
    detailTx.value = (data.data || []).filter((t) => t.type === 'gasto')
  } catch {
    detailTx.value = []
  } finally {
    detailLoading.value = false
    await nextTick()
    buildDonut()
  }
}

onUnmounted(() => { if (donutChart) { donutChart.destroy(); donutChart = null } })
</script>

<template>
  <div class="budgets-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h2>Presupuestos</h2>
        <p class="page-sub">Controla tus límites de gasto por categoría y mes</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Nuevo presupuesto</button>
    </div>

    <p v-if="store.error" class="error-msg">{{ store.error }}</p>

    <!-- Loading -->
    <div v-if="store.loading" class="state-box">
      <span class="spinner"></span>
      <p>Cargando presupuestos…</p>
    </div>

    <!-- Vacío -->
    <div v-else-if="!enriched.length" class="state-box card">
      <p class="empty-icon">📊</p>
      <p>No tienes presupuestos. ¡Crea uno para empezar a controlar tus gastos!</p>
      <button class="btn-primary" @click="openCreate">Crear primer presupuesto</button>
    </div>

    <!-- Grid de tarjetas -->
    <div v-else class="budgets-grid">
      <div
        v-for="b in enriched"
        :key="b.id"
        class="card budget-card"
        :class="{ exceeded: b.exceeded || b.percentage >= 100 }"
        :style="{ borderLeftColor: barColor(b.percentage), borderLeftWidth: '4px' }"
      >
        <!-- Título -->
        <div class="bc-header">
          <div class="bc-info">
            <p class="bc-name">{{ b.displayName }}</p>
            <p class="bc-period">{{ b.catLabel }} · {{ formatPeriod(b.month) }}</p>
          </div>
          <div class="bc-actions">
            <button class="btn-ghost" @click="openDetail(b)">Ver</button>
            <button class="btn-ghost" @click="openEdit(b)">Editar</button>
            <button class="btn-ghost btn-ghost-danger" :disabled="togglingId === b.id" @click="remove(b.id)">
              {{ togglingId === b.id ? '…' : 'Eliminar' }}
            </button>
          </div>
        </div>

        <!-- Montos -->
        <div class="bc-amounts">
          <div>
            <p class="amt-label">Gastado</p>
            <p class="amt-value" :style="{ color: barColor(b.percentage) }">{{ fmt(b.spent) }}</p>
          </div>
          <div class="text-right">
            <p class="amt-label">Límite</p>
            <p class="amt-value">{{ fmt(b.limitAmount) }}</p>
          </div>
        </div>

        <!-- Barra de progreso -->
        <div class="progress-track">
          <div
            class="progress-bar"
            :style="{ width: b.percentage + '%', background: barColor(b.percentage) }"
          ></div>
        </div>

        <!-- Pie -->
        <div class="bc-footer">
          <span class="status-badge" :style="{ background: barColor(b.percentage) + '18', color: barColor(b.percentage) }">
            {{ statusLabel(b.percentage, b.exceeded) }}
          </span>
          <span class="pct-text">{{ b.percentage }}%</span>
          <span class="rem-text">
            {{ b.exceeded
              ? `Excedido ${fmt(Math.abs(b.remaining))}`
              : `Restan ${fmt(b.remaining)}` }}
          </span>
        </div>
      </div>
    </div>

    <!-- Modal crear / editar -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>{{ modalMode === 'create' ? 'Nuevo presupuesto' : 'Editar presupuesto' }}</h3>
            <button class="close-btn" @click="closeModal" :disabled="saving">✕</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Nombre del presupuesto (opcional)</label>
              <input v-model="form.name" type="text" placeholder="Ej. Comida rápida, Netflix…" :disabled="saving" maxlength="60" />
            </div>
            <div class="field">
              <label>Categoría *</label>
              <select v-model="form.categoryId" :disabled="saving">
                <option value="">Selecciona…</option>
                <option v-for="c in expenseCategories" :key="c.id" :value="c.id">
                  {{ c.icon ?? '' }} {{ c.name }}
                </option>
              </select>
            </div>
            <div class="field">
              <label>Monto límite *</label>
              <input v-model.number="form.amount" type="number" min="1" step="1" placeholder="0.00" :disabled="saving" />
            </div>
            <div class="form-row">
              <div class="field">
                <label>Mes *</label>
                <select v-model.number="form.month" :disabled="saving">
                  <option v-for="(m, i) in MONTHS" :key="i" :value="i + 1">{{ m }}</option>
                </select>
              </div>
              <div class="field">
                <label>Año *</label>
                <input v-model.number="form.year" type="number" min="2020" :disabled="saving" />
              </div>
            </div>
            <p v-if="modalError" class="error-msg">{{ modalError }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="closeModal" :disabled="saving">Cancelar</button>
            <button class="btn-primary" @click="saveBudget" :disabled="saving">
              {{ saving ? 'Guardando…' : modalMode === 'create' ? 'Crear presupuesto' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>

  <!-- Modal detalle -->
  <Teleport to="body">
    <div v-if="detailOpen" class="modal-backdrop" @click.self="closeDetail">
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div>
            <h3>{{ detailBudget?.displayName }}</h3>
            <p class="detail-sub">{{ detailBudget?.catLabel }} · {{ formatPeriod(detailBudget?.month) }}</p>
          </div>
          <button class="close-btn" @click="closeDetail">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="detailLoading" class="state-box">
            <span class="spinner"></span>
            <p>Cargando…</p>
          </div>
          <template v-else>
            <div class="donut-container">
              <canvas ref="donutRef"></canvas>
            </div>
            <div class="detail-amounts">
              <div class="da-item">
                <span class="da-label">Gastado</span>
                <span class="da-value" :style="{ color: barColor(detailBudget.percentage) }">{{ fmt(detailBudget.spent) }}</span>
              </div>
              <div class="da-item">
                <span class="da-label">Límite</span>
                <span class="da-value">{{ fmt(detailBudget.limitAmount) }}</span>
              </div>
              <div class="da-item">
                <span class="da-label">{{ detailBudget.exceeded ? 'Excedido' : 'Restante' }}</span>
                <span class="da-value" :style="{ color: barColor(detailBudget.percentage) }">{{ fmt(Math.abs(detailBudget.remaining)) }}</span>
              </div>
            </div>
            <p class="section-label">Movimientos ({{ detailTx.length }})</p>
            <div v-if="detailTx.length" class="tx-scroll">
              <div v-for="tx in detailTx" :key="tx.id" class="dtx-row">
                <span class="dtx-date">{{ tx.date }}</span>
                <span class="dtx-desc">{{ tx.description || '—' }}</span>
                <span class="dtx-amount">-{{ fmt(tx.amount) }}</span>
              </div>
            </div>
            <p v-else class="no-tx">Sin movimientos en este período.</p>
          </template>
        </div>
      </div>
    </div>
  </Teleport>

</template>

<style scoped>
.budgets-page { display: flex; flex-direction: column; gap: 20px; }

/* Grid */
.budgets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

/* Tarjeta */
.budget-card {
  padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
  transition: box-shadow .15s;
  /* El borde izquierdo se setea dinámicamente vía :style (color = estado del presupuesto) */
  border-left-width: 4px;
  border-left-style: solid;
}
.budget-card:hover { box-shadow: var(--shadow-md); }
/* .exceeded ya no necesita override de color — el borde izquierdo dinámico lo maneja */
.budget-card.exceeded { /* solo para referencia semántica */ }

.bc-header  { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.bc-info    { flex: 1; min-width: 0; }
.bc-name    { font-weight: 600; font-size: 15px; color: var(--text-h); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bc-period  { font-size: 12px; color: var(--text); }
.bc-actions { display: flex; gap: 6px; flex-shrink: 0; }

.bc-amounts  { display: flex; justify-content: space-between; }
.text-right  { text-align: right; }
.amt-label   { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text); margin-bottom: 2px; }
.amt-value   { font-size: 17px; font-weight: 700; color: var(--text-h); }

/* Barra */
.progress-track { background: var(--border); border-radius: 99px; height: 8px; overflow: hidden; }
.progress-bar   { height: 100%; border-radius: 99px; transition: width .5s ease; }

.bc-footer   { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.status-badge { padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; }
.pct-text    { font-size: 13px; font-weight: 700; color: var(--text-h); }
.rem-text    { font-size: 12px; color: var(--text); margin-left: auto; }

/* Form */
.form-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.field input, .field select {
  padding: 8px 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-h);
  font-size: 14px;
  outline: none;
  transition: border-color .2s;
  width: 100%;
}
.field input:focus, .field select:focus { border-color: var(--accent); }

/* States */
.state-box { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; color: var(--text); font-size: 14px; }
.empty-icon { font-size: 40px; margin: 0; }

.spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .budgets-grid { grid-template-columns: 1fr; }
  .bc-header    { flex-direction: column; gap: 10px; }
}

/* Detail modal */
.modal-wide     { max-width: 500px; }
.detail-sub     { font-size: 12px; color: var(--text); margin: 3px 0 0; }
.donut-container { height: 200px; position: relative; }
.detail-amounts { display: flex; justify-content: space-around; padding: 12px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.da-item        { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.da-label       { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text); }
.da-value       { font-size: 15px; font-weight: 700; color: var(--text-h); }
.section-label  { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text); margin: 4px 0 0; }
.tx-scroll      { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow-y: auto; }
.dtx-row        { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border-radius: 8px; background: var(--bg); border: 1px solid var(--border); }
.dtx-date       { font-size: 12px; color: var(--text); white-space: nowrap; flex-shrink: 0; }
.dtx-desc       { font-size: 13px; color: var(--text-h); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dtx-amount     { font-size: 13px; font-weight: 600; color: #dc2626; white-space: nowrap; flex-shrink: 0; font-family: var(--mono); }
.no-tx          { text-align: center; font-size: 13px; color: var(--text); padding: 16px 0; margin: 0; }
</style>