<script setup lang="ts">
defineProps<{
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  label: string
}>()
</script>

<template>
  <span role="status" class="status-pill" :class="`is-${tone}`">
    <span class="status-dot" aria-hidden="true"></span>
    {{ label }}
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 9px;
  border: 1px solid var(--border-moss);
  border-radius: var(--radius-control);
  background: var(--surface);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.status-dot { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: currentColor; }
.is-success { color: var(--campus-green); }
.is-warning { color: var(--warning); }
.is-danger { color: var(--danger); }
.is-neutral { color: var(--text-muted); }
</style>
