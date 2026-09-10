<script setup lang="ts">
import type { Recommendation } from '@/api/client'
import CategoryMark from '@/components/ui/CategoryMark.vue'
import DecisionFact from '@/components/ui/DecisionFact.vue'
import StatusPill from '@/components/ui/StatusPill.vue'
import ScoreRing from './ScoreRing.vue'

withDefaults(defineProps<{
  item: Recommendation['matches'][number]
  intentRecorded?: boolean
  recording?: boolean
  mode?: Recommendation['mode']
  rank?: number
}>(), { mode: 'rules-only' })
defineEmits<{ intent: [] }>()
const dimensions = [
  ['interest', '兴趣', 40], ['goal', '目标', 25], ['schedule', '时间', 20], ['skill', '门槛', 15],
] as const
const skillLabels = { beginner: '零基础可加入', intermediate: '需要一定基础', advanced: '需要进阶经验', expert: '需要专业经验' }
</script>

<template>
  <article class="match-card" :aria-labelledby="`match-${item.clubId}`">
    <aside class="score-block">
      <span v-if="rank" class="rank">第 {{ rank }} 名</span>
      <ScoreRing :score="item.score" />
      <span class="score-caption">固定权重 · 规则评分</span>
    </aside>
    <div class="match-body">
      <header class="title-row">
        <div><CategoryMark :category="item.club.category" size="sm" /><h3 :id="`match-${item.clubId}`">{{ item.club.name }}</h3></div>
        <StatusPill :tone="mode === 'hybrid' ? 'success' : 'warning'" :label="mode === 'hybrid' ? '规则评分 + AI 解释' : '规则结果'" />
      </header>
      <div class="reason"><h4>{{ mode === 'hybrid' ? 'AI 解释' : '规则说明' }}</h4><p>{{ item.reason }}</p></div>
      <section class="dimensions" aria-label="规则评分明细">
        <div v-for="[key, label, max] in dimensions" :key="key">
          <div><span>{{ label }}</span><strong>{{ item.dimensions[key] }} / {{ max }}</strong></div>
          <div class="bar" aria-hidden="true"><span :style="{ width: `${Math.min(100, Math.max(0, item.dimensions[key] / max * 100))}%` }" /></div>
        </div>
      </section>
      <div class="evidence-grid">
        <section data-section="evidence" :aria-labelledby="`evidence-${item.clubId}`">
          <h4 :id="`evidence-${item.clubId}`">匹配证据 <span>规则提供</span></h4>
          <ul v-if="item.evidence.length"><li v-for="(text, index) in item.evidence" :key="index">{{ text }}</li></ul>
          <p v-else>暂无额外匹配证据，请结合社团资料判断。</p>
        </section>
        <section data-section="caveats" :aria-labelledby="`caveats-${item.clubId}`">
          <h4 :id="`caveats-${item.clubId}`">加入前确认</h4>
          <ul v-if="item.caveats.length"><li v-for="(text, index) in item.caveats" :key="index">{{ text }}</li></ul>
          <p v-else>暂无额外注意事项，活动安排仍需与社团确认。</p>
        </section>
      </div>
      <dl class="facts">
        <DecisionFact label="活动时间" :value="item.club.activityTime || '待确认'" />
        <DecisionFact label="每周投入" :value="`${item.club.weeklyHours} 小时`" />
        <DecisionFact label="校区" :value="item.club.campus || '待确认'" />
        <DecisionFact label="费用" :value="item.club.fee === 0 ? '免费' : `${item.club.fee} 元`" />
        <DecisionFact label="加入门槛" :value="skillLabels[item.club.skillRequirement] || '待确认'" />
      </dl>
      <footer>
        <p>{{ intentRecorded ? '已登记意向，可通过社团联系方式进一步了解。' : '登记意向便于进一步了解，不代表已加入社团。' }}</p>
        <button class="button-primary" :disabled="intentRecorded || recording || !item.club.isRecruiting" @click="$emit('intent')">{{ intentRecorded ? '已登记意向' : !item.club.isRecruiting ? '暂停招新' : recording ? '正在登记…' : '登记加入意向' }}</button>
      </footer>
      <p v-if="intentRecorded" class="contact">联系方式：{{ item.club.contact || '请查看社团公开资料' }}</p>
    </div>
  </article>
</template>

<style scoped>
.match-card { display: grid; grid-template-columns: 184px minmax(0, 1fr); background: var(--surface); border: 1px solid var(--border-moss); border-radius: var(--radius-panel); overflow: hidden; }
.score-block { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 28px 16px; background: var(--ink-forest); color: var(--surface); }
.rank { font-size: 15px; font-weight: 700; }
.score-caption { font-size: 14px; text-align: center; }
.match-body { min-width: 0; padding: 26px; }
.title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
h3 { margin: 10px 0 0; font-size: 25px; line-height: 1.4; overflow-wrap: anywhere; }
h4 { margin: 0 0 8px; font-size: 14px; font-weight: 750; }
h4 span { margin-left: 8px; color: var(--text-muted); font-weight: 400; }
.reason { margin-block: 22px; }
.reason h4 { color: var(--campus-green); }
p { margin: 0; line-height: 1.75; overflow-wrap: anywhere; }
.dimensions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
.dimensions > div > div:first-child { display: flex; justify-content: space-between; gap: 4px; font-size: 14px; }
.dimensions strong { font-variant-numeric: tabular-nums; }
.bar { margin-top: 8px; height: 6px; background: var(--field-paper); border-radius: 3px; overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--campus-green); }
.evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-block: 24px; }
.evidence-grid section { border-left: 2px solid var(--campus-green); padding-left: 14px; font-size: 14px; }
.evidence-grid [data-section="caveats"] { border-color: var(--warning); }
[data-section="caveats"] h4 { color: var(--warning); }
ul { padding-left: 18px; margin: 0; line-height: 1.8; overflow-wrap: anywhere; }
.facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; padding-block: 20px; margin: 0; border-block: 1px solid var(--border-moss); }
footer { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-top: 20px; }
footer p, .contact { font-size: 14px; color: var(--text-muted); }
footer button { flex-shrink: 0; }
.contact { margin-top: 14px; }
@media (max-width: 820px) { .match-card { grid-template-columns: 1fr; } .score-block { flex-direction: row; justify-content: space-between; padding: 20px; flex-wrap: wrap; } .score-caption { max-width: 7em; } .match-body { padding: 22px; } }
@media (max-width: 540px) { .dimensions, .facts { grid-template-columns: repeat(2, minmax(0, 1fr)); } .evidence-grid { grid-template-columns: 1fr; } footer { align-items: stretch; flex-direction: column; } .match-body { padding: 18px; } }
</style>
