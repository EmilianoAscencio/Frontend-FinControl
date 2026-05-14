<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router   = useRouter()
const auth     = useAuthStore()
const form     = reactive({ name: '', email: '', password: '', confirm: '' })
const loading  = ref(false)
const errorMsg = ref('')

const handleRegister = async () => {
  errorMsg.value = ''
  if (!form.name || !form.email || !form.password || !form.confirm) {
    errorMsg.value = 'Completa todos los campos.'; return
  }
  if (form.password !== form.confirm) {
    errorMsg.value = 'Las contraseñas no coinciden.'; return
  }
  if (form.password.length < 6) {
    errorMsg.value = 'La contraseña debe tener al menos 6 caracteres.'; return
  }
  loading.value = true
  try {
    const { data } = await api.post('/api/auth/register', {
      name: form.name,
      email: form.email,
      password: form.password,
    })
    auth.setSession(data.data.user, data.data.token)
    router.push('/dashboard')
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al crear la cuenta.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <span class="logo">💜 FinControl</span>
        <p class="subtitle">Crea tu cuenta</p>
      </div>

      <div class="auth-form">
        <div class="field">
          <label>Nombre completo</label>
          <input v-model="form.name" type="text" placeholder="Juan Pérez"
            @keyup.enter="handleRegister" :disabled="loading" />
        </div>
        <div class="field">
          <label>Correo electrónico</label>
          <input v-model="form.email" type="email" placeholder="tu@correo.com"
            @keyup.enter="handleRegister" :disabled="loading" />
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input v-model="form.password" type="password" placeholder="Mínimo 6 caracteres"
            @keyup.enter="handleRegister" :disabled="loading" />
        </div>
        <div class="field">
          <label>Confirmar contraseña</label>
          <input v-model="form.confirm" type="password" placeholder="Repite la contraseña"
            @keyup.enter="handleRegister" :disabled="loading" />
        </div>

        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

        <button class="btn-primary" @click="handleRegister" :disabled="loading">
          {{ loading ? 'Creando cuenta...' : 'Registrarse' }}
        </button>

        <p class="switch-link">
          ¿Ya tienes cuenta?
          <router-link to="/login">Inicia sesión</router-link>
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
  max-width: 400px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 36px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.auth-header { text-align: center; display: flex; flex-direction: column; gap: 8px; }
.logo        { font-size: 22px; font-weight: 700; color: var(--text-h); }
.subtitle    { font-size: 14px; color: var(--text); margin: 0; }
.auth-form   { display: flex; flex-direction: column; gap: 16px; }
.field       { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 13px; font-weight: 500; color: var(--text); }
.field input {
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus    { border-color: var(--accent); }
.field input:disabled { opacity: 0.6; }
.error-msg {
  font-size: 13px;
  color: #f87171;
  margin: 0;
  padding: 10px 14px;
  background: rgba(248,113,113,0.08);
  border-radius: 8px;
  border: 1px solid rgba(248,113,113,0.2);
}
.btn-primary {
  padding: 11px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 4px;
}
.btn-primary:hover    { opacity: 0.88; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.switch-link { text-align: center; font-size: 13px; color: var(--text); margin: 0; }
.switch-link a { color: var(--accent); text-decoration: none; font-weight: 500; }
.switch-link a:hover { text-decoration: underline; }
</style>