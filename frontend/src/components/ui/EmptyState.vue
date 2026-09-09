<script setup lang="ts">
defineProps<{ title: string; description: string }>()
</script>

<template>
  <section class="empty-state">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <div v-if="$slots.action" class="empty-action"><slot name="action" /></div>
  </section>
</template>

<style scoped>
.empty-state { padding: 40px 24px; border: 1px dashed var(--border-moss); border-radius: var(--radius-card); background: var(--surface); text-align: center; }
h2 { margin: 0 0 10px; color: var(--text-ink); font-size: 20px; font-weight: 750; }
p { max-width: 52ch; margin: 0 auto; color: var(--text-muted); font-size: 15px; line-height: 1.7; }
.empty-action { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 20px; }
</style>
