<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'
import { apiClient } from '@/api/client'
import type { Club } from '@/types'
import PageIntro from '@/components/layout/PageIntro.vue'
import CategoryMark from '@/components/ui/CategoryMark.vue'
import DecisionFact from '@/components/ui/DecisionFact.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatusPill from '@/components/ui/StatusPill.vue'

const route = useRoute()
const clubsStore = useClubsStore()
const filtersExpanded = ref(false)
const loadError = ref(false)
const selectedClub = ref<Club | null>(null)
const dialog = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const pendingIntents = ref(new Set<number>())
const recording = computed(() => selectedClub.value ? pendingIntents.value.has(selectedClub.value.id) : false)
const intentMessage = ref('')
const intentError = ref(false)
let returnFocus: HTMLElement | null = null
let previousOverflow = ''

const filteredClubs = computed(() => clubsStore.filteredClubs)
const activeFilters = computed(() => [
  clubsStore.searchQuery ? `“${clubsStore.searchQuery}”` : '',
  clubsStore.selectedCategory,
  ...clubsStore.selectedTags,
].filter(Boolean))
const filterSummary = computed(() => [
  ...activeFilters.value,
  clubsStore.loading ? '正在加载社团' : `${filteredClubs.value.length} 个结果`,
].join(' · '))
const skillLabels: Record<Club['skillRequirement'], string> = {
  beginner: '零基础可加入', intermediate: '需要一定基础', advanced: '需要进阶经验', expert: '需要专业经验',
}
const skillLabel = (club: Pick<Club, 'skillRequirement'>) => skillLabels[club.skillRequirement] || '门槛待确认'
const feeLabel = (club: Pick<Club, 'fee'>) => club.fee === 0 ? '免费' : `${club.fee} 元`

async function loadClubs() {
  loadError.value = false
  try {
    await clubsStore.fetchClubs()
  } catch {
    loadError.value = true
  }
  // Statistics still refresh, but their outage must not hide a usable club list.
  try {
    await clubsStore.fetchStatistics()
  } catch {
    // The store logs the failure; this page does not display statistics.
  }
}

onMounted(() => {
  if (typeof route.query.search === 'string') clubsStore.setSearchQuery(route.query.search)
  if (typeof route.query.category === 'string') clubsStore.setSelectedCategory(route.query.category)
  void loadClubs()
})

async function showClubDetails(club: Club, event: MouseEvent) {
  returnFocus = event.currentTarget as HTMLElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  intentMessage.value = ''
  intentError.value = false
  selectedClub.value = club
  await nextTick()
  closeButton.value?.focus()
}

async function closeDetails() {
  selectedClub.value = null
  document.body.style.overflow = previousOverflow
  await nextTick()
  returnFocus?.focus()
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    void closeDetails()
  } else if (event.key === 'Tab') {
    const controls = dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]')
    const first = controls?.[0]
    const last = controls?.[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }
}

async function applyToClub(club: Club) {
  if (!club.isRecruiting || pendingIntents.value.has(club.id)) return
  pendingIntents.value.add(club.id)
  intentMessage.value = ''
  intentError.value = false
  try {
    const result = await apiClient.intents.record({ clubId: club.id, source: 'browsing' })
    if (selectedClub.value?.id === club.id) intentMessage.value = result.created ? '意向已记录' : '这条意向已经记录过'
  } catch (error) {
    if (selectedClub.value?.id === club.id) {
      intentError.value = true
      intentMessage.value = error instanceof Error ? error.message : '记录失败，请稍后重试'
    }
  } finally {
    pendingIntents.value.delete(club.id)
  }
}

onUnmounted(() => {
  if (selectedClub.value) document.body.style.overflow = previousOverflow
})
</script>

<template>
  <div class="clubs-page content-wide">
    <div :inert="selectedClub ? true : undefined">
      <PageIntro>
        发现社团
        <template #description>从兴趣出发，也看看时间、校区和入社门槛。找到适合你校园生活的社团。</template>
      </PageIntro>
      <div class="discovery-layout">
        <aside class="filter-sidebar" aria-label="社团筛选">
          <button class="filter-toggle button-secondary" aria-controls="club-filters" :aria-expanded="filtersExpanded" @click="filtersExpanded = !filtersExpanded">
            筛选条件 <span aria-hidden="true">{{ filtersExpanded ? '−' : '+' }}</span>
          </button>
          <div id="club-filters" class="filter-panel" :class="{ expanded: filtersExpanded }">
            <h2>筛选社团</h2>
            <div class="search-field">
              <label for="club-search">关键词</label>
              <input id="club-search" :value="clubsStore.searchQuery" type="search" aria-label="搜索社团" placeholder="名称、描述或标签" @input="clubsStore.setSearchQuery(($event.target as HTMLInputElement).value)" />
            </div>
            <fieldset>
              <legend>社团分类</legend>
              <div class="category-options">
                <button class="filter-option" aria-label="分类：全部" :aria-pressed="!clubsStore.selectedCategory" @click="clubsStore.setSelectedCategory('')">全部</button>
                <button v-for="category in clubsStore.categories" :key="category.id" class="filter-option" :aria-label="`分类：${category.name}`" :aria-pressed="clubsStore.selectedCategory === category.name" @click="clubsStore.setSelectedCategory(category.name)">
                  <CategoryMark :category="category.name" size="sm" />
                </button>
              </div>
            </fieldset>
            <fieldset v-if="clubsStore.allTags.length">
              <legend>兴趣标签</legend>
              <p class="filter-hint">可多选，匹配任一标签</p>
              <div class="tag-options">
                <button v-for="tag in clubsStore.allTags" :key="tag" class="filter-option tag-option" :aria-label="`标签：${tag}`" :aria-pressed="clubsStore.selectedTags.includes(tag)" @click="clubsStore.toggleTag(tag)">{{ tag }}</button>
              </div>
            </fieldset>
            <button v-if="activeFilters.length" class="clear-button button-secondary" @click="clubsStore.clearFilters()">清除筛选</button>
          </div>
        </aside>
        <section class="results-section" aria-labelledby="results-heading" :aria-busy="clubsStore.loading">
          <div class="results-header">
            <h2 id="results-heading">社团列表</h2>
            <p class="filter-summary" aria-live="polite" aria-atomic="true">{{ filterSummary }}</p>
          </div>
          <p v-if="clubsStore.loading" class="loading-state">正在加载社团资料，请稍候。</p>
          <EmptyState v-else-if="loadError" role="alert" title="社团资料暂时无法加载" description="请检查服务连接，然后重试。你的筛选条件已保留。">
            <template #action><button class="button-primary" @click="loadClubs">重新加载</button></template>
          </EmptyState>
          <EmptyState v-else-if="!filteredClubs.length" title="没有找到符合条件的社团" :description="activeFilters.length ? `当前条件：${activeFilters.join(' · ')}。清除这些条件，查看全部社团。` : '暂时还没有社团资料，请稍后再来看看。'">
            <template v-if="activeFilters.length" #action><button class="button-primary" @click="clubsStore.clearFilters()">清除筛选</button></template>
          </EmptyState>
          <div v-else class="clubs-grid">
            <article v-for="club in filteredClubs" :key="club.id" class="club-card" :aria-labelledby="`club-name-${club.id}`">
              <div class="club-header">
                <CategoryMark :category="club.category" />
                <StatusPill :tone="club.isRecruiting ? 'success' : 'neutral'" :label="club.isRecruiting ? '招募中' : '暂停招新'" />
              </div>
              <h3 :id="`club-name-${club.id}`">{{ club.name }}</h3>
              <p class="club-description">{{ club.description }}</p>
              <div class="club-tags" aria-label="社团标签"><span v-for="tag in club.tags.slice(0, 3)" :key="tag">{{ tag }}</span><span v-if="club.tags.length > 3">+{{ club.tags.length - 3 }}</span></div>
              <dl class="decision-facts">
                <DecisionFact label="活动时间" :value="club.activityTime || '时间待定'" />
                <DecisionFact label="所在校区" :value="club.campus || '校区待定'" />
                <DecisionFact label="费用" :value="feeLabel(club)" />
                <DecisionFact label="技能门槛" :value="skillLabel(club)" />
              </dl>
              <div class="club-footer">
                <span>{{ club.memberCount }} 位成员</span>
                <button class="button-primary" @click="showClubDetails(club, $event)">查看详情</button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>
    <div v-if="selectedClub" class="modal-overlay" @click.self="closeDetails">
      <section ref="dialog" role="dialog" aria-modal="true" aria-labelledby="club-dialog-title" class="club-dialog" @keydown="handleDialogKeydown">
        <div class="dialog-header">
          <CategoryMark :category="selectedClub.category" />
          <button ref="closeButton" class="button-secondary close-button" aria-label="关闭社团详情" @click="closeDetails">关闭</button>
        </div>
        <div class="dialog-body">
          <StatusPill :tone="selectedClub.isRecruiting ? 'success' : 'neutral'" :label="selectedClub.isRecruiting ? '招募中' : '暂停招新'" />
          <h2 id="club-dialog-title">{{ selectedClub.name }}</h2>
          <p class="dialog-description">{{ selectedClub.description }}</p>
          <div class="club-tags"><span v-for="tag in selectedClub.tags" :key="tag">{{ tag }}</span></div>
          <dl class="decision-facts dialog-facts">
            <DecisionFact label="活动时间" :value="selectedClub.activityTime || '时间待定'" />
            <DecisionFact label="每周投入" :value="`${selectedClub.weeklyHours} 小时`" />
            <DecisionFact label="所在校区" :value="selectedClub.campus || '校区待定'" />
            <DecisionFact label="费用" :value="feeLabel(selectedClub)" />
            <DecisionFact label="技能门槛" :value="skillLabel(selectedClub)" />
            <DecisionFact label="成员数量" :value="`${selectedClub.memberCount} 人`" />
            <DecisionFact class="full-width" label="入社要求" :value="selectedClub.requirements || '请联系社团确认'" />
            <DecisionFact class="full-width" label="联系方式" :value="selectedClub.contact || '暂未提供联系方式'" />
          </dl>
        </div>
        <div class="dialog-actions">
          <p v-if="intentMessage" role="status" :class="{ 'intent-error': intentError }">{{ intentMessage }}</p>
          <p v-else class="intent-hint">{{ selectedClub.isRecruiting ? '记录意向后，可通过以上联系方式了解招新安排。' : '当前暂停招新，可联系社团了解下一次招募时间。' }}</p>
          <button class="intent-button button-primary" :disabled="!selectedClub.isRecruiting" :aria-disabled="recording || undefined" :aria-busy="recording" @click="applyToClub(selectedClub)">{{ !selectedClub.isRecruiting ? '暂停招新' : recording ? '正在记录…' : '记录加入意向' }}</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.clubs-page { padding-bottom: 64px; }
.discovery-layout { display: grid; grid-template-columns: 248px minmax(0, 1fr); align-items: start; gap: 28px; }
.filter-sidebar, .results-section { min-width: 0; }
.filter-panel { padding: 22px; border: 1px solid var(--border-moss); border-radius: var(--radius-card); background: var(--surface); }
.filter-panel h2, .results-header h2 { margin: 0; font-size: 18px; font-weight: 750; }
.filter-toggle { display: none; }
.search-field { display: grid; gap: 8px; margin-top: 22px; }
label, legend { color: var(--text-ink); font-size: 14px; font-weight: 650; }
input { width: 100%; min-width: 0; padding: 10px 12px; color: var(--text-ink); background: var(--surface); border: 1px solid var(--border-moss); border-radius: var(--radius-control); font-size: 14px; }
input::placeholder { color: var(--text-muted); }
fieldset { min-width: 0; margin: 24px 0 0; padding: 0; border: 0; }
legend { margin-bottom: 10px; padding: 0; }
.category-options { display: grid; gap: 6px; }
.filter-option { min-height: 44px; padding: 7px 10px; border: 1px solid transparent; border-radius: var(--radius-control); color: var(--text-ink); background: var(--surface); text-align: left; cursor: pointer; font-size: 14px; overflow-wrap: anywhere; }
.filter-option:hover { background: var(--field-paper); }
.filter-option[aria-pressed="true"] { border-color: var(--campus-green); background: var(--field-paper); box-shadow: inset 3px 0 var(--campus-green); font-weight: 700; }
.filter-hint { margin: 0 0 10px; color: var(--text-muted); font-size: 14px; }
.tag-options { display: flex; flex-wrap: wrap; gap: 7px; }
.tag-option { max-width: 100%; border-color: var(--border-moss); }
.clear-button { width: 100%; margin-top: 24px; }
.results-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 8px 20px; margin-bottom: 18px; }
.filter-summary { margin: 0; color: var(--text-muted); font-size: 14px; overflow-wrap: anywhere; }
.loading-state { padding: 40px 24px; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border-moss); border-radius: var(--radius-card); }
.clubs-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.club-card { display: flex; flex-direction: column; min-width: 0; padding: 24px; border: 1px solid var(--border-moss); border-radius: var(--radius-card); background: var(--surface); }
.club-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; }
.club-card h3 { margin: 22px 0 10px; font-size: 23px; line-height: 1.4; font-weight: 750; overflow-wrap: anywhere; }
.club-description { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 3.4em; margin: 0 0 16px; color: var(--text-muted); font-size: 15px; line-height: 1.7; overflow-wrap: anywhere; }
.club-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.club-tags span { max-width: 100%; padding: 3px 8px; background: var(--field-paper); border-radius: var(--radius-control); color: var(--text-muted); font-size: 14px; overflow-wrap: anywhere; }
.decision-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 16px; margin: 22px 0; padding-top: 20px; border-top: 1px solid var(--border-moss); }
.club-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: auto; padding-top: 18px; border-top: 1px solid var(--border-moss); }
.club-footer > span { color: var(--text-muted); font-size: 14px; }
.club-footer button { flex-shrink: 0; }
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 24px; background: rgb(20 37 34 / 56%); }
.club-dialog { width: min(100%, 660px); max-height: calc(100dvh - 48px); overflow-y: auto; overscroll-behavior: contain; background: var(--surface); border: 1px solid var(--border-moss); border-radius: var(--radius-panel); box-shadow: var(--shadow-lg); }
.dialog-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 20px 28px; border-bottom: 1px solid var(--border-moss); }
.dialog-body { padding: 28px; }
.dialog-body h2 { margin: 18px 0 12px; font-size: clamp(26px, 3vw, 32px); line-height: 1.35; font-weight: 800; overflow-wrap: anywhere; }
.dialog-description { margin: 0 0 18px; color: var(--text-muted); font-size: 15px; line-height: 1.8; white-space: pre-line; overflow-wrap: anywhere; }
.dialog-facts { margin-bottom: 0; }
.full-width { grid-column: 1 / -1; white-space: pre-line; }
.dialog-actions { display: flex; flex-direction: column; align-items: stretch; gap: 14px; padding: 22px 28px; border-top: 1px solid var(--border-moss); }
.dialog-actions p { margin: 0; color: var(--campus-green); font-size: 14px; }
.dialog-actions .intent-hint { color: var(--text-muted); }
.dialog-actions .intent-error { color: var(--danger); }
.clubs-page :is(button, input):focus-visible { outline: 3px solid var(--campus-green); outline-offset: 3px; }
@media (max-width: 1100px) {
  .discovery-layout { grid-template-columns: 218px minmax(0, 1fr); gap: 20px; }
  .club-card { padding: 20px; }
  .clubs-grid { grid-template-columns: 1fr; }
}
@media (max-width: 820px) {
  .clubs-page { padding-bottom: 40px; }
  .discovery-layout { grid-template-columns: 1fr; gap: 24px; }
  .filter-toggle { display: flex; justify-content: space-between; width: 100%; }
  .filter-panel { display: none; margin-top: 10px; padding: 20px; }
  .filter-panel.expanded { display: block; }
  .filter-panel h2 { display: none; }
  .search-field { margin-top: 0; }
  .category-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .results-header { align-items: flex-start; flex-direction: column; }
  .modal-overlay { padding: 18px; }
  .club-dialog { max-height: calc(100dvh - 36px); }
  .dialog-header { padding: 16px 20px; }
  .dialog-body { padding: 20px; }
  .dialog-actions { padding: 20px; }
}
</style>
