<script setup lang="ts">
import type { AnalyticsSummary } from '@/api/client'
defineProps<{ data: AnalyticsSummary['ai'] }>()
</script>
<template>
  <section class="metric-block"><header><h2>模型运行</h2><span>仅记录耗时、token 和状态</span></header><div class="metrics"><div><strong>{{ data.successRate }}%</strong><small>成功率</small></div><div><strong>{{ data.averageDurationMs }}</strong><small>平均耗时 ms</small></div><div><strong>{{ data.fallbackCount }}</strong><small>规则降级</small></div><div><strong>{{ data.inputTokens + data.outputTokens }}</strong><small>累计 token</small></div></div><footer>结构校验失败 {{ data.validationFailures }} 次 / 共 {{ data.requestCount }} 次调用</footer></section>
</template>
<style scoped>
.metric-block{padding:24px;background:#fff;border:1px solid #dbe4e9;border-radius:16px;color:#17324d}.metric-block header{display:flex;justify-content:space-between;align-items:baseline}.metric-block h2{margin:0;font-size:20px}.metric-block header span,footer{font-size:12px;color:#71838e}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:24px}.metrics div{border-left:2px solid #ff6b6b;padding-left:14px}.metrics strong,.metrics small{display:block}.metrics strong{font-size:27px}.metrics small{margin-top:5px;color:#71838e}footer{margin-top:18px}@media(max-width:650px){.metrics{grid-template-columns:repeat(2,1fr)}}
</style>
