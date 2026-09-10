<script setup lang="ts">
import type { AnalyticsSummary } from '@/api/client'
defineProps<{ data: AnalyticsSummary['business'] }>()
</script>
<template>
  <section class="metric-block" aria-labelledby="business-title">
    <header><h2 id="business-title">业务转化</h2><p>从推荐请求到有效意向</p></header>
    <dl class="metrics" aria-label="业务指标">
      <div><dt>社团总数</dt><dd>{{ data.clubCount }}</dd></div>
      <div><dt>推荐请求</dt><dd>{{ data.recommendationCount }}</dd></div>
      <div><dt>有效意向</dt><dd>{{ data.intentCount }}</dd></div>
      <div><dt>意向转化率</dt><dd>{{ data.conversionRate }}%</dd></div>
    </dl>
    <footer>匿名聚合数据，不采集学生身份。</footer>
  </section>
</template>
<style scoped>
.metric-block { padding: 24px; background: var(--surface); color: var(--text-ink); border: 1px solid var(--border-moss); border-radius: var(--radius-panel); }
h2 { margin: 0; font-size: 20px; font-weight: 750; }
header p, footer { margin: 8px 0 0; font-size: 14px; color: var(--text-muted); line-height: 1.6; }
.metrics { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 20px; margin: 28px 0; }
.metrics div { padding-left: 14px; border-left: 2px solid var(--border-moss); }
dt { color: var(--text-muted); font-size: 14px; }
dd { margin: 7px 0 0; font-size: clamp(26px, 3vw, 34px); font-weight: 800; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
footer { padding-top: 16px; border-top: 1px solid var(--border-moss); }
@media (max-width: 480px) { .metric-block { padding: 20px; } }
</style>
