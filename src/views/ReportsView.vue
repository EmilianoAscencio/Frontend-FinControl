<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

// Category breakdown
const categories    = ref([])
const breakdown     = ref([])
const loadingBreak  = ref(false)

const loadCategories = async () => {
  try {
    const { data } = await api.get('/api/categories')
    categories.value = data.data || []
  } catch {}
}

const catName = (id) => categories.value.find((c) => c.id === id)?.name || id

Chart.register(...registerables)

// Date helpers 
const today        = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const toISO        = (d) => d.toISOString().slice(0, 10)

const filters = reactive({
  startDate: toISO(firstOfMonth),
  endDate:   toISO(today),
})

// State 
const loading  = ref(false)
const errorMsg = ref('')
const report   = ref(null)

const barCanvas      = ref(null)
const doughnutCanvas = ref(null)
let barChart      = null
let doughnutChart = null

const destroyCharts = () => {
  if (barChart)      { barChart.destroy();      barChart = null }
  if (doughnutChart) { doughnutChart.destroy(); doughnutChart = null }
}

const buildCharts = () => {
  if (!report.value) return
  if (!barCanvas.value || !doughnutCanvas.value) return
  destroyCharts()

  const { totalIncome, totalExpenses } = report.value
  const incomeColor  = '#7c3aed'
  const expenseColor = '#ef4444'

  const barCtx      = barCanvas.value.getContext('2d')
  const doughnutCtx = doughnutCanvas.value.getContext('2d')
  if (!barCtx || !doughnutCtx) return

  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: ['Ingresos', 'Gastos'],
      datasets: [{
        label: 'Monto (MXN)',
        data: [totalIncome, totalExpenses],
        backgroundColor: [incomeColor, expenseColor],
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '$' + v.toLocaleString('es-MX') },
        },
      },
    },
  })

  doughnutChart = new Chart(doughnutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Ingresos', 'Gastos'],
      datasets: [{
        data: [totalIncome, totalExpenses],
        backgroundColor: [incomeColor, expenseColor],
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => ` $${ctx.parsed.toLocaleString('es-MX')}`,
          },
        },
      },
    },
  })
}

// Fetch 
const fetchReport = async () => {
  errorMsg.value = ''
  if (!filters.startDate || !filters.endDate) {
    errorMsg.value = 'Selecciona un rango de fechas.'
    return
  }
  if (filters.startDate > filters.endDate) {
    errorMsg.value = 'La fecha inicial no puede ser mayor que la final.'
    return
  }

  loading.value = true
  report.value  = null
  destroyCharts()

  try {
    const params = { startDate: filters.startDate, endDate: filters.endDate }

    const startMonth = filters.startDate.slice(0, 7)

    const [mainRes, breakRes] = await Promise.allSettled([
      api.get('/api/reports/income-vs-expenses', { params }),
      api.get('/api/reports/monthly-summary',    { params: { month: startMonth } }),
    ])

    if (mainRes.status === 'fulfilled') {
      report.value = mainRes.value.data.data
    } else {
      throw mainRes.reason
    }

    if (breakRes.status === 'fulfilled') {
      const cats = breakRes.value.data.data?.categorias || []
      breakdown.value = cats
        .filter((c) => c.ingresos > 0 || c.gastos > 0)
        .map((c) => ({
          categoryId: c.categoryId,
          ingresos:   c.ingresos || 0,
          gastos:     c.gastos   || 0,
          neto:       (c.ingresos || 0) - (c.gastos || 0),
        }))
        .sort((a, b) => (b.ingresos + b.gastos) - (a.ingresos + a.gastos))
    } else {
      breakdown.value = []
    }

    loading.value = false
    await nextTick()
    buildCharts()
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al cargar el reporte.'
    loading.value = false
  }
}

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

const hasData = computed(
  () => report.value && (report.value.totalIncome > 0 || report.value.totalExpenses > 0)
)

onMounted(() => {
  loadCategories()
  fetchReport()
})
onUnmounted(destroyCharts)
</script>

<template>
  <div class="reports-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h2>Reportes</h2>
        <p class="page-sub">Compara ingresos y gastos en un período</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="card filter-card">
      <div class="filter-row">
        <div class="field">
          <label>Fecha inicial</label>
          <input type="date" v-model="filters.startDate" :max="filters.endDate" />
        </div>
        <div class="field">
          <label>Fecha final</label>
          <input type="date" v-model="filters.endDate" :min="filters.startDate" />
        </div>
        <button class="btn-primary" @click="fetchReport" :disabled="loading">
          {{ loading ? 'Cargando...' : 'Generar reporte' }}
        </button>
      </div>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="state-box">
      <span class="spinner"></span>
      <p>Generando reporte…</p>
    </div>

    <!-- Results -->
    <template v-else-if="report">

      <!-- Summary cards -->
      <div class="summary-grid">
        <div class="card stat-card income">
          <p class="stat-label">Total de Ingresos</p>
          <p class="stat-value">{{ fmt(report.totalIncome) }}</p>
        </div>
        <div class="card stat-card expenses">
          <p class="stat-label">Total Gastos</p>
          <p class="stat-value">{{ fmt(report.totalExpenses) }}</p>
        </div>
        <div class="card stat-card" :class="report.balanceDifference >= 0 ? 'income' : 'expenses'">
          <p class="stat-label">Balance del período</p>
          <p class="stat-value">{{ fmt(report.balanceDifference) }}</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="!hasData" class="state-box">
        <p class="empty-icon">📭</p>
        <p>No hay transacciones en este período.</p>
      </div>

      <!-- Charts -->
      <div v-else class="charts-grid">
        <div class="card chart-card">
          <h3>Comparativa</h3>
          <div class="chart-wrap">
            <canvas ref="barCanvas"></canvas>
          </div>
        </div>
        <div class="card chart-card">
          <h3>Distribución</h3>
          <div class="chart-wrap">
            <canvas ref="doughnutCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Category breakdown table -->
      <div v-if="breakdown.length" class="card table-card">
        <div class="breakdown-header">
          <h3>Desglose por categoría</h3>
          <span class="breakdown-period">{{ filters.startDate }} → {{ filters.endDate }}</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                <th class="text-right">Ingresos</th>
                <th class="text-right">Gastos</th>
                <th class="text-right">Neto</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in breakdown" :key="row.categoryId">
                <td>{{ catName(row.categoryId) }}</td>
                <td class="break-amount pos text-right">{{ row.ingresos > 0 ? fmt(row.ingresos) : '—' }}</td>
                <td class="break-amount neg text-right">{{ row.gastos > 0 ? fmt(row.gastos) : '—' }}</td>
                <td class="break-amount text-right" :class="row.neto >= 0 ? 'pos' : 'neg'">{{ fmt(row.neto) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>

  </div>
</template>

<style scoped>
.reports-page { display: flex; flex-direction: column; gap: 20px; }

.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-sub    { font-size: 13px; color: var(--text); margin-top: 2px; }

.filter-card { padding: 16px 20px; }
.filter-row  { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; }

.field       { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 13px; font-weight: 500; color: var(--text-h); }
.field input {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-bg); }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.stat-card   { text-align: center; }
.stat-label  { font-size: 13px; color: var(--text); margin-bottom: 6px; }
.stat-value  { font-size: 22px; font-weight: 700; color: var(--text-h); margin: 0; }
.stat-card.income   .stat-value { color: #7c3aed; }
.stat-card.expenses .stat-value { color: #dc2626; }

.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.chart-card h3  { margin-bottom: 16px; }
.chart-wrap { height: 260px; position: relative; }

.state-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--text);
  font-size: 14px;
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

.btn-primary {
  padding: 9px 20px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
  align-self: flex-end;
}
.btn-primary:hover    { background: var(--accent-soft); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.error-msg {
  font-size: 13px;
  color: #dc2626;
  margin: 12px 0 0;
  padding: 10px 14px;
  background: rgba(220, 38, 38, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

/* Breakdown */
.breakdown-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px;
}
.breakdown-header h3 { margin: 0; }
.breakdown-period { font-size: 12px; color: var(--text); }

.break-amount { font-family: var(--mono); font-size: 13px; font-weight: 600; }
.pos { color: #16a34a; }
.neg { color: #dc2626; }
.text-right { text-align: right; }

.mini-bar-wrap {
  display: flex; align-items: center; gap: 8px;
  width: 140px;
}
.mini-bar {
  height: 6px; border-radius: 99px;
  flex: 1; max-width: 100px;
  background: var(--accent);
  min-width: 2px;
}
.mini-pct { font-size: 12px; color: var(--text); white-space: nowrap; }

@media (max-width: 768px) {
  .summary-grid { grid-template-columns: 1fr; }
  .charts-grid  { grid-template-columns: 1fr; }
  .filter-row   { flex-direction: column; align-items: stretch; }
  .btn-primary  { width: 100%; }
  th:nth-child(4), td:nth-child(4) { display: none; }
}
@media (max-width: 480px) {
  .chart-wrap { height: 200px; }
}
</style>
