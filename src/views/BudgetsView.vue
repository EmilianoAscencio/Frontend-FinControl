<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import { useBudgetsStore } from '../stores/budgets'
import api from '../services/api'

Chart.register(...registerables)

const store      = useBudgetsStore()
const categories = ref([])
const accounts   = ref([])

onMounted(async () => {
  const [catRes, accRes] = await Promise.allSettled([
    api.get('/api/categories'),
    api.get('/api/accounts'),
  ])
  categories.value = catRes.status === 'fulfilled' ? (catRes.value.data.data ?? []) : []
  accounts.value   = accRes.status === 'fulfilled'
    ? (accRes.value.data.data ?? []).filter((a) => a.status === 'active')
    : []
  await store.fetchAll()
  for (const b of store.budgets) store.fetchProgress(b.id)
})

const accName = (id) => accounts.value.find((a) => a.id === id)?.name ?? null

// ── Helpers generales ─────────────────────────────────────────────────────────
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const catName      = (id) => categories.value.find((c) => c.id === id)?.name ?? id
const formatPeriod = (month) => {
  if (!month) return ''
  const [yr, mo] = month.split('-')
  return `${MONTHS[Number(mo) - 1]} ${yr}`
}
const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

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

// ── Lista enriquecida ─────────────────────────────────────────────────────────
const enriched = computed(() =>
  store.budgets.map((b) => {
    const prog = store.progress[b.id]
    return {
      ...b,
      displayName: b.name || catName(b.categoryId),
      catLabel:    catName(b.categoryId),
      spent:       prog?.spent      ?? 0,
      income:      prog?.income     ?? 0,
      remaining:   prog?.remaining  ?? b.limitAmount,
      percentage:  prog?.percentage ?? 0,
      exceeded:    prog?.exceeded   ?? false,
    }
  })
)

// ── Modal crear / editar presupuesto ──────────────────────────────────────────
const showModal  = ref(false)
const modalMode  = ref('create')
const modalError = ref('')
const saving     = ref(false)
const editingId  = ref(null)
const togglingId = ref(null)

const today = new Date()
const emptyForm = () => ({
  name: '', categoryId: '', accountId: '', amount: '',
  month: today.getMonth() + 1, year: today.getFullYear(),
})
const form = ref(emptyForm())

const expenseCategories = computed(() =>
  categories.value.filter((c) => c.type === 'expense' || c.type === 'gasto')
)

const openCreate = () => {
  modalMode.value = 'create'; editingId.value = null
  modalError.value = ''; form.value = emptyForm(); showModal.value = true
}
const openEdit = (b) => {
  modalMode.value = 'edit'; editingId.value = b.id; modalError.value = ''
  const [yr, mo] = (b.month || '-').split('-')
  form.value = {
    name:       b.name       || '',
    categoryId: b.categoryId,
    accountId:  b.accountId  || '',
    amount:     b.limitAmount,
    month:      Number(mo),
    year:       Number(yr),
  }
  showModal.value = true
}
const closeModal = () => { if (!saving.value) showModal.value = false }

const saveBudget = async () => {
  modalError.value = ''
  if (!form.value.categoryId || !form.value.amount || !form.value.month || !form.value.year) {
    modalError.value = 'Todos los campos son requeridos.'; return
  }
  if (Number(form.value.amount) <= 0) { modalError.value = 'El monto debe ser mayor a cero.'; return }
  saving.value = true
  try {
    const monthStr = `${form.value.year}-${String(form.value.month).padStart(2, '0')}`
    const payload  = {
      categoryId:  form.value.categoryId,
      accountId:   form.value.accountId || null,
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
  if (!confirm('¿Eliminar este presupuesto y todos sus movimientos?')) return
  togglingId.value = id
  try   { await store.remove(id) }
  catch { store.error = 'Error al eliminar.' }
  finally { togglingId.value = null }
}

// ── Modal detalle + movimientos propios ───────────────────────────────────────
const detailOpen    = ref(false)
const detailBudget  = ref(null)
const movements     = ref([])     // movimientos propios del presupuesto
const detailLoading = ref(false)
const movError      = ref('')

// Gráfica donut
const donutRef = ref(null)
let donutChart = null

const closeDetail = () => {
  detailOpen.value = false
  movError.value   = ''
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
      labels: ['Gastado', 'Disponible'],
      datasets: [{
        data: [spent || 0.001, remaining || (spent ? 0 : 0.001)],
        backgroundColor: [barColor(b.percentage), '#e2e8f0'],
        borderWidth: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (c) => ' ' + fmt(c.parsed) } },
      },
    },
  })
}

const openDetail = async (b) => {
  if (donutChart) { donutChart.destroy(); donutChart = null }
  detailBudget.value  = b
  movements.value     = []
  movError.value      = ''
  detailLoading.value = true
  detailOpen.value    = true
  showAddMov.value    = false
  Object.assign(addMovForm, emptyAddMov())
  try {
    const { data } = await api.get(`/api/budgets/${b.id}/movements`)
    movements.value = data.data || []
  } catch {
    movError.value = 'No se pudieron cargar los movimientos.'
  } finally {
    detailLoading.value = false
    await nextTick()
    buildDonut()
  }
}

// ── Agregar movimiento al presupuesto ─────────────────────────────────────────
const showAddMov  = ref(false)
const addMovError = ref('')
const addingMov   = ref(false)

const emptyAddMov = () => ({
  type:        'gasto',
  amount:      '',
  description: '',
  date:        new Date().toISOString().slice(0, 10),
})
const addMovForm = ref(emptyAddMov())

const submitAddMov = async () => {
  addMovError.value = ''
  if (!addMovForm.value.amount || Number(addMovForm.value.amount) <= 0) {
    addMovError.value = 'El monto debe ser mayor a 0.'; return
  }
  addingMov.value = true
  try {
    const { data } = await api.post(`/api/budgets/${detailBudget.value.id}/movements`, {
      type:        addMovForm.value.type,
      amount:      Number(addMovForm.value.amount),
      description: addMovForm.value.description.trim(),
      date:        addMovForm.value.date,
    })
    movements.value.unshift(data.data)
    // Refrescar progreso en la tarjeta
    await store.fetchProgress(detailBudget.value.id)
    const prog = store.progress[detailBudget.value.id]
    if (prog) {
      detailBudget.value = {
        ...detailBudget.value,
        spent:      prog.spent,
        income:     prog.income,
        remaining:  prog.remaining,
        percentage: prog.percentage,
        exceeded:   prog.exceeded,
      }
      await nextTick()
      buildDonut()
    }
    Object.assign(addMovForm.value, emptyAddMov())
    showAddMov.value = false
  } catch (err) {
    addMovError.value = err.response?.data?.message || 'Error al registrar el movimiento.'
  } finally {
    addingMov.value = false
  }
}

const deleteMovement = async (movId) => {
  if (!confirm('¿Eliminar este movimiento?')) return
  try {
    await api.delete(`/api/budgets/${detailBudget.value.id}/movements/${movId}`)
    movements.value = movements.value.filter((m) => m.id !== movId)
    await store.fetchProgress(detailBudget.value.id)
    const prog = store.progress[detailBudget.value.id]
    if (prog) {
      detailBudget.value = {
        ...detailBudget.value,
        spent:      prog.spent,
        income:     prog.income,
        remaining:  prog.remaining,
        percentage: prog.percentage,
        exceeded:   prog.exceeded,
      }
      await nextTick()
      buildDonut()
    }
  } catch {
    movError.value = 'Error al eliminar el movimiento.'
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

    <div v-if="store.loading" class="state-box">
      <span class="spinner"></span><p>Cargando presupuestos…</p>
    </div>

    <div v-else-if="!enriched.length" class="state-box card">
      <p class="empty-icon">📊</p>
      <p>No tienes presupuestos. ¡Crea uno para empezar!</p>
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
        <div class="bc-header">
          <div class="bc-info">
            <p class="bc-name">{{ b.displayName }}</p>
            <p class="bc-period">
              {{ b.catLabel }} · {{ formatPeriod(b.month) }}
              <span v-if="b.accountId" class="bc-acc-tag">
                🏦 {{ accName(b.accountId) || 'Cuenta vinculada' }}
              </span>
              <span v-else class="bc-acc-tag bc-acc-none">Sin cuenta vinculada</span>
            </p>
          </div>
          <div class="bc-actions">
            <button class="btn-ghost" @click="openDetail(b)">Ver</button>
            <button class="btn-ghost" @click="openEdit(b)">Editar</button>
            <button class="btn-ghost btn-ghost-danger" :disabled="togglingId === b.id" @click="remove(b.id)">
              {{ togglingId === b.id ? '…' : 'Eliminar' }}
            </button>
          </div>
        </div>

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

        <div class="progress-track">
          <div class="progress-bar" :style="{ width: b.percentage + '%', background: barColor(b.percentage) }"></div>
        </div>

        <div class="bc-footer">
          <span class="status-badge" :style="{ background: barColor(b.percentage) + '18', color: barColor(b.percentage) }">
            {{ statusLabel(b.percentage, b.exceeded) }}
          </span>
          <span class="pct-text">{{ b.percentage }}%</span>
          <span class="rem-text">
            {{ b.exceeded ? `Excedido ${fmt(Math.abs(b.remaining))}` : `Restan ${fmt(b.remaining)}` }}
          </span>
        </div>
      </div>
    </div>

    <!-- ══ Modal: Crear / Editar ══ -->
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
              <input v-model="form.name" type="text" placeholder="Ej. Comida del mes" :disabled="saving" maxlength="60" />
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
              <label>Cuenta vinculada</label>
              <select v-model="form.accountId" :disabled="saving">
                <option value="">Sin cuenta (movimientos manuales)</option>
                <option v-for="a in accounts" :key="a.id" :value="a.id">
                  🏦 {{ a.name }} ({{ a.currency || 'MXN' }})
                </option>
              </select>
              <p class="field-hint">
                Con cuenta vinculada el progreso se calcula automáticamente desde tus transacciones.
              </p>
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

  <!-- ══ Modal: Detalle + movimientos propios ══ -->
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
            <span class="spinner"></span><p>Cargando…</p>
          </div>

          <template v-else>
            <!-- Donut -->
            <div class="donut-container">
              <canvas ref="donutRef"></canvas>
            </div>

            <!-- Resumen de montos -->
            <div class="detail-amounts">
              <div class="da-item">
                <span class="da-label">Gastado</span>
                <span class="da-value" :style="{ color: barColor(detailBudget.percentage) }">
                  {{ fmt(detailBudget.spent) }}
                </span>
              </div>
              <div class="da-item">
                <span class="da-label">Ingresos registrados</span>
                <span class="da-value" style="color:#16a34a">{{ fmt(detailBudget.income) }}</span>
              </div>
              <div class="da-item">
                <span class="da-label">Límite</span>
                <span class="da-value">{{ fmt(detailBudget.limitAmount) }}</span>
              </div>
              <div class="da-item">
                <span class="da-label">{{ detailBudget.exceeded ? 'Excedido' : 'Disponible' }}</span>
                <span class="da-value" :style="{ color: barColor(detailBudget.percentage) }">
                  {{ fmt(Math.abs(detailBudget.remaining)) }}
                </span>
              </div>
            </div>

            <p v-if="movError" class="error-msg">{{ movError }}</p>

            <!-- Sección de movimientos -->
            <div class="mov-section-header">
              <p class="section-label">
                {{ detailBudget?.accountId ? 'Transacciones de la cuenta' : 'Movimientos del presupuesto' }}
                ({{ movements.length }})
              </p>
              <!-- Solo mostrar "Agregar" cuando NO hay cuenta vinculada -->
              <button
                v-if="!detailBudget?.accountId"
                class="btn-primary"
                style="font-size:12px;padding:5px 12px"
                @click="showAddMov = !showAddMov"
              >
                {{ showAddMov ? 'Cancelar' : '+ Agregar movimiento' }}
              </button>
              <span v-else class="auto-track-badge">Seguimiento automático</span>
            </div>

            <!-- Formulario agregar movimiento (solo sin cuenta vinculada) -->
            <div v-if="showAddMov && !detailBudget?.accountId" class="add-mov-form">
              <div class="form-row">
                <div class="field">
                  <label>Tipo *</label>
                  <select v-model="addMovForm.type" :disabled="addingMov">
                    <option value="gasto">Gasto</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                </div>
                <div class="field">
                  <label>Monto *</label>
                  <input v-model.number="addMovForm.amount" type="number" min="0.01" step="0.01" placeholder="0.00" :disabled="addingMov" />
                </div>
              </div>
              <div class="form-row">
                <div class="field">
                  <label>Descripción</label>
                  <input v-model="addMovForm.description" type="text" placeholder="Descripción opcional" :disabled="addingMov" maxlength="120" />
                </div>
                <div class="field">
                  <label>Fecha *</label>
                  <input v-model="addMovForm.date" type="date" :disabled="addingMov" />
                </div>
              </div>
              <p v-if="addMovError" class="error-msg">{{ addMovError }}</p>
              <button class="btn-primary" @click="submitAddMov" :disabled="addingMov" style="width:100%">
                {{ addingMov ? 'Guardando…' : 'Registrar movimiento' }}
              </button>
            </div>

            <!-- Lista de movimientos -->
            <div v-if="movements.length" class="tx-scroll">
              <div v-for="mov in movements" :key="mov.id" class="dtx-row">
                <span class="dtx-type-dot" :class="mov.type === 'ingreso' ? 'dot-green' : 'dot-red'"></span>
                <span class="dtx-date">{{ mov.date }}</span>
                <span class="dtx-desc">{{ mov.description || '—' }}</span>
                <span class="dtx-amount" :class="mov.type === 'ingreso' ? 'pos' : 'neg'">
                  {{ mov.type === 'ingreso' ? '+' : '-' }}{{ fmt(mov.amount) }}
                </span>
                <button class="dtx-del" @click="deleteMovement(mov.id)" title="Eliminar">✕</button>
              </div>
            </div>
            <p v-else class="no-tx">Sin movimientos registrados en este presupuesto.</p>
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
  padding: 20px; display: flex; flex-direction: column; gap: 14px;
  transition: box-shadow .15s;
  border-left-width: 4px; border-left-style: solid;
}
.budget-card:hover { box-shadow: var(--shadow-md); }

.bc-header  { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.bc-info    { flex: 1; min-width: 0; }
.bc-name    { font-weight: 600; font-size: 15px; color: var(--text-h); margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bc-period  { font-size: 12px; color: var(--text); margin: 0; display: flex; flex-direction: column; gap: 2px; }
.bc-acc-tag  { font-size: 11px; color: var(--accent); font-weight: 500; }
.bc-acc-none { color: var(--text); opacity: 0.55; }
.bc-actions { display: flex; gap: 6px; flex-shrink: 0; }

.bc-amounts { display: flex; justify-content: space-between; }
.text-right { text-align: right; }
.amt-label  { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--text); margin-bottom: 2px; }
.amt-value  { font-size: 17px; font-weight: 700; color: var(--text-h); margin: 0; }

.progress-track { background: var(--border); border-radius: 99px; height: 8px; overflow: hidden; }
.progress-bar   { height: 100%; border-radius: 99px; transition: width .5s ease; }

.bc-footer   { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.status-badge { padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; }
.pct-text    { font-size: 13px; font-weight: 700; color: var(--text-h); }
.rem-text    { font-size: 12px; color: var(--text); margin-left: auto; }

/* Form */
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.field input, .field select {
  padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;
  background: var(--bg); color: var(--text-h); font-size: 14px; outline: none;
  transition: border-color .2s; width: 100%;
}
.field input:focus, .field select:focus { border-color: var(--accent); }

/* States */
.state-box  { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; color: var(--text); font-size: 14px; }
.empty-icon { font-size: 40px; margin: 0; }
.spinner    { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Detail modal */
.modal-wide       { max-width: 540px; }
.detail-sub       { font-size: 12px; color: var(--text); margin: 3px 0 0; }
.donut-container  { height: 200px; position: relative; }

.detail-amounts {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 8px; padding: 14px 0;
  border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
}
.da-item   { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.da-label  { font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: var(--text); text-align: center; }
.da-value  { font-size: 14px; font-weight: 700; color: var(--text-h); }

/* Movimientos */
.mov-section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin: 4px 0 0;
}
.section-label   { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--text); margin: 0; }
.auto-track-badge {
  font-size: 11px; font-weight: 600; padding: 3px 10px;
  border-radius: 99px; background: var(--accent-bg); color: var(--accent);
}
.field-hint { font-size: 11px; color: var(--text); margin: 3px 0 0; }

.add-mov-form {
  background: var(--muted); border: 1px solid var(--border);
  border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
}

.tx-scroll  { display: flex; flex-direction: column; gap: 6px; max-height: 260px; overflow-y: auto; }

.dtx-row    {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  background: var(--bg); border: 1px solid var(--border);
}
.dtx-type-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-green    { background: #16a34a; }
.dot-red      { background: #dc2626; }
.dtx-date     { font-size: 12px; color: var(--text); white-space: nowrap; flex-shrink: 0; }
.dtx-desc     { font-size: 13px; color: var(--text-h); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dtx-amount   { font-size: 13px; font-weight: 600; white-space: nowrap; flex-shrink: 0; font-family: var(--mono); }
.dtx-del {
  background: none; border: none; cursor: pointer;
  font-size: 12px; color: var(--text); flex-shrink: 0;
  padding: 2px 4px; border-radius: 4px; transition: color .15s, background .15s;
}
.dtx-del:hover { color: #dc2626; background: var(--danger-bg); }

.pos { color: #16a34a; }
.neg { color: #dc2626; }

.no-tx { text-align: center; font-size: 13px; color: var(--text); padding: 16px 0; margin: 0; }

@media (max-width: 600px) {
  .budgets-grid  { grid-template-columns: 1fr; }
  .bc-header     { flex-direction: column; gap: 10px; }
  .detail-amounts { grid-template-columns: repeat(2, 1fr); }
  .form-row      { grid-template-columns: 1fr; }
}
</style>
