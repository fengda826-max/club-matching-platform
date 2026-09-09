<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'
import CategoryMark from '@/components/ui/CategoryMark.vue'
import DecisionFact from '@/components/ui/DecisionFact.vue'

const router = useRouter()
const clubsStore = useClubsStore()
const requirement = ref('')
const searchInput = ref('')
const loading = ref(false)
const loadError = ref(false)
const recruitingClubs = computed(() => clubsStore.clubs.filter(club => club.isRecruiting).slice(0, 3))
const skillLabels = { beginner: '零基础可加入', intermediate: '需要一定基础', advanced: '需要进阶能力', expert: '需要专业经验' }

// Illustrative points use the rule results' dimension maxima, not the visitor's input.
const exampleDimensions = [
  { label: '兴趣', score: 40, max: 40 },
  { label: '目标', score: 13, max: 25 },
  { label: '时间', score: 20, max: 20 },
  { label: '门槛', score: 15, max: 15 },
]

async function loadClubs() {
  loading.value = true
  loadError.value = false
  const results = await Promise.allSettled([
    clubsStore.clubs.length ? Promise.resolve() : clubsStore.fetchClubs(),
    clubsStore.statistics ? Promise.resolve() : clubsStore.fetchStatistics(),
  ])
  loadError.value = results.some(result => result.status === 'rejected')
  loading.value = false
}

function startMatching() {
  const need = requirement.value.trim()
  router.push(need ? { path: '/matching', query: { need } } : '/matching')
}

function handleSearch() {
  const search = searchInput.value.trim()
  if (search) router.push({ path: '/clubs', query: { search } })
}

onMounted(loadClubs)
</script>

<template>
  <div class="home-page content-wide">
    <section class="hero-section" aria-labelledby="home-heading">
      <div class="hero-content">
        <p class="product-purpose">CampusMatch / 可解释的社团选择助手</p>
        <h1 id="home-heading">把选择条件说清楚，<br />找到适合你的社团。</h1>
        <p class="hero-description">从你的课余时间和兴趣出发。先确认条件，再看评分依据，让每一次推荐都有理由。</p>
        <form aria-label="描述匹配需求" class="requirement-form" @submit.prevent="startMatching">
          <label for="home-requirement">告诉我你的时间、兴趣和目标</label>
          <textarea id="home-requirement" v-model="requirement" name="requirement" rows="3"
            placeholder="例如：周末有空，零基础，想学编程，每周能投入 3 小时。" aria-describedby="requirement-help" />
          <div class="form-footer">
            <p id="requirement-help">下一步可以检查和修改提取出的条件。</p>
            <button class="button-primary" type="submit">分析我的需求</button>
          </div>
        </form>
        <div class="hero-links"><RouterLink to="/clubs">先浏览社团</RouterLink><RouterLink to="/chat">向 AI 提问</RouterLink></div>
      </div>

      <aside class="recommendation-example" aria-labelledby="example-heading">
        <div class="example-label"><span>推荐结果示例</span><span>规则评分 + AI 解释</span></div>
        <p class="example-request">“周末有空，零基础，想学编程、参与竞赛。”</p>
        <div class="example-title">
          <div><CategoryMark category="技术" size="sm" /><h2 id="example-heading">编程实践社</h2></div>
          <div class="example-score"><strong>88</strong><span>/ 100 分</span></div>
        </div>
        <dl class="example-facts"><DecisionFact label="活动时间" value="周六下午" /><DecisionFact label="参与门槛" value="零基础可加入" /></dl>
        <div class="example-dimensions" aria-label="示例四维评分">
          <div v-for="dimension in exampleDimensions" :key="dimension.label" class="dimension">
            <div><span>{{ dimension.label }}</span><strong>{{ dimension.score }} / {{ dimension.max }}</strong></div>
            <div class="dimension-track" aria-hidden="true"><span :style="{ width: `${dimension.score / dimension.max * 100}%` }" /></div>
          </div>
        </div>
        <div class="example-reason"><h3>AI 理由示例</h3><p>周六活动与你的空闲时间一致，入门项目适合零基础同学。资料支持“学习编程”这一目标，竞赛安排仍需向社团确认。</p></div>
        <p class="example-note">示意社团与分数，用于说明推荐方式。提交你的需求后生成实际结果。</p>
      </aside>
    </section>

    <section class="trust-section" aria-label="推荐承诺">
      <article><h2>硬约束先行</h2><p>先检查时间、费用、校区与门槛，排除不满足条件的社团。</p></article>
      <article><h2>理由可追溯</h2><p>规则计算四维分数，AI 根据社团资料解释，支持你逐项比较。</p></article>
      <article><h2>模型失效可降级</h2><p>AI 不可用时仍可确认条件、获取规则结果，并查看降级说明。</p></article>
    </section>

    <section class="how-section" aria-labelledby="how-heading">
      <div class="section-heading"><h2 id="how-heading">从一句需求，到有依据的选择</h2><p>你确认条件，系统帮助比较。</p></div>
      <ol class="how-rail">
        <li><span class="step-number" aria-hidden="true">1</span><div><h3>描述你的需求</h3><p>用自己的话说明兴趣、时间和目标。</p></div></li>
        <li><span class="step-number" aria-hidden="true">2</span><div><h3>确认匹配条件</h3><p>检查提取结果，补充费用、校区和门槛。</p></div></li>
        <li><span class="step-number" aria-hidden="true">3</span><div><h3>比较后再决定</h3><p>查看分数、依据和注意事项，登记意向。</p></div></li>
      </ol>
    </section>

    <section class="recruiting-section" aria-labelledby="recruiting-heading" :aria-busy="loading">
      <div class="section-heading recruiting-heading">
        <div><h2 id="recruiting-heading">看看正在招新的社团</h2><p>社团信息与统计来自当前演示数据库。</p></div>
        <RouterLink class="button-secondary" to="/clubs">浏览全部社团</RouterLink>
      </div>
      <dl class="database-stats" aria-label="社团数据">
        <DecisionFact label="可浏览社团" :value="clubsStore.statistics?.totalClubs ?? '—'" />
        <DecisionFact label="已登记成员" :value="clubsStore.statistics?.totalMembers ?? '—'" />
        <DecisionFact label="实际分类" :value="clubsStore.statistics?.categories.length ?? '—'" />
      </dl>
      <form class="club-search" aria-label="搜索社团" @submit.prevent="handleSearch">
        <label for="home-search">已有感兴趣的方向？</label>
        <div><input id="home-search" v-model="searchInput" type="search" placeholder="搜索社团名称、标签或关键词" /><button type="submit" class="button-secondary">搜索社团</button></div>
      </form>
      <div v-if="loadError" class="load-error" role="alert"><p>社团数据暂时无法加载，请检查服务连接后重试。</p><button class="button-secondary" type="button" @click="loadClubs">重新加载</button></div>
      <p v-if="loading" class="load-status" role="status">正在加载社团信息…</p>
      <div v-else-if="recruitingClubs.length" class="clubs-grid">
        <article v-for="club in recruitingClubs" :key="club.id" class="club-card">
          <CategoryMark :category="club.category" />
          <h3>{{ club.name }}</h3>
          <p class="club-description">{{ club.description }}</p>
          <dl class="club-facts">
            <DecisionFact label="活动时间" :value="club.activityTime" /><DecisionFact label="校区" :value="club.campus" />
            <DecisionFact label="费用" :value="club.fee ? `${club.fee} 元` : '免费'" /><DecisionFact label="门槛" :value="skillLabels[club.skillRequirement]" />
          </dl>
          <div class="club-footer"><span>{{ club.memberCount }} 名成员</span><RouterLink :to="{ path: '/clubs', query: { search: club.name } }">查看详情</RouterLink></div>
        </article>
      </div>
      <p v-else-if="!loadError" class="load-status">暂时没有正在招新的社团，可前往社团列表查看全部信息。</p>
    </section>
    <section class="final-cta" aria-labelledby="cta-heading">
      <div><h2 id="cta-heading">从你的条件开始选择。</h2><p>填好时间和兴趣，看看哪些社团值得进一步了解。</p></div>
      <RouterLink class="button-primary" to="/matching">开始条件匹配</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.home-page { padding-block: 56px 64px; }
h1, h2, h3, p { margin: 0; }
h2 { font-size: clamp(24px, 2.6vw, 32px); line-height: 1.35; font-weight: 800; letter-spacing: -.035em; }
h3 { font-size: 18px; line-height: 1.5; font-weight: 750; }
.hero-section { display: grid; grid-template-columns: 1.1fr .9fr; align-items: center; gap: 48px; padding-bottom: 56px; }
.hero-content, .recommendation-example { min-width: 0; }
.product-purpose { color: var(--campus-green); font-size: 14px; font-weight: 600; margin-bottom: 20px; }
h1 { font-size: clamp(36px, 4.4vw, 60px); font-weight: 850; line-height: 1.2; letter-spacing: -.055em; }
.hero-description { max-width: 32em; margin-block: 22px 28px; color: var(--text-muted); font-size: 17px; }
.requirement-form { padding: 20px; border: 1px solid var(--border-moss); border-radius: var(--radius-card); background: var(--surface); }
.requirement-form label { display: block; margin-bottom: 12px; font-size: 15px; font-weight: 650; }
textarea, input { min-width: 0; width: 100%; border: 1px solid var(--border-moss); border-radius: var(--radius-control); padding: 12px; background: var(--surface); color: var(--text-ink); }
textarea { display: block; resize: vertical; min-height: 110px; line-height: 1.6; }
textarea::placeholder, input::placeholder { color: var(--text-muted); opacity: 1; }
.form-footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 14px; }
.form-footer p { color: var(--text-muted); font-size: 14px; max-width: 16em; }
.form-footer button { flex-shrink: 0; }
.hero-links { display: flex; gap: 24px; margin-top: 14px; }
.hero-links a, .club-footer a { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; font-weight: 650; text-underline-offset: 4px; }
.recommendation-example { margin-right: 8px; padding: 28px; border-radius: var(--radius-panel); background: var(--ink-forest); color: var(--surface); box-shadow: 8px 8px 0 var(--signal-lime), 0 18px 35px rgb(23 63 56 / 10%); --text-muted: #c6d8d0; --text-ink: #fff; }
.example-label { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-size: 14px; color: var(--text-muted); }
.example-label > :first-child { color: var(--signal-lime); font-weight: 650; }
.example-request { margin-block: 20px; padding-bottom: 20px; border-bottom: 1px solid #52736b; color: var(--text-muted); font-size: 14px; }
.example-title { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.example-title :deep(.category-mark) { color: var(--text-muted); }
.example-title :deep(.category-symbol) { color: var(--ink-forest); }
.example-title h2 { margin-top: 10px; font-size: 27px; }
.example-score { display: grid; text-align: right; white-space: nowrap; }
.example-score strong { font-size: 62px; line-height: 1; letter-spacing: -.06em; color: var(--signal-lime); }
.example-score span { margin-top: 8px; font-size: 14px; color: var(--text-muted); }
.example-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-block: 22px; }
.example-dimensions { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
.dimension > div:first-child { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; }
.dimension-track { height: 4px; margin-top: 7px; background: #52736b; }
.dimension-track span { display: block; height: 100%; background: var(--signal-lime); }
.example-reason { margin-top: 24px; padding-top: 20px; border-top: 1px solid #52736b; }
.example-reason h3 { font-size: 15px; margin-bottom: 8px; }
.example-reason p, .example-note { font-size: 14px; color: var(--text-muted); }
.example-note { margin-top: 18px; }
.trust-section { display: grid; grid-template-columns: repeat(3, 1fr); border-block: 1px solid var(--border-moss); padding-block: 28px; }
.trust-section article { padding-inline: 28px; }
.trust-section article:first-child { padding-left: 0; }
.trust-section article:last-child { padding-right: 0; }
.trust-section article + article { border-left: 1px solid var(--border-moss); }
.trust-section h2 { font-size: 18px; letter-spacing: 0; margin-bottom: 8px; }
.trust-section p, .section-heading p, .how-rail p, .final-cta p { color: var(--text-muted); font-size: 15px; }
.how-section, .recruiting-section { padding-top: 56px; }
.section-heading p { margin-top: 10px; }
.how-rail { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; list-style: none; padding: 0; margin: 28px 0 0; }
.how-rail li { display: flex; align-items: flex-start; gap: 14px; padding-top: 20px; border-top: 2px solid var(--border-moss); }
.step-number { display: grid; place-items: center; flex-shrink: 0; width: 30px; height: 30px; border: 1px solid var(--border-moss); border-radius: var(--radius-control); color: var(--campus-green); font-size: 14px; font-weight: 750; }
.how-rail p { margin-top: 6px; }
.recruiting-heading { display: flex; justify-content: space-between; align-items: center; gap: 24px; }
.database-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-block: 28px; padding-block: 20px; border-block: 1px solid var(--border-moss); }
.database-stats :deep(dd) { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; }
.club-search { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.club-search label { font-size: 15px; font-weight: 650; }
.club-search > div { display: flex; gap: 10px; width: min(100%, 540px); }
.club-search button { flex-shrink: 0; }
.clubs-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.club-card { min-width: 0; padding: 24px; border: 1px solid var(--border-moss); border-radius: var(--radius-card); background: var(--surface); display: flex; flex-direction: column; }
.club-card h3 { margin-top: 18px; font-size: 22px; overflow-wrap: anywhere; }
.club-description { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; color: var(--text-muted); font-size: 15px; margin-block: 12px 22px; }
.club-facts { margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 18px 14px; }
.club-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid var(--border-moss); margin-top: 10px; padding-top: 10px; font-size: 14px; color: var(--text-muted); }
.load-error, .load-status { padding: 24px; border: 1px solid var(--border-moss); border-radius: var(--radius-card); margin-bottom: 20px; background: var(--surface); }
.load-error p { margin-bottom: 12px; color: var(--danger); }
.final-cta { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-top: 56px; padding-top: 32px; border-top: 1px solid var(--border-moss); }
.final-cta p { margin-top: 10px; }
@media (max-width: 1100px) {
  .hero-section { gap: 28px; }
  .recommendation-example { padding: 22px; }
  .form-footer { align-items: flex-start; flex-direction: column; gap: 12px; }
  .form-footer p { max-width: none; }
  .club-card { padding: 20px; }
}
@media (max-width: 820px) {
  .home-page { padding-block: 32px 40px; }
  .hero-section { grid-template-columns: 1fr; gap: 32px; padding-bottom: 40px; }
  h1 { font-size: clamp(36px, 6vw, 48px); }
  .hero-description { font-size: 16px; }
  .form-footer { align-items: stretch; }
  .requirement-form { padding: 16px; }
  .trust-section, .how-rail, .clubs-grid { grid-template-columns: 1fr; }
  .trust-section { gap: 20px; padding-block: 24px; }
  .trust-section article { padding: 0; }
  .trust-section article + article { border-left: 0; border-top: 1px solid var(--border-moss); padding-top: 20px; }
  .how-section, .recruiting-section { padding-top: 40px; }
  .how-rail { gap: 18px; }
  .recruiting-heading, .club-search, .final-cta { flex-direction: column; align-items: stretch; gap: 18px; }
  .club-search > div { width: 100%; }
  .database-stats { gap: 12px; }
  .example-title h2 { font-size: 24px; }
  .final-cta { margin-top: 40px; }
}
</style>
