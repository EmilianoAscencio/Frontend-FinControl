<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '../services/api'

const categories = ref([])
const loading    = ref(false)
const errorMsg   = ref('')

const showModal  = ref(false)
const modalMode  = ref('create')
const modalError = ref('')
const saving     = ref(false)
const editingId  = ref(null)

const TYPES = [
  { value: 'gasto',   label: 'Gasto'   },
  { value: 'ingreso', label: 'Ingreso' },
]

const ICONS = ['🏠','🍔','🚗','🎓','💊','🛒','✈️','🎮','👗','💡','🐾','📱','💰','💼','🎁','🏋️']

const emptyForm = () => ({ name: '', type: 'gasto', icon: '🏠' })
const form      = reactive(emptyForm())

const fetchCategories = async () => {
  loading.value  = true
  errorMsg.value = ''
  try {
    const { data } = await api.get('/api/categories')
    categories.value = data.data ?? []
  } catch (err) {
    errorMsg.value = err.response?.data?.message ?? 'Error al cargar categorías.'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  modalMode.value  = 'create'
  modalError.value = ''
  editingId.value  = null
  Object.assign(form, emptyForm())
  showModal.value  = true
}

const openEdit = (cat) => {
  modalMode.value  = 'edit'
  modalError.value = ''
  editingId.value  = cat.id
  form.name = cat.name
  form.type = cat.type
  form.icon = cat.icon ?? '🏠'
  showModal.value  = true
}

const closeModal = () => { if (!saving.value) showModal.value = false }

const save = async () => {
  modalError.value = ''
  if (!form.name.trim()) { modalError.value = 'El nombre es requerido.'; return }
  if (!form.type)        { modalError.value = 'El tipo es requerido.';   return }
  saving.value = true
  try {
    const payload = { name: form.name.trim(), type: form.type, icon: form.icon }
    if (modalMode.value === 'create') await api.post('/api/categories', payload)
    else                              await api.put(`/api/categories/${editingId.value}`, payload)
    showModal.value = false
    await fetchCategories()
  } catch (err) {
    modalError.value = err.response?.data?.message ?? 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

const typeLabel = (t) => TYPES.find((x) => x.value === t)?.label ?? t

const gastos   = computed(() => categories.value.filter((c) => c.type === 'gasto'   || c.type === 'expense'))
const ingresos = computed(() => categories.value.filter((c) => c.type === 'ingreso' || c.type === 'income'))

onMounted(fetchCategories)
</script>

<template>
  <div class="cat-page">

    <div class="page-header">
      <div>
        <h2>Categorías</h2>
        <p class="page-sub">Organiza tus ingresos y gastos por categoría</p>
      </div>
      <button class="btn-primary" @click="openCreate">+ Nueva categoría</button>
    </div>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

    <div v-if="loading" class="state-box">
      <span class="spinner"></span>
      <p>Cargando categorías…</p>
    </div>

    <div v-else-if="!categories.length" class="state-box card">
      <p class="empty-icon">🏷</p>
      <p>No hay categorías registradas.</p>
      <button class="btn-primary" @click="openCreate">Crear primera categoría</button>
    </div>

    <template v-else>
      <!-- Gastos -->
      <div class="card section-card">
        <div class="section-title">
          <span class="badge badge-red">Gastos</span>
          <span class="count">{{ gastos.length }} categorías</span>
        </div>
        <div v-if="!gastos.length" class="state-box small">
          <p class="empty-icon">—</p>
          <p>Sin categorías de gasto.</p>
        </div>
        <div v-else class="cat-grid">
          <div v-for="cat in gastos" :key="cat.id" class="cat-chip">
            <span class="cat-icon">{{ cat.icon ?? '📦' }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <button class="btn-ghost btn-sm" @click="openEdit(cat)">Editar</button>
          </div>
        </div>
      </div>

      <!-- Ingresos -->
      <div class="card section-card">
        <div class="section-title">
          <span class="badge badge-green">Ingresos</span>
          <span class="count">{{ ingresos.length }} categorías</span>
        </div>
        <div v-if="!ingresos.length" class="state-box small">
          <p class="empty-icon">—</p>
          <p>Sin categorías de ingreso.</p>
        </div>
        <div v-else class="cat-grid">
          <div v-for="cat in ingresos" :key="cat.id" class="cat-chip">
            <span class="cat-icon">{{ cat.icon ?? '📦' }}</span>
            <span class="cat-name">{{ cat.name }}</span>
            <button class="btn-ghost btn-sm" @click="openEdit(cat)">Editar</button>
          </div>
        </div>
      </div>
    </template>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>{{ modalMode === 'create' ? 'Nueva categoría' : 'Editar categoría' }}</h3>
            <button class="close-btn" @click="closeModal" :disabled="saving">✕</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label>Nombre *</label>
              <input v-model="form.name" type="text" placeholder="Ej. Alimentación" :disabled="saving" @keyup.enter="save" />
            </div>
            <div class="field">
              <label>Tipo *</label>
              <div class="type-row">
                <button
                  v-for="t in TYPES" :key="t.value"
                  class="type-btn"
                  :class="{ 'active-gasto': t.value === 'gasto' && form.type === t.value, 'active-ingreso': t.value === 'ingreso' && form.type === t.value }"
                  @click="form.type = t.value" :disabled="saving"
                >{{ t.label }}</button>
              </div>
            </div>
            <div class="field">
              <label>Ícono</label>
              <div class="icon-grid">
                <button
                  v-for="ico in ICONS" :key="ico"
                  class="icon-btn"
                  :class="{ selected: form.icon === ico }"
                  @click="form.icon = ico" :disabled="saving"
                >{{ ico }}</button>
              </div>
            </div>
            <p v-if="modalError" class="error-msg">{{ modalError }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn-ghost" @click="closeModal" :disabled="saving">Cancelar</button>
            <button class="btn-primary" @click="save" :disabled="saving">
              {{ saving ? 'Guardando…' : modalMode === 'create' ? 'Crear' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
.cat-page { display: flex; flex-direction: column; gap: 20px; }

.section-card { padding: 20px 24px; }
.section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.count { font-size: 13px; color: var(--text); }

/* Grid de chips */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.cat-chip {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--border); border-radius: 10px;
  background: var(--bg);
  transition: border-color .15s;
}
.cat-chip:hover { border-color: var(--accent); }
.cat-icon { font-size: 18px; flex-shrink: 0; }
.cat-name { font-size: 14px; font-weight: 500; color: var(--text-h); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-sm   { padding: 4px 10px; font-size: 12px; flex-shrink: 0; }

/* Tipo toggle */
.type-row { display: flex; gap: 8px; }
.type-btn {
  flex: 1; padding: 8px; border: 1.5px solid var(--border);
  border-radius: 8px; background: none; cursor: pointer;
  font-size: 13px; font-weight: 500; color: var(--text); transition: all .15s;
}
.active-gasto   { border-color: #dc2626; background: rgba(220,38,38,.06); color: #dc2626; font-weight: 600; }
.active-ingreso { border-color: #16a34a; background: rgba(22,163,74,.06); color: #16a34a; font-weight: 600; }

/* Selector de íconos */
.icon-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.icon-btn {
  width: 36px; height: 36px; border: 1.5px solid var(--border);
  border-radius: 8px; background: var(--bg); cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: border-color .15s;
}
.icon-btn:hover   { border-color: var(--accent); }
.icon-btn.selected { border-color: var(--accent); background: var(--accent-bg); }

/* Form inputs */
.field input, .field select {
  padding: 8px 12px; border: 1.5px solid var(--border); border-radius: 8px;
  background: var(--bg); color: var(--text-h); font-size: 14px; outline: none;
  transition: border-color .2s; width: 100%;
}
.field input:focus, .field select:focus { border-color: var(--accent); }

.state-box { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 48px 24px; color: var(--text); font-size: 14px; }
.state-box.small { padding: 24px; }
.empty-icon { font-size: 36px; margin: 0; }
.spinner { width: 28px; height: 28px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin .7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>