// stores/users.js — Estado global de usuarios con llamadas API centralizadas
import { defineStore } from 'pinia'
import api from '../services/api'

export const useUsersStore = defineStore('users', {
  state: () => ({
    items:   [],
    loading: false,
    error:   null,
  }),

  getters: {
    active:   (s) => s.items.filter((u) => u.status === 'active'),
    inactive: (s) => s.items.filter((u) => u.status === 'inactive'),
    byId:     (s) => (id) => s.items.find((u) => u.id === id),
  },

  actions: {
    async fetchAll() {
      this.loading = true
      this.error   = null
      try {
        const { data } = await api.get('/api/users')
        this.items = data.data ?? []
      } catch (e) {
        this.error = e.response?.data?.message || 'Error al cargar usuarios.'
      } finally {
        this.loading = false
      }
    },

    async create(payload) {
      const { data } = await api.post('/api/users', payload)
      const user = data.data ?? data
      this.items.push(user)
      return user
    },

    async update(id, payload) {
      const { data } = await api.put(`/api/users/${id}`, payload)
      const updated  = data.data ?? data
      const idx = this.items.findIndex((u) => u.id === id)
      if (idx !== -1) this.items[idx] = updated
      return updated
    },

    async toggleStatus(id) {
      const user = this.items.find((u) => u.id === id)
      if (!user) return
      const next = user.status === 'active' ? 'inactive' : 'active'
      const { data } = await api.patch(`/api/users/${id}/status`, { status: next })
      const updated  = data.data ?? data
      const idx = this.items.findIndex((u) => u.id === id)
      if (idx !== -1) this.items[idx] = updated
      return updated
    },

    reset() {
      this.items   = []
      this.loading = false
      this.error   = null
    },
  },
})
