<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'

const router   = useRouter()
const auth     = useAuthStore()
const form     = reactive({ email: '', password: '' })
const loading  = ref(false)
const errorMsg = ref('')
const showPass = ref(false)

const handleLogin = async () => {
  errorMsg.value = ''
  if (!form.email || !form.password) { errorMsg.value = 'Completa todos los campos.'; return }
  loading.value = true
  try {
    const { data } = await api.post('/api/auth/login', { email: form.email, password: form.password })
    auth.setSession(data.data.user, data.data.token)
    router.push('/dashboard')
  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Credenciales incorrectas.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-shell">

    <!-- Panel izquierdo — branding -->
    <div class="brand-panel" aria-hidden="true">
      <div class="brand-content">
        <div class="brand-logo">
          <div class="brand-mark">FC</div>
          <span class="brand-name">FinControl</span>
        </div>
        <h1 class="brand-headline">Toma el control<br>de tus finanzas</h1>
        <p class="brand-sub">Gestiona cuentas, presupuestos y reportes en un solo lugar.</p>
        <div class="brand-features">
          <div class="feat">✓ Presupuestos y alertas</div>
          <div class="feat">✓ Reportes por categoría</div>
          <div class="feat">✓ Exportación CSV</div>
          <div class="feat">✓ Modo oscuro incluido</div>
        </div>
      </div>
      <!-- Financial chart illustration -->
      <div class="brand-pattern" aria-hidden="true">
        <svg class="brand-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" preserveAspectRatio="xMidYMid slice">
          <!-- Grid lines -->
          <line x1="0" y1="340" x2="480" y2="340" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <line x1="0" y1="410" x2="480" y2="410" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <line x1="0" y1="480" x2="480" y2="480" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <line x1="0" y1="550" x2="480" y2="550" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
          <!-- Decorative circles top-right -->
          <circle cx="430" cy="55" r="130" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>
          <circle cx="430" cy="55" r="85"  fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <circle cx="430" cy="55" r="42"  fill="rgba(255,255,255,0.04)"/>
          <!-- Bar chart columns (rising left→right) -->
          <rect x="18"  y="548" width="36" height="52"  rx="5" fill="rgba(255,255,255,0.10)"/>
          <rect x="74"  y="512" width="36" height="88"  rx="5" fill="rgba(255,255,255,0.12)"/>
          <rect x="130" y="476" width="36" height="124" rx="5" fill="rgba(255,255,255,0.13)"/>
          <rect x="186" y="444" width="36" height="156" rx="5" fill="rgba(255,255,255,0.14)"/>
          <rect x="242" y="408" width="36" height="192" rx="5" fill="rgba(255,255,255,0.15)"/>
          <rect x="298" y="370" width="36" height="230" rx="5" fill="rgba(255,255,255,0.17)"/>
          <rect x="354" y="330" width="36" height="270" rx="5" fill="rgba(255,255,255,0.19)"/>
          <rect x="410" y="288" width="36" height="312" rx="5" fill="rgba(255,255,255,0.21)"/>
          <!-- Area under trend line -->
          <path d="M 36 542 L 92 506 L 148 470 L 204 440 L 260 404 L 316 366 L 372 326 L 428 284 L 428 600 L 36 600 Z"
            fill="rgba(255,255,255,0.05)"/>
          <!-- Rising trend line -->
          <polyline points="36,542 92,506 148,470 204,440 260,404 316,366 372,326 428,284"
            fill="none" stroke="rgba(255,255,255,0.60)" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"/>
          <!-- Data point dots -->
          <circle cx="36"  cy="542" r="4.5" fill="rgba(255,255,255,0.80)"/>
          <circle cx="92"  cy="506" r="4.5" fill="rgba(255,255,255,0.80)"/>
          <circle cx="148" cy="470" r="4.5" fill="rgba(255,255,255,0.80)"/>
          <circle cx="204" cy="440" r="4.5" fill="rgba(255,255,255,0.80)"/>
          <circle cx="260" cy="404" r="4.5" fill="rgba(255,255,255,0.80)"/>
          <circle cx="316" cy="366" r="4.5" fill="rgba(255,255,255,0.80)"/>
          <circle cx="372" cy="326" r="4.5" fill="rgba(255,255,255,0.80)"/>
          <circle cx="428" cy="284" r="5.5" fill="rgba(255,255,255,0.95)"/>
          <!-- Floating badge at the last point -->
          <rect x="385" y="260" width="84" height="20" rx="5" fill="rgba(255,255,255,0.18)"/>
          <rect x="388" y="264" width="8" height="12" rx="2" fill="rgba(255,255,255,0.70)"/>
          <rect x="400" y="267" width="30" height="6" rx="2" fill="rgba(255,255,255,0.55)"/>
          <rect x="434" y="264" width="18" height="12" rx="2" fill="rgba(255,255,255,0.40)"/>
          <!-- Bottom decorative circle -->
          <circle cx="50" cy="635" r="90" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
        </svg>
      </div>
    </div>

    <!-- Panel derecho — formulario -->
    <div class="form-panel">
      <div class="form-card">

        <div class="form-head">
          <div class="mobile-logo">
            <div class="brand-mark brand-mark--sm">FC</div>
            <span class="brand-name">FinControl</span>
          </div>
          <h2>Iniciar sesión</h2>
          <p class="form-sub">Bienvenido de vuelta</p>
        </div>

        <div class="fields">
          <div class="field">
            <label for="email">Correo electrónico</label>
            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="tu@correo.com"
              autocomplete="email"
              @keyup.enter="handleLogin"
              :disabled="loading"
            />
          </div>

          <div class="field">
            <label for="password">Contraseña</label>
            <div class="input-wrap">
              <input
                id="password"
                v-model="form.password"
                :type="showPass ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                @keyup.enter="handleLogin"
                :disabled="loading"
              />
              <button class="pass-toggle" type="button" @click="showPass = !showPass" tabindex="-1">
                {{ showPass ? '🙈' : '👁' }}
              </button>
            </div>
          </div>

          <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

          <button class="submit-btn" @click="handleLogin" :disabled="loading">
            <span v-if="loading" class="btn-spinner"></span>
            {{ loading ? 'Ingresando…' : 'Iniciar sesión' }}
          </button>
        </div>

        <p class="switch-link">
          ¿No tienes cuenta?
          <router-link to="/register">Crear cuenta</router-link>
        </p>

      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Shell ── */
.auth-shell {
  min-height: 100svh;
  display: flex;
}

/* ── Brand panel ── */
.brand-panel {
  display: none;
  position: relative;
  overflow: hidden;
  background: linear-gradient(155deg, #134e4a 0%, #0d9488 55%, #0f766e 100%);
}

@media (min-width: 900px) {
  .brand-panel { display: flex; flex: 1; }
}

.brand-content {
  position: relative;
  z-index: 1;
  padding: 48px 48px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 460px;
  margin: auto;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 36px; height: 36px;
  border-radius: 9px;
  background: rgba(255,255,255,0.2);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  letter-spacing: 0.02em;
  border: 1.5px solid rgba(255,255,255,0.3);
}
.brand-mark--sm {
  width: 30px; height: 30px;
  border-radius: 7px;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  border: none;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.brand-headline {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  line-height: 1.25;
  margin: 0;
}

.brand-sub {
  font-size: 15px;
  color: rgba(255,255,255,0.78);
  margin: 0;
  line-height: 1.6;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}
.feat {
  font-size: 14px;
  color: rgba(255,255,255,0.85);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Financial chart illustration overlay */
.brand-pattern {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.brand-svg {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}

/* ── Form panel ── */
.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  background: var(--bg);
  padding: 24px 16px;
}

.form-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-head h2 { font-size: 20px; margin: 0; }
.form-sub     { font-size: 13px; color: var(--text); margin: 0; }

.mobile-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
@media (min-width: 900px) { .mobile-logo { display: none; } }

/* ── Fields ── */
.fields { display: flex; flex-direction: column; gap: 14px; }

.field       { display: flex; flex-direction: column; gap: 5px; }
.field label { font-size: 12px; font-weight: 600; color: var(--text-h); }

.field input,
.input-wrap input {
  padding: 10px 12px;
  border-radius: 9px;
  border: 1.5px solid var(--border);
  background: var(--bg);
  color: var(--text-h);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
  font-family: var(--font);
}
.field input:focus,
.input-wrap input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}
.field input:disabled,
.input-wrap input:disabled { opacity: 0.55; cursor: not-allowed; }

.input-wrap {
  position: relative;
}
.pass-toggle {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text);
  padding: 2px;
  line-height: 1;
}

/* ── Submit ── */
.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 11px;
  border-radius: 9px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, box-shadow 0.15s;
  font-family: var(--font);
  margin-top: 2px;
}
.submit-btn:hover    { background: var(--accent-soft); box-shadow: 0 2px 10px rgba(13,148,136,0.35); }
.submit-btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }

.btn-spinner {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Error ── */
.error-msg {
  font-size: 13px;
  color: #dc2626;
  margin: 0;
  padding: 10px 14px;
  background: rgba(220,38,38,0.07);
  border-radius: 8px;
  border: 1px solid rgba(220,38,38,0.18);
}

/* ── Switch ── */
.switch-link {
  text-align: center;
  font-size: 13px;
  color: var(--text);
  margin: 0;
}
.switch-link a { color: var(--accent); font-weight: 600; text-decoration: none; }
.switch-link a:hover { text-decoration: underline; }

@media (max-width: 480px) {
  .form-card { padding: 28px 20px; border-radius: 14px; }
}
</style>