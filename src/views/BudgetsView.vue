<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBudgetsStore }  from '../stores/budgets'
import api                  from '../services/api'

const store      = useBudgetsStore()
const categories = ref([])

// ── Carga inicial ─────────────────────────────────────
onMounted(async () => {
  const catRes = await api.get('/api/categories').catch(() => ({ data: { data: [] } }))
  categories.value = catRes.data.data ?? []

  await store.fetchAll()
  for (const b of store.budgets) {
    store.fetchProgress(b.id)
  }
})

// ── Helpers ───────────────────────────────────────────
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const catName = (id) => categories.value.find((c) => c.id === id)?.name ?? id
const catIcon = (id) => categories.value.value?.find((c) => c.id === id)?.icon ?? '📦'

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

// Devuelve color hex según % consumido
const barColor = (pct) => {
  if (pct >= 100) return '#dc2626'
  if (pct >= 80)  return '#ea580c'
  if (pct >= 60)  return '#ca8a04'
  return '#16a34a'
}

const statusLabel = (pct, exceeded) => {
  if (exceeded)  return 'Excedido'
  if (pct >= 80) return 'En riesgo'
  if (pct >= 60) return 'Atención'
  return 'En control'
}

// Presupuestos enriquecidos con datos de progreso
const enriched = computed(() =>
  store.budgets.map((b) => {
    const prog = store.progress[b.id]
    return {
      ...b,
      name:       catName(b.categoryId),
      spent:      prog?.spent      ?? 0,
      remaining:  prog?.remaining  ?? b.amount,
      percentage: prog?.percentage ?? 0,
      exceeded:   prog?.exceeded   ?? false,
    }
  })
)

// ── Formulario ────────────────────────────────────────
const showModal  = ref(false)
const modalMode  = ref('create')
const editingId  = ref(null)
const modalError = ref('')
const saving     = ref(false)
const togglingId = ref(null)

const today = new Date()
const emptyForm = () => ({
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
  form.value = { categoryId: b.categoryId, amount: b.amount, month: b.month, year: b.year }
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
    const payload = { ...form.value, amount: Number(form.value.amount), month: Number(form.value.month), year: Number(form.value.year) }
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
        :class="{ exceeded: b.exceeded }"
      >
        <!-- Título -->
        <div class="bc-header">
          <div class="bc-info">
            <p class="bc-name">{{ b.name }}</p>
            <p class="bc-period">{{ MONTHS[b.month - 1] }} {{ b.year }}</p>
          </div>
          <div class="bc-actions">
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
            <p class="amt-value">{{ fmt(b.amount) }}</p>
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
</template>

<style scoped>
.budgets-page { display: flex; flex-direction: column; gap: 20px; }

/* Grid */
.budgets-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

/* Tarjeta */
.budget-card { padding: 20px; display: flex; flex-direction: column; gap: 14px; transition: box-shadow .15s; }
.budget-card:hover { box-shadow: var(--shadow-md); }
.budget-card.exceeded { border-color: #fca5a5; }

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
</style>