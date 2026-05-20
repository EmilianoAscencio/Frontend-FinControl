import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('fc_user') || 'null'),
    token: localStorage.getItem('fc_token') || null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
  },
  actions: {

initializeAuth() {
      if (this.token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      }
    },

    setSession(user, token) {
      this.user = user
      this.token = token
      localStorage.setItem('fc_user', JSON.stringify(user))
      localStorage.setItem('fc_token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    },
    async logout() {
      try { await api.post('/api/auth/logout') } catch {}
      this.user = null
      this.token = null
      localStorage.removeItem('fc_user')
      localStorage.removeItem('fc_token')
      delete api.defaults.headers.common['Authorization']
    },
  },
})
