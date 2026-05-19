<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api'

const loading  = ref(false)
const errorMsg = ref('')
const summary  = ref(null)

const fetchSummary = async () => {
  errorMsg.value = ''
  loading.value  = true
  try {
    const { data } = await api.get('/api/dashboard/summary')
    summary.value = data.data
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al cargar el resumen.'
  } finally {
    loading.value = false
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

onMounted(fetchSummary)
</script>

<template>
  <div class="dashboard-page">

    <div class="page-header">
      <h2>Dashboard</h2>
      <p class="page-sub">Resumen de tu situación financiera</p>
    </div>

    <!-- Error -->
    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <!-- Loading -->
    <div v-if="loading" class="state-box">
      <span class="spinner"></span>
      <p>Cargando resumen…</p>
    </div>

    <template v-else-if="summary">

      <!-- Summary cards -->
      <div class="cards-grid">
        <div class="card stat-card balance">
          <p class="stat-label">💰 Balance total</p>
          <p class="stat-value">{{ fmt(summary.totalBalance) }}</p>
        </div>
        <div class="card stat-card income">
          <p class="stat-label">📈 Total ingresos</p>
          <p class="stat-value">{{ fmt(summary.totalIncome) }}</p>
        </div>
        <div class="card stat-card expenses">
          <p class="stat-label">📉 Total gastos</p>
          <p class="stat-value">{{ fmt(summary.totalExpenses) }}</p>
        </div>
      </div>

      <div class="card">
        <div class="section-header">
          <h3>Últimas transacciones</h3>
          <router-link to="/transactions" class="see-all">Ver todas →</router-link>
        </div>

        <div v-if="!summary.latestTransactions?.length" class="state-box small">
          <p class="empty-icon">📋</p>
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

.page-header { margin-bottom: 4px; }
.page-sub    { font-size: 13px; color: var(--text); margin-top: 2px; }

.cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.stat-card   { text-align: center; }
.stat-label  { font-size: 13px; color: var(--text); margin-bottom: 8px; }
.stat-value  { font-size: 24px; font-weight: 700; color: var(--text-h); margin: 0; }
.stat-card.balance  .stat-value { color: var(--accent); }
.stat-card.income   .stat-value { color: #16a34a; }
.stat-card.expenses .stat-value { color: #dc2626; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.section-header h3 { margin: 0; }
.see-all { font-size: 13px; color: var(--accent); text-decoration: none; }
.see-all:hover { text-decoration: underline; }

/* Table */
.table-wrap { overflow-x: auto; }
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
th {
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
td {
  padding: 12px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--text-h);
  vertical-align: middle;
}
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--accent-bg); }

.tx-desc { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-date { font-size: 13px; color: var(--text); white-space: nowrap; }
.amount-income  { font-weight: 600; color: #16a34a; }
.amount-expense { font-weight: 600; color: #dc2626; }

/* States */
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
.state-box.small { padding: 32px 16px; }
.empty-icon { font-size: 36px; margin: 0; }

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-msg {
  font-size: 13px;
  color: #dc2626;
  margin: 0;
  padding: 10px 14px;
  background: rgba(220, 38, 38, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

@media (max-width: 768px) {
  .cards-grid { grid-template-columns: 1fr; }
  th, td { padding: 10px 8px; }
}
@media (max-width: 480px) {
  .stat-value { font-size: 20px; }
}
</style>
