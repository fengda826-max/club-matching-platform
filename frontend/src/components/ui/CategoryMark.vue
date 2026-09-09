<script setup lang="ts">
import { computed } from 'vue'
import { getCategoryPresentation } from '@/shared/presentation'

const props = withDefaults(defineProps<{ category: string; size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })
const presentation = computed(() => getCategoryPresentation(props.category))
</script>

<template>
  <span class="category-mark" :class="`size-${size}`">
    <span class="category-symbol" aria-hidden="true">{{ presentation.shortLabel }}</span>
    <span>{{ presentation.label }}</span>
  </span>
</template>

<style scoped>
.category-mark { display: inline-flex; align-items: center; gap: 10px; color: var(--ink-forest); font-size: 14px; font-weight: 600; }
.category-symbol { display: inline-grid; place-items: center; width: 40px; height: 40px; flex-shrink: 0; border: 1px solid var(--border-moss); border-radius: var(--radius-control); background: var(--field-paper); font-size: 18px; font-weight: 800; }
.size-sm { gap: 7px; }
.size-sm .category-symbol { width: 28px; height: 28px; font-size: 14px; }
.size-lg .category-symbol { width: 52px; height: 52px; font-size: 24px; }
</style>
