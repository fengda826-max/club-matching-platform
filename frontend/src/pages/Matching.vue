<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { apiClient, type Recommendation, type UserPreference } from '@/api/client'
import PreferenceReview from '@/components/matching/PreferenceReview.vue'
import MatchBreakdown from '@/components/matching/MatchBreakdown.vue'

const naturalText = ref('周末有时间，零基础但喜欢编程，希望参加比赛，每周最多投入 4 小时')
const preference = ref<UserPreference>({ interests: [], goals: [], skillLevel: 'beginner', availableTimes: [] })
const warnings = ref<string[]>([])
const results = ref<Recommendation | null>(null)
const extracting = ref(false)
const matching = ref(false)
const aiConfigured = ref(false)
const recorded = ref(new Set<number>())

onMounted(async () => {
  try { aiConfigured.value = (await apiClient.ai.health()).healthy } catch { aiConfigured.value = false }
})

async function extract() {
  if (!naturalText.value.trim()) return
  extracting.value = true
  try {
    const data = await apiClient.matching.extractPreferences(naturalText.value)
    preference.value = data.preference
    warnings.value = data.warnings
    ElMessage.success('已提取，请确认条件')
  } catch {
    ElMessage.warning('模型暂不可用，原文已保留，请直接填写条件')
  } finally { extracting.value = false }
}

async function recommend() {
  matching.value = true
  try {
    results.value = await apiClient.matching.recommend(preference.value)
    if (results.value.mode === 'rules-only') ElMessage.warning(results.value.warning || '已使用规则模式')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '匹配失败') }
  finally { matching.value = false }
}

async function recordIntent(clubId: number, score: number) {
  try {
    const result = await apiClient.intents.record({ clubId, source: 'matching', matchScore: score })
    recorded.value = new Set(recorded.value).add(clubId)
    ElMessage.success(result.created ? '意向已记录，面试演示中的转化指标会同步更新' : '这条意向已经记录过')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '记录失败') }
}
</script>

<template>
  <main class="matching-page">
    <header class="hero">
      <div><p>CampusMatch 决策辅助</p><h1>先排除不合适，再解释为什么适合</h1><span>时间、费用、校区和门槛由规则严格筛选；AI 负责理解表达与生成易读说明。</span></div>
      <aside><b>{{ aiConfigured ? 'AI 已连接' : '规则模式可用' }}</b><small>模型不可用时仍可完成匹配</small></aside>
    </header>

    <section class="workspace">
      <div class="brief">
        <label for="need">用自己的话描述需求</label>
        <textarea id="need" v-model="naturalText" rows="5" maxlength="1000" />
        <button :disabled="extracting || !aiConfigured" @click="extract">{{ extracting ? '正在提取…' : aiConfigured ? '让 AI 提取条件' : 'AI 未配置，请直接填写' }}</button>
        <p>原文始终保留。提取结果必须由你确认，避免模型猜测硬约束。</p>
      </div>
      <PreferenceReview v-model="preference" :warnings="warnings" />
    </section>

    <div class="action"><button :disabled="matching" @click="recommend">{{ matching ? '正在计算…' : '计算可解释匹配' }}</button></div>

    <section v-if="results" class="results">
      <header><div><h2>推荐结果</h2><p>{{ results.matches.length }} 个社团满足硬约束，按固定权重排序。</p></div><span :class="results.mode">{{ results.mode === 'hybrid' ? '规则评分 + AI 解释' : '纯规则降级' }}</span></header>
      <div v-if="!results.matches.length" class="empty">没有社团满足全部条件。可放宽时间、费用或校区限制后重试。</div>
      <MatchBreakdown v-for="item in results.matches" :key="item.clubId" :item="item" :intent-recorded="recorded.has(item.clubId)" @intent="recordIntent(item.clubId, item.score)" />
    </section>
  </main>
</template>

<style scoped>
.matching-page{min-height:100vh;padding:52px max(24px,calc((100vw - 1180px)/2)) 90px;background:#f5f7f7;color:#17324d}.hero{display:grid;grid-template-columns:1fr 220px;gap:40px;align-items:end;padding-bottom:34px;border-bottom:1px solid #cfdadd}.hero p{margin:0 0 10px;color:#d95252;font-weight:750}.hero h1{max-width:780px;margin:0 0 16px;font-size:clamp(34px,5vw,62px);line-height:1.05;letter-spacing:-.035em}.hero span{display:block;max-width:720px;color:#536b79;line-height:1.7}.hero aside{padding:18px;border-left:4px solid #ff6b6b;background:#fff}.hero aside b,.hero aside small{display:block}.hero aside small{margin-top:6px;color:#6b7d88}.workspace{display:grid;grid-template-columns:minmax(280px,.7fr) minmax(480px,1.3fr);gap:20px;margin-top:28px}.brief{padding:26px;background:#17324d;color:#fff;border-radius:18px}.brief label{font-size:19px;font-weight:750}.brief textarea{width:100%;box-sizing:border-box;margin:16px 0 12px;padding:14px;border:0;border-radius:10px;resize:vertical;font:inherit;line-height:1.6}.brief button,.action button{border:0;border-radius:9px;background:#ff6b6b;color:#fff;padding:12px 18px;font-weight:750;cursor:pointer}.brief button:disabled,.action button:disabled{opacity:.55;cursor:not-allowed}.brief p{font-size:13px;line-height:1.6;color:#b9c9d3}.action{text-align:right;margin:20px 0 34px}.action button{font-size:16px;padding:14px 25px}.results>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.results h2{margin:0;font-size:28px}.results p{margin:6px 0;color:#657985}.results header>span{padding:7px 11px;border-radius:7px;background:#dff4ea;color:#23684e;font-size:13px}.results header>span.rules-only{background:#fff1d4;color:#855b12}.results{display:grid;gap:16px}.empty{padding:28px;background:#fff;border:1px dashed #aab9c1;border-radius:14px;color:#5d707b}@media(max-width:850px){.hero,.workspace{grid-template-columns:1fr}.hero aside{margin-top:10px}.matching-page{padding-top:30px}.results>header{align-items:flex-start;gap:12px;flex-direction:column}}
</style>
