<script setup>
import { ref, reactive, computed, watch } from 'vue'
import api from '../services/api'

const props = defineProps({
  modelValue: Boolean,
  mode:        { type: String, default: 'create' },
  transaction: { type: Object, default: null },
  accounts:    { type: Array,  default: () => [] },
  categories:  { type: Array,  default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const saving = ref(false)
const error  = ref('')

const TYPES = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'gasto',   label: 'Gasto'   },
]

const emptyForm = () => ({
  type:        'gasto',
  amount:      '',
  categoryId:  '',
  accountId:   '',
  date:        '',
  description: '',
})

const form = reactive(emptyForm())

// Solo cuentas activas
const activeAccounts = computed(() =>
  props.accounts.filter((a) => a.status === 'active')
)

// Categorías compatibles con el tipo seleccionado
// Si la categoría tiene campo `type`, debe coincidir o ser 'ambos'
const compatibleCategories = computed(() =>
  props.categories.filter((c) => !c.type || c.type === 'ambos' || c.type === form.type)
)

// Al abrir el modal, inicializar el formulario
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    error.value = ''
    if (props.mode === 'edit' && props.transaction) {
      Object.assign(form, {
        type:        props.transaction.type        || 'gasto',
        amount:      props.transaction.amount      || '',
        categoryId:  props.transaction.categoryId  || '',
        accountId:   props.transaction.accountId   || '',
        date:        (props.transaction.date || '').slice(0, 10),
        description: props.transaction.description || '',
      })
    } else {
      Object.assign(form, emptyForm())
    }
  }
)

// Si el tipo cambia, limpiar categoría incompatible
watch(
  () => form.type,
  (newType) => {
    const cat = props.categories.find((c) => c.id === form.categoryId)
    if (cat && cat.type && cat.type !== 'ambos' && cat.type !== newType) {
      form.categoryId = ''
    }
  }
)

const validate = () => {
  if (!form.type)
    return 'Selecciona un tipo de transacción.'

  if (!form.amount || isNaN(Number(form.amount)))
    return 'Ingresa un monto válido.'
  if (Number(form.amount) <= 0)
    return 'El monto debe ser mayor a $0.'

  if (!form.accountId)
    return 'Selecciona una cuenta.'

  const account = props.accounts.find((a) => a.id === form.accountId)
  if (account && account.status !== 'active')
    return `La cuenta "${account.name}" no está activa.`

  if (!form.categoryId)
    return 'Selecciona una categoría.'

  const category = props.categories.find((c) => c.id === form.categoryId)
  if (category && category.type && category.type !== 'ambos' && category.type !== form.type)
    return `La categoría "${category.name}" no es compatible con el tipo "${form.type}".`

  if (!form.date)
    return 'La fecha es requerida.'

  return null
}

const save = async () => {
  const validationError = validate()
  if (validationError) { error.value = validationError; return }

  saving.value = true
  error.value  = ''
  try {
    const payload = {
      type:        form.type,
      amount:      Number(form.amount),
      categoryId:  form.categoryId,
      accountId:   form.accountId,
      date:        form.date,
      description: form.description.trim(),
    }
    if (props.mode === 'create') {
      await api.post('/api/transactions', payload)
    } else {
      await api.put(`/api/transactions/${props.transaction.id}`, payload)
    }
    emit('saved')
    close()
  } catch (err) {
    error.value = err.response?.data?.message || 'Error al guardar la transacción.'
  } finally {
    saving.value = false
  }
}

const close = () => {
  if (saving.value) return
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-backdrop" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">

        <div class="modal-header">
          <h3 id="modal-title">
            {{ mode === 'create' ? 'Nueva transacción' : 'Editar transacción' }}
          </h3>
          <button class="close-btn" @click="close" :disabled="saving" aria-label="Cerrar">✕</button>
        </div>

        <div class="modal-body">

          <!-- Tipo -->
          <div class="field">
            <label>Tipo *</label>
            <div class="type-toggle">
              <button
                v-for="t in TYPES"
                :key="t.value"
                class="type-btn"
                :class="{ active: form.type === t.value, [t.value]: true }"
                :disabled="saving"
                @click="form.type = t.value"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Monto -->
          <div class="field">
            <label>Monto *</label>
            <div class="input-prefix">
              <span class="prefix">$</span>
              <input
                v-model="form.amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                :disabled="saving"
              />
            </div>
            <p v-if="form.amount && Number(form.amount) <= 0" class="field-hint error">
              El monto debe ser mayor a $0.
            </p>
          </div>

          <!-- Cuenta -->
          <div class="field">
            <label>Cuenta * <span class="hint">(solo cuentas activas)</span></label>
            <select v-model="form.accountId" :disabled="saving">
              <option value="">Selecciona una cuenta</option>
              <option v-for="a in activeAccounts" :key="a.id" :value="a.id">
                {{ a.name }} — {{ a.currency || 'MXN' }}
              </option>
            </select>
            <p v-if="accounts.length && !activeAccounts.length" class="field-hint error">
              No tienes cuentas activas disponibles.
            </p>
          </div>

          <!-- Categoría -->
          <div class="field">
            <label>Categoría * <span class="hint">(compatible con el tipo)</span></label>
            <select v-model="form.categoryId" :disabled="saving">
              <option value="">Selecciona una categoría</option>
              <option v-for="c in compatibleCategories" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
            <p v-if="categories.length && !compatibleCategories.length" class="field-hint error">
              No hay categorías disponibles para el tipo "{{ form.type }}".
            </p>
          </div>

          <!-- Fecha -->
          <div class="field">
            <label>Fecha *</label>
            <input v-model="form.date" type="date" :disabled="saving" />
          </div>

          <!-- Descripción -->
          <div class="field">
            <label>Descripción <span class="hint">(opcional)</span></label>
            <input
              v-model="form.description"
              type="text"
              placeholder="Ej. Pago de renta"
              maxlength="200"
              :disabled="saving"
            />
          </div>

          <!-- Error global -->
          <p v-if="error" class="error-msg">{{ error }}</p>

        </div>

        <div class="modal-footer">
          <button class="btn-ghost" @click="close" :disabled="saving">Cancelar</button>
          <button class="btn-primary" @click="save" :disabled="saving">
            <span v-if="saving" class="btn-spinner"></span>
            {{ saving ? 'Guardando...' : mode === 'create' ? 'Crear transacción' : 'Guardar cambios' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Backdrop & modal ────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 16px;
}

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-md);
  max-height: 90vh;
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.modal-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-h); }

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}
.close-btn:hover { color: var(--text-h); }

/* ── Body ────────────────────────────────────────────────────── */
.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

/* ── Footer ──────────────────────────────────────────────────── */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

/* ── Fields ──────────────────────────────────────────────────── */
.field { display: flex; flex-direction: column; gap: 5px; }
.field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-h);
  display: flex;
  align-items: center;
  gap: 6px;
}
.hint { font-weight: 400; color: var(--text); font-size: 12px; }

.field input,
.field select {
  padding: 9px 12px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;
}
.field input:focus,
.field select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}
.field input:disabled,
.field select:disabled { opacity: 0.6; }

/* Prefix $*/
.input-prefix { position: relative; }
.prefix {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text);
  font-size: 14px;
  pointer-events: none;
}
.input-prefix input { padding-left: 26px; }

/* ── Type toggle ─────────────────────────────────────────────── */
.type-toggle { display: flex; gap: 8px; }
.type-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.type-btn.active.ingreso {
  background: rgba(22, 163, 74, 0.1);
  border-color: #16a34a;
  color: #16a34a;
}
.type-btn.active.gasto {
  background: rgba(220, 38, 38, 0.1);
  border-color: #dc2626;
  color: #dc2626;
}
.type-btn:not(.active):hover { border-color: var(--accent); color: var(--accent); }

/* ── Hints & errors ──────────────────────────────────────────── */
.field-hint { font-size: 12px; margin: 0; }
.field-hint.error { color: #dc2626; }

.error-msg {
  font-size: 13px;
  color: #dc2626;
  margin: 0;
  padding: 10px 14px;
  background: rgba(220, 38, 38, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

/* ── Buttons ─────────────────────────────────────────────────── */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
}
.btn-primary:hover    { background: var(--accent-soft); }
.btn-primary:active   { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-ghost {
  padding: 9px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: none;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.btn-ghost:hover    { border-color: var(--accent); color: var(--accent); }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* spinner dentro del botón */
.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>