<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCategoriesStore } from '../stores/categories'
import api from '../services/api'

const store = useCategoriesStore()

const txLoading    = ref(false)
const monthlyTx    = ref([])

const today        = new Date()
const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

const loadMonthlyTx = async () => {
  txLoading.value = true
  try {
    const firstDay = `${currentMonth}-01`
    const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString().slice(0, 10)
    const { data } = await api.get('/api/transactions', {
      params: { startDate: firstDay, endDate: lastDay },
    })
    monthlyTx.value = data.data || []
  } catch {
    monthlyTx.value = []
  } finally {
    txLoading.value = false
  }
}

const spentByCategory = computed(() => {
  const map = {}
  monthlyTx.value
    .filter((t) => t.type === 'gasto')
    .forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + (t.amount || 0)
    })
  return map
})

const incomeByCategory = computed(() => {
  const map = {}
  monthlyTx.value
    .filter((t) => t.type === 'ingreso')
    .forEach((t) => {
      map[t.categoryId] = (map[t.categoryId] || 0) + (t.amount || 0)
    })
  return map
})

const fmt = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n ?? 0)

const ICONS = ['🏠','🍔','🚗','✈️','💊','📚','🎮','🛍️','💡','🎵','🏋️','💼','💰','📈','🎁','🍕']
const COLORS = ['#7c3aed','#2563eb','#16a34a','#dc2626','#d97706','#db2777','#0891b2','#65a30d']

const showForm   = ref(false)
const editTarget = ref(null)
const saving     = ref(false)
const formError  = ref('')
const form = ref({ name: '', type: 'gasto', icon: '', color: '' })

const openCreate = () => {
  editTarget.value = null
  form.value = { name: '', type: 'gasto', icon: '', color: '' }
  formError.value = ''
  showForm.value = true
}
const openEdit = (cat) => {
  editTarget.value = cat
  form.value = { name: cat.name, type: cat.type, icon: cat.icon || '', color: cat.color || '' }
  formError.value = ''
  showForm.value = true
}
const closeForm = () => { showForm.value = false }
const saveForm = async () => {
  if (!form.value.name.trim()) { formError.value = 'El nombre es requerido.'; return }
  saving.value = true
  formError.value = ''
  try {
    const payload = { name: form.value.name.trim(), type: form.value.type, icon: form.value.icon || null, color: form.value.color || null }
    if (editTarget.value) await store.update(editTarget.value.id, payload)
    else await store.create(payload)
    closeForm()
  } catch (e) {
    formError.value = e.response?.data?.message || 'Error al guardar.'
  } finally {
    saving.value = false
  }
}
onMounted(async () => {
  await store.fetchAll()
  loadMonthlyTx()
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>Categorías</h2>
        <p class="subtitle">Organiza tus ingresos y gastos con categorías personalizadas.</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Nueva categoría</button>
    </div>

    <div class="month-badge">
      <span>📅 Movimientos mostrados: {{ new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }) }}</span>
    </div>

    <div v-if="store.loading" class="state-msg">Cargando categorías…</div>
    <div v-else-if="store.error" class="state-msg error">{{ store.error }}</div>

    <template v-else>
      <section class="section">
        <h3 class="section-title"><span class="dot green"></span> Ingresos <span class="count">{{ store.ingresos.length }}</span></h3>
        <div v-if="store.ingresos.length === 0" class="empty">Sin categorías de ingreso.</div>
        <div class="cat-grid">
          <div v-for="cat in store.ingresos" :key="cat.id" class="cat-card" :style="cat.color ? `border-left: 4px solid ${cat.color}` : ''">
            <div class="cat-icon" :style="cat.color ? `background:${cat.color}22` : ''">{{ cat.icon || '💰' }}</div>
            <div class="cat-info">
              <span class="cat-name">{{ cat.name }}</span>
              <span class="badge badge-green">ingreso</span>
              <span v-if="incomeByCategory[cat.id]" class="cat-amount income-amount">
                +{{ fmt(incomeByCategory[cat.id]) }}
              </span>
            </div>
            <button v-if="cat.userId !== 'system'" class="btn-edit" @click="openEdit(cat)">✎</button>
          </div>
        </div>
      </section>

      <section class="section">
        <h3 class="section-title"><span class="dot red"></span> Gastos <span class="count">{{ store.gastos.length }}</span></h3>
        <div v-if="store.gastos.length === 0" class="empty">Sin categorías de gasto.</div>
        <div class="cat-grid">
          <div v-for="cat in store.gastos" :key="cat.id" class="cat-card" :style="cat.color ? `border-left: 4px solid ${cat.color}` : ''">
            <div class="cat-icon" :style="cat.color ? `background:${cat.color}22` : ''">{{ cat.icon || '🏷️' }}</div>
            <div class="cat-info">
              <span class="cat-name">{{ cat.name }}</span>
              <span class="badge badge-red">gasto</span>
              <span v-if="spentByCategory[cat.id]" class="cat-amount expense-amount">
                -{{ fmt(spentByCategory[cat.id]) }}
              </span>
            </div>
            <button v-if="cat.userId !== 'system'" class="btn-edit" @click="openEdit(cat)">✎</button>
          </div>
        </div>
      </section>
    </template>

    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editTarget ? 'Editar categoría' : 'Nueva categoría' }}</h3>
          <button class="close-btn" @click="closeForm">✕</button>
        </div>
        <div class="form-group">
          <label>Nombre *</label>
          <input v-model="form.name" placeholder="Ej. Alimentación" />
        </div>
        <div class="form-group">
          <label>Tipo *</label>
          <div class="type-toggle">
            <button :class="{ active: form.type === 'gasto' }" @click="form.type = 'gasto'">Gasto</button>
            <button :class="{ active: form.type === 'ingreso' }" @click="form.type = 'ingreso'">Ingreso</button>
          </div>
        </div>
        <div class="form-group">
          <label>Ícono (opcional)</label>
          <div class="icon-picker">
            <button v-for="icon in ICONS" :key="icon" :class="{ selected: form.icon === icon }" @click="form.icon = form.icon === icon ? '' : icon" class="icon-btn">{{ icon }}</button>
          </div>
        </div>
        <div class="form-group">
          <label>Color (opcional)</label>
          <div class="color-picker">
            <button v-for="color in COLORS" :key="color" :class="{ selected: form.color === color }" @click="form.color = form.color === color ? '' : color" class="color-btn" :style="`background: ${color}`"></button>
          </div>
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="closeForm">Cancelar</button>
          <button class="btn-primary" :disabled="saving" @click="saveForm">{{ saving ? 'Guardando…' : (editTarget ? 'Actualizar' : 'Crear') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 28px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.subtitle { font-size: 13px; color: var(--text); margin-top: 2px; }
.section { display: flex; flex-direction: column; gap: 12px; }
.section-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text-h); }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot.green { background: #16a34a; }
.dot.red   { background: #dc2626; }
.count { margin-left: auto; font-size: 12px; font-weight: 500; background: var(--accent-bg); color: var(--accent); padding: 1px 8px; border-radius: 99px; }
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.cat-card { display: flex; align-items: center; gap: 12px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; box-shadow: var(--shadow-sm); transition: box-shadow 0.15s; }
.cat-card:hover { box-shadow: var(--shadow-md); }
.cat-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 18px; background: var(--accent-bg); flex-shrink: 0; }
.cat-info { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.cat-name { font-size: 14px; font-weight: 500; color: var(--text-h); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-edit { background: none; border: 1px solid var(--border); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; color: var(--text); font-size: 14px; flex-shrink: 0; transition: border-color 0.15s, color 0.15s; }
.btn-edit:hover { border-color: var(--accent); color: var(--accent); }
.btn-primary { background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity 0.15s; }
.btn-primary:hover:not(:disabled) { opacity: 0.88; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost { background: none; border: 1px solid var(--border); border-radius: 8px; padding: 9px 18px; font-size: 14px; cursor: pointer; color: var(--text); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
.modal { background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-md); padding: 24px; width: 100%; max-width: 440px; display: flex; flex-direction: column; gap: 18px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; }
.modal-header h3 { margin: 0; font-size: 16px; }
.close-btn { background: none; border: none; cursor: pointer; font-size: 16px; color: var(--text); padding: 4px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 13px; font-weight: 500; color: var(--text-h); }
.form-group input { border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px; font-size: 14px; background: var(--bg); color: var(--text-h); outline: none; transition: border-color 0.15s; }
.form-group input:focus { border-color: var(--accent); }
.type-toggle { display: flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.type-toggle button { flex: 1; border: none; background: none; padding: 8px; font-size: 13px; cursor: pointer; color: var(--text); transition: background 0.15s, color 0.15s; }
.type-toggle button.active { background: var(--accent); color: #fff; font-weight: 600; }
.icon-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.icon-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border); background: none; font-size: 18px; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
.icon-btn:hover    { border-color: var(--accent); }
.icon-btn.selected { border-color: var(--accent); background: var(--accent-bg); }
.color-picker { display: flex; flex-wrap: wrap; gap: 8px; }
.color-btn { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s, border-color 0.15s; }
.color-btn:hover    { transform: scale(1.15); }
.color-btn.selected { border-color: var(--text-h); transform: scale(1.15); }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.form-error { font-size: 13px; color: #dc2626; margin: 0; }
.state-msg { text-align: center; color: var(--text); padding: 40px 0; }
.state-msg.error { color: #dc2626; }
.empty { font-size: 13px; color: var(--text); padding: 8px 0; }

.month-badge {
  font-size: 12px;
  color: var(--text);
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
  border-radius: 99px;
  padding: 4px 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
}

.cat-amount { font-size: 12px; font-weight: 600; font-family: var(--mono); margin-top: 1px; }
.income-amount  { color: #16a34a; }
.expense-amount { color: #dc2626; }
</style>
