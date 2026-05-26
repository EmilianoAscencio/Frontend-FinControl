<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="forbidden-page">
    <div class="forbidden-card">
      <span class="forbidden-code">403</span>
      <h1 class="forbidden-title">Acceso denegado</h1>
      <p class="forbidden-desc">No tienes permisos para ver esta página.</p>
      <button class="btn-primary" @click="router.push('/dashboard')">Volver al Dashboard</button>
    </div>
  </div>
</template>

<style scoped>
.forbidden-page {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
}

.forbidden-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 48px 40px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.forbidden-code {
  font-size: 80px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}

.forbidden-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
}

.forbidden-desc {
  font-size: 14px;
  color: var(--text);
  margin: 0;
}
</style>