<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { apiClient } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'

const aiOnline = ref<boolean>()
onMounted(async () => {
  try {
    aiOnline.value = (await apiClient.ai.health()).healthy
  } catch {
    aiOnline.value = false
  }
})
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳转到主要内容</a>
    <AppHeader :ai-online="aiOnline" />
    <main id="main-content" class="app-main" tabindex="-1">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>
