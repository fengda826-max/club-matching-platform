<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient, type Recommendation, type UserPreference } from '@/api/client'
import PageIntro from '@/components/layout/PageIntro.vue'
import StatusPill from '@/components/ui/StatusPill.vue'
import PreferenceReview from '@/components/matching/PreferenceReview.vue'
import MatchBreakdown from '@/components/matching/MatchBreakdown.vue'

const route = useRoute()
const queryNeed = Array.isArray(route.query.need) ? route.query.need.find(value => typeof value === 'string') : route.query.need
const naturalText = ref(typeof queryNeed === 'string' ? queryNeed.trim() : '周末有时间，零基础但喜欢编程，希望参加比赛，每周最多投入 4 小时')
const preference = ref<UserPreference>({ interests: [], goals: [], skillLevel: 'beginner', availableTimes: [] })
const warnings = ref<string[]>([])
const results = ref<Recommendation | null>(null)
const extracting = ref(false)
const matching = ref(false)
const aiConfigured = ref(false)
const checkingHealth = ref(true)
const extractionStatus = ref('')
const extractionFailed = ref(false)
const matchError = ref('')
const intentStatus = ref('')
const intentFailed = ref(false)
const recordedIntentsKey = 'campusmatch.recorded-matching-intents'
function readRecordedIntents(): Set<number> {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(recordedIntentsKey) || '[]')
    return new Set(Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id) && id > 0) : [])
  } catch { return new Set() }
}
const recorded = ref(readRecordedIntents())
const recording = ref(new Set<number>())
const submittedPreference = ref('')
const resultStale = computed(() => Boolean(results.value) && submittedPreference.value !== JSON.stringify(preference.value))
const stage = computed(() => {
  if (results.value && !resultStale.value) return 3
  const conditions = preference.value
  return resultStale.value || extractionStatus.value || conditions.interests.length || conditions.goals.length
    || conditions.availableTimes.length || conditions.campus || conditions.maxWeeklyHours !== undefined
    || conditions.maxFee !== undefined || conditions.skillLevel !== 'beginner' ? 2 : 1
})
const fallbackMessage = computed(() => {
  if (!results.value || results.value.mode !== 'rules-only') return ''
  // Only display known public explanations; provider errors must never leak into the UI.
  const warning = results.value.warning
  if (warning === '没有社团满足当前硬约束') return '没有社团满足当前硬约束，因此未生成模型说明。请调整条件后重试。'
  if (warning === '模型未配置，已使用规则评分') return '模型未配置，本次使用规则评分和规则证据。仍可查看社团并登记意向。'
  return '模型说明不可用，本次保留规则评分、排序与证据。仍可查看社团并登记意向。'
})

onMounted(async () => {
  try { aiConfigured.value = (await apiClient.ai.health()).healthy } catch { aiConfigured.value = false }
  finally { checkingHealth.value = false }
})

async function extract() {
  if (!naturalText.value.trim() || extracting.value || matching.value) return
  extracting.value = true
  extractionStatus.value = ''
  extractionFailed.value = false
  try {
    const data = await apiClient.matching.extractPreferences(naturalText.value)
    preference.value = data.preference
    warnings.value = data.warnings
    extractionStatus.value = '已提取条件，请逐项确认后开始匹配。'
  } catch {
    extractionFailed.value = true
    extractionStatus.value = '模型暂不可用，原文已保留，请直接填写条件。'
  } finally { extracting.value = false }
}

async function recommend() {
  if (matching.value || extracting.value) return
  matching.value = true
  matchError.value = ''
  const submitted = JSON.stringify(preference.value)
  try {
    results.value = await apiClient.matching.recommend(preference.value)
    submittedPreference.value = submitted
  } catch {
    matchError.value = '暂时无法完成匹配，请确认服务连接后重试。你的条件已保留。'
  } finally { matching.value = false }
}

async function recordIntent(clubId: number, score: number) {
  if (recording.value.has(clubId) || recorded.value.has(clubId)) return
  recording.value = new Set(recording.value).add(clubId)
  intentStatus.value = ''
  intentFailed.value = false
  try {
    await apiClient.intents.record({ clubId, source: 'matching', matchScore: score })
    recorded.value = new Set(recorded.value).add(clubId)
    // Keep the successful action visible across refreshes in this browser tab.
    // Storage restrictions must not turn a successful server write into an error.
    try { sessionStorage.setItem(recordedIntentsKey, JSON.stringify([...recorded.value])) } catch { /* Current-page state remains available. */ }
    intentStatus.value = '已登记意向，可通过社团联系方式进一步了解。'
  } catch {
    intentFailed.value = true
    intentStatus.value = '登记暂未成功，请稍后重试。'
  } finally {
    const pending = new Set(recording.value)
    pending.delete(clubId)
    recording.value = pending
  }
}
</script>

<template>
  <main class="matching-page content-app">
    <PageIntro>
      找到适合你的校园选择
      <template #description><p>先确认兴趣与硬性条件，再用评分和证据比较社团。AI 理解你的表达，并为规则结果补充说明。</p></template>
      <template #aside><StatusPill :tone="checkingHealth ? 'neutral' : aiConfigured ? 'success' : 'warning'" :label="checkingHealth ? '正在检查 AI 状态' : aiConfigured ? 'AI 已连接' : '规则模式可用'" /></template>
    </PageIntro>

    <ol class="stage-rail" aria-label="匹配流程">
      <li v-for="(label, index) in ['描述需求', '确认条件', '查看结果']" :key="label" :aria-current="stage === index + 1 ? 'step' : undefined"><span>{{ String(index + 1).padStart(2, '0') }}</span>{{ label }}</li>
    </ol>

    <form aria-label="确认匹配条件" @submit.prevent="recommend">
      <div class="workspace">
        <section class="brief" aria-labelledby="need-heading">
          <span class="step-label">01 / 描述需求</span>
          <h2 id="need-heading"><label for="need">用自己的话，说说期待</label></h2>
          <p id="need-help">兴趣、可用时间、预算，想到什么就写下来。</p>
          <textarea id="need" v-model="naturalText" rows="7" maxlength="1000" aria-describedby="need-help extraction-help" />
          <button type="button" class="button-secondary" data-action="extract" :disabled="extracting || matching || !aiConfigured || !naturalText.trim()" @click="extract">{{ extracting ? '正在提取条件…' : '让 AI 提取条件' }}</button>
          <p id="extraction-help">{{ aiConfigured ? '原文始终保留。提取结果由你确认，避免遗漏或误解。' : 'AI 暂不可用，可直接填写右侧条件，使用规则完成匹配。' }}</p>
          <p v-if="extractionStatus" data-status="extraction" role="status" class="extraction-status" :class="{ warning: extractionFailed }">{{ extractionStatus }}</p>
          <div class="method-note"><h3>每一步都有依据</h3><p>规则先检查硬约束，再按兴趣、目标、时间和门槛评分。模型说明可帮助理解，最终选择由你决定。</p></div>
        </section>
        <PreferenceReview v-model="preference" :warnings="warnings" />
      </div>
      <div class="action"><p>确认后计算 · 最多返回 5 个候选社团</p><button class="button-primary" type="submit" :disabled="matching || extracting">{{ matching ? '正在计算匹配…' : '计算可解释匹配' }}</button></div>
      <p v-if="matchError" role="alert" class="notice error">{{ matchError }}</p>
    </form>

    <section class="results" aria-labelledby="results-heading" :aria-busy="matching">
      <header class="results-header"><div><span class="step-label">03 / 查看结果</span><h2 id="results-heading">{{ results ? '看分数，更要看适合的理由' : '你的决策结果将在这里呈现' }}</h2><p>{{ results ? `本次返回 ${results.matches.length} 个候选，按固定规则评分排序。` : '确认条件并计算后，可比较匹配证据、实际投入与加入门槛。' }}</p></div>
        <StatusPill v-if="results" :tone="results.mode === 'hybrid' ? 'success' : 'warning'" :label="results.mode === 'hybrid' ? '规则评分 + AI 解释' : '已降级为规则结果'" />
      </header>
      <p v-if="matching" role="status" class="notice">正在检查条件并生成结果，请稍候。</p>
      <p v-if="resultStale" role="status" class="notice warning">条件已修改，下方仍是上次计算结果。请重新计算后再比较。</p>
      <p v-if="fallbackMessage" role="status" class="notice warning">{{ fallbackMessage }}</p>
      <p v-if="intentStatus" :role="intentFailed ? 'alert' : 'status'" class="notice" :class="{ error: intentFailed }">{{ intentStatus }}</p>
      <template v-if="results">
        <div v-if="!results.matches.length" class="empty"><h3>没有社团满足全部条件</h3><p>可放宽可参加时间、每周投入、费用或校区限制，然后重新计算。</p></div>
        <MatchBreakdown v-for="(item, index) in results.matches" :key="item.clubId" :item="item" :rank="index + 1" :mode="results.mode" :intent-recorded="recorded.has(item.clubId)" :recording="recording.has(item.clubId)" @intent="recordIntent(item.clubId, item.score)" />
      </template>
      <div v-else class="empty"><p>还没有匹配结果。你可以直接填写条件开始，也可以先让 AI 帮忙提取。</p></div>
      <p class="evaluation-note">评分口径：兴趣 40 分、目标 25 分、时间 20 分、门槛 15 分；总分 100 分。分数表示规则匹配程度，不代表录取概率。证据来自规则与社团资料；混合模式下，理由及部分注意事项由 AI 补充，请向社团确认实际安排。</p>
    </section>
  </main>
</template>

<style scoped>
.matching-page { padding-bottom: 72px; }
.stage-rail { display: grid; grid-template-columns: repeat(3, 1fr); padding: 0; margin: 0 0 28px; list-style: none; border-block: 1px solid var(--border-moss); }
.stage-rail li { display: flex; align-items: center; gap: 12px; padding: 18px 8px; font-size: 15px; color: var(--text-muted); border-bottom: 3px solid transparent; }
.stage-rail li[aria-current] { color: var(--ink-forest); border-bottom-color: var(--campus-green); font-weight: 700; }
.stage-rail span { font-size: 14px; font-variant-numeric: tabular-nums; }
.workspace { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: 24px; align-items: start; }
.brief { min-width: 0; padding: 26px; background: var(--field-paper); border: 1px solid var(--border-moss); border-radius: var(--radius-panel); }
.step-label { font-size: 14px; font-weight: 700; color: var(--campus-green); }
h2 { font-size: 24px; line-height: 1.4; letter-spacing: -.02em; margin: 8px 0 12px; }
h3 { font-size: 16px; margin: 0 0 8px; }
p { margin: 0; line-height: 1.75; }
.brief p { font-size: 14px; color: var(--text-muted); }
textarea { display: block; width: 100%; min-height: 170px; margin: 20px 0 14px; padding: 14px; border: 1px solid var(--border-moss); border-radius: var(--radius-control); resize: vertical; background: var(--surface); color: var(--text-ink); font: inherit; line-height: 1.8; }
textarea:focus-visible, button:focus-visible { outline: 3px solid var(--campus-green); outline-offset: 3px; }
#extraction-help { margin-top: 14px; }
.extraction-status { padding-top: 12px; }
.method-note { border-top: 1px solid var(--border-moss); margin-top: 28px; padding-top: 22px; }
.action { display: flex; justify-content: flex-end; gap: 20px; align-items: center; margin: 22px 0 32px; }
.action p { font-size: 14px; color: var(--text-muted); }
.results { display: grid; gap: 18px; border-top: 1px solid var(--border-moss); padding-top: 28px; }
.results-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 18px; }
.results-header p { font-size: 14px; color: var(--text-muted); }
.notice { padding: 14px 18px; border: 1px solid var(--border-moss); border-left: 3px solid var(--campus-green); background: var(--surface); border-radius: var(--radius-control); font-size: 14px; overflow-wrap: anywhere; }
.notice.warning { border-left-color: var(--warning); }
.warning, .brief .warning { color: var(--warning); }
.error { color: var(--danger); border-left-color: var(--danger); }
.empty { padding: 28px; background: var(--surface); border: 1px dashed var(--border-moss); border-radius: var(--radius-card); color: var(--text-muted); font-size: 14px; }
.empty h3 { color: var(--text-ink); }
.evaluation-note { font-size: 14px; color: var(--text-muted); max-width: 90ch; }
@media (max-width: 820px) { .workspace { grid-template-columns: 1fr; } .brief { padding: 22px; } .stage-rail li { padding-inline: 2px; gap: 8px; } }
@media (max-width: 540px) { .action { flex-direction: column; align-items: stretch; gap: 12px; } .brief { padding: 20px 18px; } .stage-rail li { font-size: 14px; } }
</style>
