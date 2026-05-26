import { defineStore } from 'pinia'
import api from '../services/api'

export const useBudgetsStore = defineStore('budgets', {
  state: () => ({
    budgets:  [],
    progress: {}, // { [budgetId]: progressData }
    loading:  false,
    error:    null,
  }),

  actions: {
    async fetchAll() {
      this.loading = true
      this.error   = null
      try {
        const { data } = await api.get('/api/budgets')
        this.budgets = data.data ?? data
      } catch (e) {
        this.error = e.response?.data?.message ?? 'Error al cargar presupuestos'
      } finally {
        this.loading = false
      }
    },

    async fetchProgress(budgetId) {
      try {
        const { data } = await api.get(`/api/budgets/${budgetId}/progress`)
        this.progress[budgetId] = data.data ?? data
      } catch {}
    },

    async create(payload) {
      const { data } = await api.post('/api/budgets', payload)
      const budget   = data.data ?? data
      this.budgets.push(budget)
      return budget
    },

    async update(id, payload) {
      const { data } = await api.put(`/api/budgets/${id}`, payload)
      const updated  = data.data ?? data
      const idx = this.budgets.findIndex((b) => b.id === id)
      if (idx !== -1) this.budgets[idx] = updated
      return updated
    },

    async remove(id) {
      await api.delete(`/api/budgets/${id}`)
      this.budgets      = this.budgets.filter((b) => b.id !== id)
      delete this.progress[id]
    },
  },
})