<script setup lang="ts">
defineProps<{ label: string; value: string | number }>()
</script>

<template>
  <div class="decision-fact">
    <dt>{{ label }}</dt>
    <dd>{{ value }}</dd>
  </div>
</template>

<style scoped>
.decision-fact { display: grid; gap: 4px; min-width: 0; }
dt { color: var(--text-muted); font-size: 14px; }
dd { margin: 0; color: var(--text-ink); font-size: 15px; font-weight: 600; overflow-wrap: anywhere; }
</style>
