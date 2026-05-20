<script setup>
import { reactive, computed, watch } from 'vue'

const props = defineProps({
  show:       { type: Boolean, required: true },
  mode:       { type: String,  default: 'create' },
  initial:    { type: Object,  default: () => ({}) },
  accounts:   { type: Array,   default: () => [] },
  categories: { type: Array,   default: () => [] },
  saving:     { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'submit'])

const TYPES = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'gasto',   label: 'Gasto'   },
]

const emptyForm = () => ({ type: 'gasto', amount: '', categoryId: '', accountId: '', date: '' })
const form      = reactive(emptyForm())
const error     = reactive({ message: '' })

watch(() => props.show, (val) => {
  if (val) {
    Object.assign(form, emptyForm(), props.initial)
    error.message = ''
  }
})

// Solo categorías compatibles con el tipo seleccionado
const filteredCategories = computed(() =>
  props.categories.filter((c) => c.type === form.type)
)

// Solo cuentas activas
const activeAccounts = computed(() =>
  props.accounts.filter((a) => a.status === 'active')
)

const validate = () => {
  if (!form.amount || Number(form.amount) <= 0) {
    error.message = 'El monto debe ser mayor a 0.'; return false
  }
  if (!form.categoryId) {
    error.message = 'Selecciona una categoría.'; return false
  }
  if (!form.accountId) {
    error.message = 'Selecciona una cuenta activa.'; return false
  }
  if (!form.date) {
    error.message = 'La fecha es requerida.'; return false
  }
  return true
}

const submit = () => {
  error.message = ''
  if (!validate()) return
  emit('submit', { ...form, amount: Number(form.amount) })
}

const close = () => { if (props.saving) return; emit('close') }
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click.self="close">
      <div class="modal" role="dialog" aria-modal="true">

        <div class="modal-header">
          <h3>{{ mode === 'create' ? 'Nueva transacción' : 'Editar transacción' }}</h3>
          <button class="close-btn" @click="close" :disabled="saving">✕</button>
        </div>

        <div class="modal-body">
          <div class="field">
            <label>Tipo *</label>
            <select v-model="form.type" :disabled="saving" @change="form.categoryId = ''">
              <option v-for="t in TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>

          <div class="field">
            <label>Monto *</label>
            <input v-model.number="form.amount" type="number" min="0.01" step="0.01" placeholder="0.00" :disabled="saving" />
          </div>

          <div class="field">
            <label>Categoría *</label>
            <select v-model="form.categoryId" :disabled="saving">
              <option value="">Selecciona una categoría</option>
              <option v-for="c in filteredCategories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <span v-if="form.type && !filteredCategories.length" class="field-hint">
              No hay categorías para este tipo.
            </span>
          </div>

          <div class="field">
            <label>Cuenta *</label>
            <select v-model="form.accountId" :disabled="saving">
              <option value="">Selecciona una cuenta</option>
              <option v-for="a in activeAccounts" :key="a.id" :value="a.id">{{ a.name }}</option>
            </select>
          </div>

          <div class="field">
            <label>Fecha *</label>
            <input v-model="form.date" type="date" :disabled="saving" />
          </div>

          <p v-if="error.message" class="error-msg">{{ error.message }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn-ghost" @click="close" :disabled="saving">Cancelar</button>
          <button class="btn-primary" @click="submit" :disabled="saving">
            {{ saving ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Guardar cambios' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.field-hint { font-size: 12px; color: var(--text); margin-top: 2px; }
</style>