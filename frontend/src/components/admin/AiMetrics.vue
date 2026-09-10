<script setup lang="ts">
import type { AnalyticsSummary } from '@/api/client'
defineProps<{ data: AnalyticsSummary['ai'] }>()
</script>
<template>
  <section class="metric-block" aria-labelledby="ai-metrics-title">
    <header><h2 id="ai-metrics-title">AI 运行记录</h2><p>成功、降级与错误均来自实际调用记录</p></header>
    <dl class="metrics" aria-label="AI 运行指标">
      <div><dt>成功率</dt><dd>{{ data.successRate }}%</dd></div>
      <div><dt>平均耗时</dt><dd>{{ data.averageDurationMs }} <span>ms</span></dd></div>
      <div><dt>降级 · 规则接管</dt><dd>{{ data.fallbackCount }} <span>次</span></dd></div>
      <div><dt>错误 · 结构校验失败</dt><dd>{{ data.validationFailures }} <span>次</span></dd></div>
      <div><dt>累计 token</dt><dd>{{ data.inputTokens + data.outputTokens }}</dd></div>
      <div><dt>调用总数</dt><dd>{{ data.requestCount }} <span>次</span></dd></div>
    </dl>
    <footer>仅记录耗时、token 和状态；结构校验失败不代表全部调用错误。</footer>
  </section>
</template>
<style scoped>
.metric-block { padding: 24px; background: var(--ink-forest); color: var(--surface); border: 1px solid var(--ink-forest); border-radius: var(--radius-panel); }
h2 { margin: 0; font-size: 20px; font-weight: 750; }
header p, footer { margin: 8px 0 0; color: var(--border-moss); font-size: 14px; line-height: 1.6; }
.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px 16px; margin: 28px 0; }
dt { font-size: 14px; color: var(--border-moss); line-height: 1.5; }
dd { margin: 7px 0 0; font-size: clamp(24px, 2.8vw, 30px); font-weight: 800; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.metrics div:first-child dd { color: var(--signal-lime); }
dd span { font-size: 14px; font-weight: 500; }
footer { padding-top: 16px; border-top: 1px solid var(--campus-green); }
@media (max-width: 600px) { .metric-block { padding: 20px; } .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
