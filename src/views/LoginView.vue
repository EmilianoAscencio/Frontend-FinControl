<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router  = useRouter()
const auth    = useAuthStore()
const form    = reactive({ email: '', password: '' })
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  errorMsg.value = ''
  if (!form.email || !form.password) { errorMsg.value = 'Completa todos los campos.'; return }
  loading.value = true
  try {
    const { data } = await api.post('/api/auth/login', { email: form.email, password: form.password })
    auth.setSession(data.data.user, data.data.token)
    router.push('/dashboard')
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al iniciar sesión.'
  } finally {
    loading.value = false }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="logo">💜 FinControl</span>
        <p class="subtitle">Inicia sesión para continuar</p>
      </div>

      <div class="auth-form">
        <div class="field">
          <label>Correo electrónico</label>
          <input v-model="form.email" type="email" placeholder="tu@correo.com"
            @keyup.enter="handleLogin" :disabled="loading" />
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input v-model="form.password" type="password" placeholder="••••••••"
            @keyup.enter="handleLogin" :disabled="loading" />
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <button class="btn-primary" @click="handleLogin" :disabled="loading">
          {{ loading ? 'Ingresando...' : 'Iniciar sesión' }}
        </button>

        <p class="switch-link">
          ¿No tienes cuenta?
          <router-link to="/register">Regístrate aquí</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 24px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  box-shadow: var(--shadow-md);
}

.auth-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.logo     { font-size: 22px; font-weight: 700; color: var(--text-h); }
.subtitle { font-size: 14px; color: var(--text); margin: 0; }

.auth-form { display: flex; flex-direction: column; gap: 14px; }

.field       { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 500; color: var(--text-h); }

.field input {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  width: 100%;
}

.field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.field input:disabled { opacity: 0.6; }

.error-msg {
  font-size: 13px;
  color: #dc2626;
  margin: 0;
  padding: 10px 14px;
  background: rgba(220, 38, 38, 0.06);
  border-radius: 8px;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.btn-primary {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  margin-top: 4px;
}

.btn-primary:hover    { background: var(--accent-soft); }
.btn-primary:active   { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

.switch-link {
  text-align: center;
  font-size: 13px;
  color: var(--text);
  margin: 0;
}

.switch-link a {
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}

.switch-link a:hover { text-decoration: underline; }
</style>