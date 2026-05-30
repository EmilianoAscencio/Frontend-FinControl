<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Chart, registerables } from 'chart.js'
import api from '../services/api'

Chart.register(...registerables)
const router = useRouter()

const loading  = ref(false)
const errorMsg = ref('')
const summary  = ref(null)
const barCanvas = ref(null)
let barChart = null

/* ─── Chart ─── */
const destroyChart = () => { if (barChart) { barChart.destroy(); barChart = null } }

const buildChart = () => {
  if (!summary.value?.monthly?.length || !barCanvas.value) return
  destroyChart()

  const labels   = summary.value.monthly.map(m => {
    const [yr, mo] = m.month.split('-')
    return new Date(Number(yr), Number(mo) - 1)
      .toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
  })
  const incomes  = summary.value.monthly.map(m => m.income   || 0)
  const expenses = summary.value.monthly.map(m => m.expenses || 0)

  barChart = new Chart(barCanvas.value.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: incomes,
          backgroundColor: 'rgba(13,148,136,0.80)',
          borderRadius: 6,
          borderSkipped: false,
          borderWidth: 0,
          maxBarThickness: 28,
        },
        {
          label: 'Gastos',
          data: expenses,
          backgroundColor: 'rgba(239,68,68,0.72)',
          borderRadius: 6,
          borderSkipped: false,
          borderWidth: 0,
          maxBarThickness: 28,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            font: { size: 12 },
            padding: 14,
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.88)',
          titleFont: { size: 11, weight: '500' },
          bodyFont:  { size: 13, weight: '700' },
          padding: 10,
          cornerRadius: 8,
          callbacks: { label: ctx => '  ' + fmt(ctx.parsed.y) },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => '$' + Number(v).toLocaleString('es-MX'), font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.04)' },
          border: { display: false },
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } },
          border: { display: false },
        },
      },
      animation: { duration: 550 },
    },
  })
}

/* ─── Data ─── */
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

/* ─── Computed ─── */
const netBalance = computed(() =>
  (summary.value?.monthlyIncome || 0) - (summary.value?.monthlyExpenses || 0)
)

/* ─── Helpers ─── */
const fmt = n =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

const fmtDate = str => {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const barColor = pct => {
  if (pct >= 100) return '#dc2626'
  if (pct >= 80)  return '#ea580c'
  if (pct >= 60)  return '#ca8a04'
  return '#16a34a'
}

const budgetStatusLabel = (b) => {
  if (b.exceeded || b.percentage >= 100) return { label: 'Excedido', cls: 'status-danger' }
  if (b.percentage >= 80)               return { label: 'En riesgo', cls: 'status-warning' }
  if (b.percentage >= 60)               return { label: 'Atención',  cls: 'status-alert' }
  return { label: 'En control', cls: 'status-ok' }
}

const typeLabel = t =>
  t === 'efectivo' ? 'Efectivo' : t === 'tarjeta' ? 'Tarjeta' : t === 'ahorro' ? 'Ahorro' : 'Cuenta'

const typeColor = t =>
  t === 'efectivo' ? '#0d9488' : t === 'tarjeta' ? '#7c3aed' : t === 'ahorro' ? '#16a34a' : '#2563eb'

onMounted(fetchSummary)
onUnmounted(destroyChart)
</script>

<template>
  <div class="dash">

    <!-- Header -->
    <div class="dash-header">
      <div>
        <h2>Dashboard</h2>
        <p class="page-sub">Resumen financiero del mes actual</p>
      </div>
      <button class="btn-ghost" @click="fetchSummary" :disabled="loading">
        <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" width="15" height="15"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
        <span class="spinner-sm" v-else></span>
        {{ loading ? 'Actualizando…' : 'Actualizar' }}
      </button>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <div v-if="loading && !summary" class="state-box">
      <span class="spinner"></span>
      <p>Cargando resumen…</p>
    </div>

    <template v-else-if="summary">

      <!-- ══ KPI Cards ══ -->
      <div class="kpi-grid">

        <div class="kpi-card kpi-teal">
          <div class="kpi-icon-wrap kpi-icon-teal">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Saldo total</p>
            <p class="kpi-value" style="color: #0d9488">{{ fmt(summary.totalBalance) }}</p>
          </div>
          <div class="kpi-accent kpi-accent-teal"></div>
        </div>

        <div class="kpi-card kpi-green">
          <div class="kpi-icon-wrap kpi-icon-green">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Ingresos este mes</p>
            <p class="kpi-value" style="color: #16a34a">{{ fmt(summary.monthlyIncome) }}</p>
          </div>
          <div class="kpi-accent kpi-accent-green"></div>
        </div>

        <div class="kpi-card kpi-red">
          <div class="kpi-icon-wrap kpi-icon-red">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Gastos este mes</p>
            <p class="kpi-value" style="color: #dc2626">{{ fmt(summary.monthlyExpenses) }}</p>
          </div>
          <div class="kpi-accent kpi-accent-red"></div>
        </div>

        <div class="kpi-card" :class="netBalance >= 0 ? 'kpi-blue' : 'kpi-orange'">
          <div class="kpi-icon-wrap" :class="netBalance >= 0 ? 'kpi-icon-blue' : 'kpi-icon-orange'">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c-.99.143-1.99.317-2.98.52m2.98-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z"/></svg>
          </div>
          <div class="kpi-body">
            <p class="kpi-label">Balance neto</p>
            <p class="kpi-value" :style="{ color: netBalance >= 0 ? '#2563eb' : '#ea580c' }">{{ fmt(netBalance) }}</p>
          </div>
          <div class="kpi-accent" :class="netBalance >= 0 ? 'kpi-accent-blue' : 'kpi-accent-orange'"></div>
        </div>

      </div>

      <!-- ══ Chart ══ -->
      <div v-if="summary.monthly?.length" class="card chart-card">
        <div class="chart-header">
          <div>
            <h3>Tendencia — últimos 6 meses</h3>
            <p class="chart-sub">Ingresos vs gastos por mes</p>
          </div>
        </div>
        <div class="chart-wrap">
          <canvas ref="barCanvas"></canvas>
        </div>
      </div>

      <!-- ══ Mid row ══ -->
      <div class="mid-grid">

        <!-- Cuentas -->
        <div class="card section-card">
          <div class="sc-header">
            <h3>Mis cuentas</h3>
            <button class="sc-link" @click="router.push('/accounts')">Ver todas →</button>
          </div>
          <div v-if="!summary.accounts?.length" class="sc-empty">
            No hay cuentas activas.
          </div>
          <div v-else class="acc-list">
            <div v-for="acc in summary.accounts" :key="acc.id" class="acc-item">
              <div class="acc-badge" :style="{ background: typeColor(acc.type) + '18', color: typeColor(acc.type) }">
                {{ acc.name?.slice(0,1)?.toUpperCase() || '?' }}
              </div>
              <div class="acc-info">
                <p class="acc-name">{{ acc.name }}</p>
                <p class="acc-type">{{ typeLabel(acc.type) }} · {{ acc.currency || 'MXN' }}</p>
              </div>
              <p class="acc-balance" :style="{ color: acc.balance >= 0 ? '#0d9488' : '#dc2626' }">
                {{ fmt(acc.balance ?? acc.initialBalance) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Presupuestos -->
        <div class="card section-card">
          <div class="sc-header">
            <h3>Presupuestos del mes</h3>
            <button class="sc-link" @click="router.push('/budgets')">Ver todos →</button>
          </div>
          <div v-if="!summary.budgetOverview?.length" class="sc-empty">
            No hay presupuestos para este mes.
          </div>
          <div v-else class="budget-list">
            <div v-for="b in summary.budgetOverview" :key="b.id" class="budget-item">
              <div class="bi-top">
                <p class="bi-name">{{ b.name || `Presupuesto #${b.id?.slice(-4)?.toUpperCase()}` }}</p>
                <div class="bi-right">
                  <span class="bi-status-badge" :class="budgetStatusLabel(b).cls">
                    {{ budgetStatusLabel(b).label }}
                  </span>
                  <span class="bi-pct" :style="{ color: barColor(b.percentage) }">{{ b.percentage }}%</span>
                </div>
              </div>
              <div class="bi-track">
                <div
                  class="bi-bar"
                  :style="{ width: Math.min(b.percentage, 100) + '%', background: barColor(b.percentage) }"
                ></div>
              </div>
              <div class="bi-bottom">
                <span>{{ fmt(b.spent) }} <span class="bi-sep">/</span> {{ fmt(b.limitAmount) }}</span>
                <span v-if="b.remaining < 0" class="bi-over">+{{ fmt(Math.abs(b.remaining)) }} excedido</span>
                <span v-else class="bi-rem">{{ fmt(b.remaining) }} restante</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- ══ Últimas transacciones ══ -->
      <div class="card section-card">
        <div class="sc-header">
          <h3>Últimas transacciones</h3>
          <button class="sc-link" @click="router.push('/transactions')">Ver todas →</button>
        </div>
        <div v-if="!summary.latestTransactions?.length" class="sc-empty">
          No hay transacciones registradas aún.
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
                <td>
                  <div class="tx-desc-cell">
                    <span class="tx-type-dot" :class="tx.type === 'ingreso' ? 'dot-green' : 'dot-red'"></span>
                    <span class="tx-desc">{{ tx.description || '—' }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge" :class="tx.type === 'ingreso' ? 'badge-green' : 'badge-red'">
                    {{ tx.type === 'ingreso' ? 'Ingreso' : 'Gasto' }}
                  </span>
                </td>
                <td class="tx-amount" :class="tx.type === 'ingreso' ? 'tx-income' : 'tx-expense'">
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
.dash { display: flex; flex-direction: column; gap: 20px; }

/* ── Header ── */
.dash-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

/* ── KPI Grid ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.kpi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  padding: 18px 18px 0;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  position: relative;
  overflow: hidden;
  transition: box-shadow 0.15s, transform 0.15s;
}
.kpi-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }

.kpi-icon-wrap {
  width: 42px; height: 42px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.kpi-icon-wrap svg { width: 20px; height: 20px; }

.kpi-icon-teal   { background: rgba(13,148,136,0.12);  color: #0d9488; }
.kpi-icon-green  { background: rgba(22,163,74,0.12);   color: #16a34a; }
.kpi-icon-red    { background: rgba(220,38,38,0.12);   color: #dc2626; }
.kpi-icon-blue   { background: rgba(37,99,235,0.12);   color: #2563eb; }
.kpi-icon-orange { background: rgba(234,88,12,0.12);   color: #ea580c; }

.kpi-body  { flex: 1; padding-bottom: 18px; }
.kpi-label { font-size: 12px; color: var(--text); margin: 0 0 6px; }
.kpi-value { font-size: 22px; font-weight: 700; color: var(--text-h); margin: 0; font-variant-numeric: tabular-nums; }

/* Colored bottom bar */
.kpi-accent {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
}
.kpi-accent-teal   { background: #0d9488; }
.kpi-accent-green  { background: #16a34a; }
.kpi-accent-red    { background: #dc2626; }
.kpi-accent-blue   { background: #2563eb; }
.kpi-accent-orange { background: #ea580c; }

/* ── Chart ── */
.chart-card { padding: 20px; }
.chart-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}
.chart-header h3 { margin: 0 0 2px; }
.chart-sub { font-size: 12px; color: var(--text); margin: 0; }
.chart-wrap { height: 240px; position: relative; }

/* ── Mid row ── */
.mid-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

/* ── Section card ── */
.section-card { padding: 20px; }

.sc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.sc-header h3 { margin: 0; font-size: 14px; }
.sc-link {
  background: none; border: none; cursor: pointer;
  font-size: 12px; color: var(--accent); font-family: var(--font);
  padding: 0; transition: opacity 0.15s;
}
.sc-link:hover { opacity: 0.7; }

.sc-empty {
  font-size: 13px; color: var(--text);
  text-align: center; padding: 24px 0;
}

/* ── Accounts ── */
.acc-list { display: flex; flex-direction: column; gap: 8px; }
.acc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 9px;
  border: 1px solid var(--border);
  background: var(--muted);
  transition: background 0.12s;
}
.acc-item:hover { background: var(--accent-bg); }
.acc-badge {
  width: 34px; height: 34px; border-radius: 9px;
  font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.acc-info { flex: 1; min-width: 0; }
.acc-name { font-size: 13px; font-weight: 600; color: var(--text-h); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-type { font-size: 11px; color: var(--text); margin: 0; }
.acc-balance { font-size: 14px; font-weight: 700; white-space: nowrap; margin: 0; }

/* ── Budgets ── */
.budget-list { display: flex; flex-direction: column; gap: 16px; }
.budget-item  { display: flex; flex-direction: column; gap: 6px; }

.bi-top  { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.bi-name { font-size: 13px; font-weight: 600; color: var(--text-h); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.bi-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.bi-pct  { font-size: 13px; font-weight: 700; }

.bi-status-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 99px;
}
.status-ok      { background: rgba(22,163,74,.1);  color: #15803d; }
.status-alert   { background: rgba(202,138,4,.1);  color: #a16207; }
.status-warning { background: rgba(234,88,12,.1);  color: #c2410c; }
.status-danger  { background: rgba(220,38,38,.1);  color: #dc2626; }

.bi-track { height: 6px; background: var(--border); border-radius: 99px; overflow: hidden; }
.bi-bar   { height: 100%; border-radius: 99px; transition: width 0.5s ease; }

.bi-bottom { display: flex; justify-content: space-between; font-size: 11px; color: var(--text); }
.bi-sep    { opacity: 0.4; }
.bi-over   { color: #dc2626; font-weight: 600; }
.bi-rem    { color: var(--text); }

/* ── Transactions table ── */
.tx-desc-cell {
  display: flex; align-items: center; gap: 8px;
}
.tx-type-dot {
  width: 7px; height: 7px;
  border-radius: 50%; flex-shrink: 0;
}
.dot-green { background: #16a34a; }
.dot-red   { background: #dc2626; }
.tx-desc   { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.tx-date   { font-size: 12px; color: var(--text); white-space: nowrap; }
.tx-amount { font-weight: 700; font-size: 13px; white-space: nowrap; font-variant-numeric: tabular-nums; }
.tx-income  { color: #16a34a; }
.tx-expense { color: #dc2626; }

/* ── Spinner ── */
.spinner-sm {
  width: 13px; height: 13px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 900px) {
  .mid-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .kpi-grid   { grid-template-columns: 1fr 1fr; gap: 10px; }
  .kpi-value  { font-size: 18px; }
  .chart-wrap { height: 190px; }
}
@media (max-width: 420px) {
  .kpi-grid { grid-template-columns: 1fr; }
}
</style>