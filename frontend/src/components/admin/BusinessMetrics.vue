<script setup lang="ts">
import type { AnalyticsSummary } from '@/api/client'
defineProps<{ data: AnalyticsSummary['business'] }>()
</script>
<template>
  <section class="metric-block"><header><h2>业务转化</h2><span>匿名聚合，不采集学生身份</span></header><div class="metrics"><div><strong>{{ data.clubCount }}</strong><small>在招社团</small></div><div><strong>{{ data.recommendationCount }}</strong><small>推荐请求</small></div><div><strong>{{ data.intentCount }}</strong><small>有效意向</small></div><div><strong>{{ data.conversionRate }}%</strong><small>意向转化率</small></div></div></section>
</template>
<style scoped>
.metric-block{padding:24px;background:#17324d;color:#fff;border-radius:16px}.metric-block header{display:flex;justify-content:space-between;align-items:baseline}.metric-block h2{margin:0;font-size:20px}.metric-block header span{font-size:12px;color:#b8c7d0}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:24px}.metrics div{border-left:1px solid #547083;padding-left:14px}.metrics strong,.metrics small{display:block}.metrics strong{font-size:29px}.metrics small{margin-top:5px;color:#b8c7d0}@media(max-width:650px){.metrics{grid-template-columns:repeat(2,1fr)}}
</style>
