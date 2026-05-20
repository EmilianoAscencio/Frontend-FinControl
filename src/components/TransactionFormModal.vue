<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import api from '../services/api'

const props = defineProps({
  show:        { type: Boolean,  default: false },
  transaction: { type: Object,   default: null  }, // null = crear
})

const emit = defineEmits(['close', 'saved'])

// ── Datos auxiliares ──────────────────────────────────
const accounts   = ref([])
const categories = ref([])

onMounted(async () => {
  const [accRes, catRes] = await Promise.all([
    api.get('/api/accounts'),
    api.get('/api/categories'),
  ])
  accounts.value   = accRes.data.data ?? []
  categories.value = catRes.data.data ?? []
})

// ── Formulario ────────────────────────────────────────
const TYPES = [
  { value: 'gasto',   label: '↓ Gasto'   },
  { value: 'ingreso', label: '↑ Ingreso'  },
]

const emptyForm = () => ({
  type:        'gasto',
  amount:      '',
  accountId:   '',
  categoryId:  '',
  date:        new Date().toISOString().split('T')[0],
  description: '',
})

const form     = ref(emptyForm())
const errors   = ref({})
const saving   = ref(false)
const saveErr  = ref('')

// Llenar / resetear al abrir
watch(() => props.show, (open) => {
  if (!open) return
  errors.value  = {}
  saveErr.value = ''
  form.value    = props.transaction
    ? {
        type:        props.transaction.type,
        amount:      props.transaction.amount,
        accountId:   props.transaction.accountId   ?? '',
        categoryId:  props.transaction.categoryId  ?? '',
        date:        (props.transaction.date ?? '').slice(0, 10),
        description: props.transaction.description ?? '',
      }
    : emptyForm()
})

// Limpiar categoría si cambia el tipo
watch(() => form.value.type, () => { form.value.categoryId = '' })

// ── Cómputos ──────────────────────────────────────────
// Solo cuentas activas
const activeAccounts = computed(() =>
  accounts.value.filter((a) => a.status === 'active')
)

// Solo categorías compatibles con el tipo elegido
const compatibleCategories = computed(() =>
  categories.value.filter((c) => c.type === form.value.type || c.type === (form.value.type === 'ingreso' ? 'income' : 'expense'))
)

const isEditing = computed(() => !!props.transaction)
const title     = computed(() => isEditing.value ? 'Editar transacción' : 'Nueva transacción')

// ── Validación ────────────────────────────────────────
const validate = () => {
  const e = {}
  if (!form.value.amount || Number(form.value.amount) <= 0)
    e.amount = 'El monto debe ser mayor a cero'
  if (!form.value.accountId)
    e.accountId = 'Selecciona una cuenta'
  else if (!activeAccounts.value.find((a) => a.id === form.value.accountId))
    e.accountId = 'La cuenta no está activa'
  if (!form.value.categoryId)
    e.categoryId = 'Selecciona una categoría'
  if (!form.value.date)
    e.date = 'La fecha es requerida'
  errors.value = e
  return Object.keys(e).length === 0
}

// ── Guardar ───────────────────────────────────────────
const save = async () => {
  saveErr.value = ''
  if (!validate()) return
  saving.value = true
  try {
    const payload = { ...form.value, amount: Number(form.value.amount) }
    if (isEditing.value) await api.put(`/api/transactions/${props.transaction.id}`, payload)
    else                 await api.post('/api/transactions', payload)
    emit('saved')
    emit('close')
  } catch (err) {
    saveErr.value = err.response?.data?.message ?? 'Error al guardar'
  } finally {
    saving.value = false
  }
}

const close = () => { if (!saving.value) emit('close') }
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true">

        <!-- Header -->
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-btn" @click="close" :disabled="saving">✕</button>
        </div>

        <!-- Body -->
        <div class="modal-body">

          <!-- Tipo -->
          <div class="field">
            <label>Tipo *</label>
            <div class="type-row">
              <button
                v-for="t in TYPES"
                :key="t.value"
                class="type-btn"
                :class="{ active: form.type === t.value, 'type-gasto': t.value === 'gasto' && form.type === t.value, 'type-ingreso': t.value === 'ingreso' && form.type === t.value }"
                @click="form.type = t.value"
                :disabled="saving"
              >{{ t.label }}</button>
            </div>
          </div>

          <!-- Monto -->
          <div class="field">
            <label>Monto *</label>
            <input
              v-model="form.amount"
              type="number" min="0.01" step="0.01" placeholder="0.00"
              :disabled="saving"
              :class="{ 'input-error': errors.amount }"
            />
            <span v-if="errors.amount" class="field-error">{{ errors.amount }}</span>
          </div>

          <!-- Cuenta -->
          <div class="field">
            <label>Cuenta (solo activas) *</label>
            <select v-model="form.accountId" :disabled="saving" :class="{ 'input-error': errors.accountId }">
              <option value="">Selecciona una cuenta</option>
              <option v-for="a in activeAccounts" :key="a.id" :value="a.id">
                {{ a.name }} — ${{ Number(a.balance ?? a.initialBalance ?? 0).toFixed(2) }}
              </option>
            </select>
            <span v-if="errors.accountId" class="field-error">{{ errors.accountId }}</span>
          </div>

          <!-- Categoría -->
          <div class="field">
            <label>Categoría *</label>
            <select v-model="form.categoryId" :disabled="saving" :class="{ 'input-error': errors.categoryId }">
              <option value="">Selecciona una categoría</option>
              <option v-for="c in compatibleCategories" :key="c.id" :value="c.id">
                {{ c.icon ?? '' }} {{ c.name }}
              </option>
            </select>
            <span v-if="errors.categoryId" class="field-error">{{ errors.categoryId }}</span>
            <span v-if="!compatibleCategories.length" class="field-hint">
              No hay categorías para "{{ form.type }}"
            </span>
          </div>

          <!-- Fecha -->
          <div class="field">
            <label>Fecha *</label>
            <input v-model="form.date" type="date" :disabled="saving" :class="{ 'input-error': errors.date }" />
            <span v-if="errors.date" class="field-error">{{ errors.date }}</span>
          </div>

          <!-- Descripción -->
          <div class="field">
            <label>Descripción <span class="optional">(opcional)</span></label>
            <input v-model="form.description" type="text" placeholder="Ej. Pago de renta" maxlength="120" :disabled="saving" />
          </div>

          <p v-if="saveErr" class="error-msg">{{ saveErr }}</p>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-ghost" @click="close" :disabled="saving">Cancelar</button>
          <button class="btn-primary" @click="save" :disabled="saving">
            {{ saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Crear transacción' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Selector de tipo */
.type-row { display: flex; gap: 8px; }
.type-btn {
  flex: 1; padding: 8px; border: 1.5px solid var(--border);
  border-radius: 8px; background: none; cursor: pointer;
  font-size: 13px; font-weight: 500; color: var(--text);
  transition: all .15s;
}
.type-btn:hover { border-color: var(--accent); color: var(--accent); }
.type-gasto   { border-color: #dc2626; background: rgba(220,38,38,.06);  color: #dc2626; font-weight: 600; }
.type-ingreso { border-color: #16a34a; background: rgba(22,163,74,.06);  color: #16a34a; font-weight: 600; }

/* Inputs con error */
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
.input-error { border-color: #dc2626 !important; }
.field-error { font-size: 12px; color: #dc2626; margin-top: 2px; }
.field-hint  { font-size: 12px; color: var(--text); }
.optional    { font-weight: 400; font-size: 12px; color: var(--text); }
</style>