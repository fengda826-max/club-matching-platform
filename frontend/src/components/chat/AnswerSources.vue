<script setup lang="ts">
defineProps<{ sources: Array<{ clubId: number; name: string }> }>()
</script>

<template>
  <div v-if="sources.length" class="answer-sources">
    <span class="label">回答依据</span>
    <span v-for="source in sources" :key="source.clubId" class="source">{{ source.name }}</span>
  </div>
</template>

<style scoped>
.answer-sources { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
.label { color: var(--color-gray-600); font-size: 12px; }
.source { padding: 4px 9px; border-radius: var(--radius-full); background: rgba(46, 134, 171, .1); color: var(--color-secondary-dark); font-size: 12px; }
</style>
