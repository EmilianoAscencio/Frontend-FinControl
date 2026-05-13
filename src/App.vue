<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from './layouts/AppLayout.vue'

const route = useRoute()
const useLayout = computed(() => route.meta.requiresAuth)
</script>

<template>
  <AppLayout v-if="useLayout">
    <router-view />
  </AppLayout>
  <router-view v-else />
</template>
