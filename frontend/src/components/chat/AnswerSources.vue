<script setup lang="ts">
defineProps<{ sources: Array<{ clubId: number; name: string }>; pending?: boolean }>()
</script>

<template>
  <section class="answer-sources" aria-label="回答资料来源">
    <span class="label">参考资料</span>
    <ul v-if="sources.length">
      <li v-for="source in sources" :key="source.clubId" class="source">{{ source.name }}</li>
    </ul>
    <span v-else class="source-empty">{{ pending ? '正在获取资料来源…' : '暂无资料来源，请向社团核实具体安排。' }}</span>
  </section>
</template>

<style scoped>
.answer-sources { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-moss); font-size: 14px; }
.label, .source-empty { color: var(--text-muted); line-height: 1.6; }
ul { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.source { padding: 4px 8px; border: 1px solid var(--border-moss); border-radius: var(--radius-control); background: var(--field-paper); color: var(--campus-green); overflow-wrap: anywhere; }
</style>
