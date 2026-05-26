// stores/categories.js — Estado global de categorías con llamadas API centralizadas
import { defineStore } from 'pinia'
import api from '../services/api'

export const useCategoriesStore = defineStore('categories', {
  state: () => ({
    items:   [],
    loading: false,
    error:   null,
  }),

  getters: {
    ingresos: (s) => s.items.filter((c) => c.type === 'ingreso'),
    gastos:   (s) => s.items.filter((c) => c.type === 'gasto'),
    byId:     (s) => (id) => s.items.find((c) => c.id === id),
  },

  actions: {
    async fetchAll() {
      this.loading = true
      this.error   = null
      try {
        const { data } = await api.get('/api/categories')
        this.items = data.data
      } catch (e) {
        this.error = e.response?.data?.message || 'Error al cargar categorías.'
      } finally {
        this.loading = false
      }
    },

    async create(payload) {
      const { data } = await api.post('/api/categories', payload)
      this.items.push(data.data)
      return data.data
    },

    async update(id, payload) {
      const { data } = await api.put(`/api/categories/${id}`, payload)
      const idx = this.items.findIndex((c) => c.id === id)
      if (idx !== -1) this.items[idx] = data.data
      return data.data
    },

    reset() {
      this.items   = []
      this.loading = false
      this.error   = null
    },
  },
})
