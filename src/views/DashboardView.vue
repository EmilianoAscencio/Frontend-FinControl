<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

Chart.register(...registerables)

const loading  = ref(false)
const errorMsg = ref('')
const summary  = ref(null)

const barCanvas = ref(null)
let barChart    = null

const destroyChart = () => {
  if (barChart) { barChart.destroy(); barChart = null }
}

const buildChart = () => {
  if (!summary.value?.monthly?.length || !barCanvas.value) return
  destroyChart()

  const labels   = summary.value.monthly.map((m) => {
    const [yr, mo] = m.month.split('-')
    return new Date(Number(yr), Number(mo) - 1).toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
  })
  const incomes  = summary.value.monthly.map((m) => m.income)
  const expenses = summary.value.monthly.map((m) => m.expenses)

  barChart = new Chart(barCanvas.value.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: incomes,
          backgroundColor: 'rgba(124, 58, 237, 0.7)',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Gastos',
          data: expenses,
          backgroundColor: 'rgba(239, 68, 68, 0.65)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${fmt(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => '$' + v.toLocaleString('es-MX') },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        x: { grid: { display: false } },
      },
    },
  })
}

const fetchSummary = async () => {
  errorMsg.value = ''
  loading.value  = true
  destroyChart()
  try {
    const { data } = await api.get('/api/dashboard/summary')
    summary.value  = data.data
    loading.value  = false
    await nextTick()
    buildChart()
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al cargar el resumen.'
    loading.value  = false
  }
}

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

const fmtDate = (str) => {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const barColor = (pct) => {
  if (pct >= 100) return '#dc2626'
  if (pct >= 80)  return '#ea580c'
  if (pct >= 60)  return '#ca8a04'
  return '#16a34a'
}

const typeIcon = (type) => type === 'efectivo' ? '💵' : type === 'tarjeta' ? '💳' : '🏦'

onMounted(fetchSummary)
onUnmounted(destroyChart)
</script>

<template>
  <div class="dashboard-page">

    <div class="page-header">
      <div>
        <h2>Dashboard</h2>
        <p class="page-sub">Resumen de tu situación financiera del mes actual</p>
      </div>
      <button class="btn-ghost" @click="fetchSummary" :disabled="loading">
        {{ loading ? '...' : '↻ Actualizar' }}
      </button>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <div v-if="loading" class="state-box">
      <span class="spinner"></span>
      <p>Cargando resumen…</p>
    </div>

    <template v-else-if="summary">

      <!-- Stat cards -->
      <div class="cards-grid">
        <div class="card stat-card">
          <div class="stat-icon balance-icon">💰</div>
          <div>
            <p class="stat-label">Saldo total</p>
            <p class="stat-value balance">{{ fmt(summary.totalBalance) }}</p>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon income-icon">📈</div>
          <div>
            <p class="stat-label">Ingresos este mes</p>
            <p class="stat-value income">{{ fmt(summary.monthlyIncome) }}</p>
          </div>
        </div>
        <div class="card stat-card">
          <div class="stat-icon expense-icon">📉</div>
          <div>
            <p class="stat-label">Gastos este mes</p>
            <p class="stat-value expense">{{ fmt(summary.monthlyExpenses) }}</p>
          </div>
        </div>
      </div>

      <!-- Accounts + Budget overview -->
      <div class="mid-grid">

        <!-- Cuentas activas -->
        <div class="card">
          <div class="section-header">
            <h3>Mis cuentas</h3>
            <router-link to="/accounts" class="see-all">Ver todas →</router-link>
          </div>
          <div v-if="!summary.accounts?.length" class="mini-empty">
            <p>No hay cuentas activas.</p>
          </div>
          <div v-else class="accounts-list">
            <div v-for="acc in summary.accounts" :key="acc.id" class="acc-row">
              <span class="acc-type-icon">{{ typeIcon(acc.type) }}</span>
              <div class="acc-info">
                <span class="acc-name">{{ acc.name }}</span>
                <span class="acc-currency">{{ acc.currency }}</span>
              </div>
              <span class="acc-balance">{{ fmt(acc.balance) }}</span>
            </div>
          </div>
        </div>

        <!-- Budget overview -->
        <div class="card">
          <div class="section-header">
            <h3>Presupuestos del mes</h3>
            <router-link to="/budgets" class="see-all">Ver todos →</router-link>
          </div>
          <div v-if="!summary.budgetOverview?.length" class="mini-empty">
            <p>No hay presupuestos para este mes.</p>
          </div>
          <div v-else class="budget-list">
            <div v-for="b in summary.budgetOverview" :key="b.id" class="budget-row">
              <div class="budget-row-top">
                <span class="budget-name">{{ b.name || `Presupuesto #${b.id?.slice(-4)}` }}</span>
                <span class="budget-pct" :style="{ color: barColor(b.percentage) }">
                  {{ b.percentage }}%
                </span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-bar"
                  :style="{ width: b.percentage + '%', background: barColor(b.percentage) }"
                ></div>
              </div>
              <div class="budget-row-bottom">
                <span>{{ fmt(b.spent) }} / {{ fmt(b.limitAmount) }}</span>
                <span v-if="b.exceeded" class="exceeded-tag">¡Excedido!</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Tendencia 6 meses -->
      <div v-if="summary.monthly?.length" class="card chart-card">
        <h3>Tendencia — últimos 6 meses</h3>
        <div class="chart-wrap">
          <canvas ref="barCanvas"></canvas>
        </div>
      </div>

      <!-- Últimas transacciones -->
      <div class="card">
        <div class="section-header">
          <h3>Últimas transacciones</h3>
          <router-link to="/transactions" class="see-all">Ver todas →</router-link>
        </div>

        <div v-if="!summary.latestTransactions?.length" class="mini-empty">
          <p>No hay transacciones registradas aún.</p>
        </div>

        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in summary.latestTransactions" :key="tx.id">
                <td class="tx-desc">{{ tx.description || '—' }}</td>
                <td>
                  <span class="badge" :class="tx.type === 'ingreso' ? 'badge-green' : 'badge-red'">
                    {{ tx.type === 'ingreso' ? 'Ingreso' : 'Gasto' }}
                  </span>
                </td>
                <td :class="tx.type === 'ingreso' ? 'amount-income' : 'amount-expense'">
                  {{ tx.type === 'ingreso' ? '+' : '-' }}{{ fmt(tx.amount) }}
                </td>
                <td class="tx-date">{{ fmtDate(tx.date || tx.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>

  </div>
</template>

<style scoped>
.dashboard-page { display: flex; flex-direction: column; gap: 20px; }

/* Stat cards */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
}
.stat-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.balance-icon { background: rgba(124,58,237,.12); }
.income-icon  { background: rgba(22,163,74,.12); }
.expense-icon { background: rgba(220,38,38,.12); }
.stat-label { font-size: 12px; color: var(--text); margin-bottom: 4px; }
.stat-value { font-size: 20px; font-weight: 700; color: var(--text-h); margin: 0; }
.stat-value.balance { color: var(--accent); }
.stat-value.income  { color: #16a34a; }
.stat-value.expense { color: #dc2626; }

/* Mid row */
.mid-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Section headers */
.section-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.section-header h3 { margin: 0; }
.see-all { font-size: 13px; color: var(--accent); text-decoration: none; }
.see-all:hover { text-decoration: underline; }

.mini-empty {
  font-size: 13px; color: var(--text);
  padding: 20px 0; text-align: center;
}

/* Accounts list */
.accounts-list { display: flex; flex-direction: column; gap: 8px; }
.acc-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}
.acc-type-icon { font-size: 18px; }
.acc-info { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.acc-name { font-size: 13px; font-weight: 500; color: var(--text-h); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-currency { font-size: 11px; color: var(--text); }
.acc-balance { font-weight: 700; font-size: 14px; color: var(--accent); white-space: nowrap; }

/* Budget list */
.budget-list { display: flex; flex-direction: column; gap: 14px; }
.budget-row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.budget-name { font-size: 13px; font-weight: 500; color: var(--text-h); }
.budget-pct  { font-size: 13px; font-weight: 700; }
.progress-track { background: var(--border); border-radius: 99px; height: 7px; overflow: hidden; }
.progress-bar   { height: 100%; border-radius: 99px; transition: width .5s ease; }
.budget-row-bottom { display: flex; justify-content: space-between; font-size: 11px; color: var(--text); margin-top: 4px; }
.exceeded-tag { color: #dc2626; font-weight: 600; }

/* Chart */
.chart-card h3 { margin-bottom: 14px; }
.chart-wrap { height: 240px; position: relative; }

/* Table */
.tx-desc { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-date { font-size: 13px; color: var(--text); white-space: nowrap; }
.amount-income  { font-weight: 600; color: #16a34a; }
.amount-expense { font-weight: 600; color: #dc2626; }

/* States */
.state-box {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; padding: 48px 24px;
  color: var(--text); font-size: 14px;
}
.spinner {
  width: 28px; height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .mid-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .cards-grid { grid-template-columns: 1fr; }
  .stat-card  { padding: 16px; }
  .chart-wrap { height: 190px; }
}
</style>
