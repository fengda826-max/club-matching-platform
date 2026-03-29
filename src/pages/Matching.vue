<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useClubsStore } from '@/stores/clubs'
import { useUserStore } from '@/stores/user'
import { generateRecommendations, getApiKeyStatus } from '@/api/claude'
import type { MatchResult } from '@/types'
import type { UserPreference } from '@/types'

const router = useRouter()
const clubsStore = useClubsStore()
const userStore = useUserStore()

const interestsInput = ref('')
const interestTags = ref<string[]>([])
const skillLevel = ref('')
const goalsInput = ref('')
const goalTags = ref<string[]>([])
const isLoading = ref(false)
const showResults = ref(false)

const skillLevels = [
  { label: '初学者', value: 'beginner' },
  { label: '有一定基础', value: 'intermediate' },
  { label: '熟练掌握', value: 'advanced' },
  { label: '专家水平', value: 'expert' },
]

const apiKeyStatus = computed(() => getApiKeyStatus())
const matchResults = computed(() => userStore.matchResults)
const hasValidApiKey = computed(() => apiKeyStatus.value.valid)

const addInterest = () => {
  if (interestsInput.value.trim()) {
    const interest = interestsInput.value.trim()
    if (!interestTags.value.includes(interest)) {
      interestTags.value.push(interest)
    }
    interestsInput.value = ''
  }
}

const removeInterest = (interest: string) => {
  const index = interestTags.value.indexOf(interest)
  if (index > -1) {
    interestTags.value.splice(index, 1)
  }
}

const addGoal = () => {
  if (goalsInput.value.trim()) {
    const goal = goalsInput.value.trim()
    if (!goalTags.value.includes(goal)) {
      goalTags.value.push(goal)
    }
    goalsInput.value = ''
  }
}

const removeGoal = (goal: string) => {
  const index = goalTags.value.indexOf(goal)
  if (index > -1) {
    goalTags.value.splice(index, 1)
  }
}

const generateMatches = async () => {
  if (!hasValidApiKey.value) {
    ElMessage.warning('请先配置 API Key')
    return
  }

  if (interestTags.value.length === 0 && !skillLevel.value && goalTags.value.length === 0) {
    ElMessage.warning('请至少填写一项信息')
    return
  }

  isLoading.value = true
  showResults.value = false

  try {
    const preferences: UserPreference = {
      interests: interestTags.value,
      skillLevel: skillLevel.value,
      goals: goalTags.value,
    }

    userStore.setPreferences(preferences)

    const response = await generateRecommendations({
      preferences,
      clubs: clubsStore.clubs,
    })

    const results: MatchResult[] = response.matches
      .map((match) => {
        const club = clubsStore.getClubById(match.clubId)
        if (club) {
          return {
            club,
            score::.score,
            reasons: match.reasons,
          }
        }
        return null
      })
      .filter((r): r is MatchResult => r !== null)
      .sort((a, b) => b.score - a.score)

    userStore.setMatchResults(results)
    showResults.value = true

    ElMessage.success(`为你找到 ${results.length} 个匹配的社团！`)
  } catch (error) {
    console.error('Error generating matches:', error)
    ElMessage.error('生成推荐失败，请检查 API Key 配置')
  } finally {
    isLoading.value = false
  }
}

const showClubDetails = (club: any) => {
  const clubId = club.id
  router.push({ name: 'clubs', query: { clubId } })
}

const applyToClub = (club: any) => {
  ElMessage.success(`已向 "${club.name}" 提交申请！`)
}

const getScoreColor = (score: number) => {
  if (score >= 80) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

const getScoreLevel = (score: number) => {
  if (score >= 80) return '高度匹配'
  if (score >= 60) return '中度匹配'
  return '可能适合'
}
</script>

<template>
  <div class="matching-page">
    <!-- Decorative Elements -->
    <div class="floating-elements">
      <div class="float-item" style="--delay: 0s; --x: 10%; --y: 15%; --size: 80px">✨</div>
      <div class="float-item" style="--delay: -5s; --x: 85%; --y: 25%; --size: 60px">🎯</div>
      <div class="float-item" style="--delay: -10s; --x: 20%; --y: 70%; --size: 100px">⚽</div>
    </div>

    <!-- Header -->
    <section class="page-header">
      <div class="header-pattern"></div>
      <div class="header-content">
        <div class="header-icon">
          <span class="icon-emoji">✨</span>
        </div>
        <div class="header-text">
          <h1 class="page-title">智能匹配</h1>
          <p class="page-subtitle">填写你的兴趣和偏好，AI为你推荐最适合的社团</p>
        </div>
      </div>
    </section>

    <!-- API Key Warning -->
    <div class="api-warning" v-if="!hasValidApiKey">
      <div class="warning-card">
        <div class="warning-icon">⚠️</div>
        <h3>API Key 未配置</h3>
        <p>请在项目根目录创建 <code>.env</code> 文件并添加：</p>
        <pre class="code-block">VITE_ANTHROPIC_API_KEY=your_api_key_here</pre>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- Preference Form -->
      <section v-if="!showResults" class="form-section">
        <div class="form-card">
          <!-- Interests -->
          <div class="form-group">
            <div class="form-label">
              <span class="label-icon">💡</span>
              <label>兴趣爱好</label>
            </div>
            <div class="tag-input-group">
              <input
                v-model="interestsInput"
                type="text"
                class="tag-input"
                placeholder="输入兴趣爱好，按回车添加"
                @keyup.enter="addInterest"
              />
              <button class="add-tag-btn" @click="addInterest">
                <span>+</span>
              </button>
            </div>
            <div class="tags-container">
              <span
                v-for="interest in interestTags"
                :key="interest"
                class="tag-item"
              >
                {{ interest }}
                <span class="tag-remove" @click="removeInterest(interest)">✕</span>
              </span>
            </div>
          </div>

          <!-- Skill Level -->
          <div class="form-group">
            <div class="form-label">
              <span class="label-icon">📊</span>
              <label>技能水平</label>
            </div>
            <div class="skill-options">
              <button
                v-for="level in skillLevels"
                :key="level.value"
                class="skill-option"
                :class="{ active: skillLevel === level.value }"
                @click="skillLevel = level.value"
              >
                {{ level.label }}
              </button>
            </div>
          </div>

          <!-- Goals -->
          <div class="form-group">
            <div class="form-label">
              <span class="label-icon">🎯</span>
              <label>参与社团的目标</label>
            </div>
            <div class="tag-input-group">
              <input
                v-model="goalsInput"
                type="text"
                class="tag-input"
                placeholder="输入目标，按回车添加"
                @keyup.enter="addGoal"
              />
              <button class="add-tag-btn" @click="addGoal">
                <span>+</span>
              </button>
            </div>
            <div class="tags-container">
              <span
                v-for="goal in goalTags"
                :key="goal"
                class="tag-item"
              >
                {{ goal }}
                <span class="tag-remove" @click="removeGoal(goal)">✕</span>
              </span>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="form-actions">
            <button
              class="submit-button"
              :class="{ loading: isLoading, disabled: isLoading || !hasValidApiKey }"
              @click="generateMatches"
            >
              <span class="btn-icon">✨</span>
              <span class="btn-text">开始匹配</span>
              <span class="btn-loading" v-if="isLoading"></span>
            </button>
          </div>
        </div>
      </section>

      <!-- Match Results -->
      <section v-if="showResults" class="results-section">
        <div class="results-header">
          <div class="header-icon">
            <span class="icon-emoji">🏆</span>
          </div>
          <div class="header-text">
            <h2 class="results-title">匹配结果</h2>
            <p class="results-subtitle">AI为你找到最合适的社团</p>
          </div>
        </div>

        <!-- No Results -->
        <div v-if="matchResults.length === 0" class="empty-results">
          <div class="empty-icon">😔</div>
          <p class="empty-text">没有找到匹配的社团</p>
          <p class="empty-hint">试试调整你的条件？</p>
          <button class="reset-btn" @click="showResults = false">
            <span>↺</span>
            <span>重新填写</span>
          </button>
        </div>

        <!-- Results List -->
        <div v-else class="match-results-grid">
          <div
            v-for="(result, index) in matchResults"
            :key="result.club.id"
            class="match-result-card"
            :style="{ '--delay': index * 0.15 + 's' }"
          >
            <div class="match-header">
              <div class="match-rank">
                <span class="rank-number">#{{ index + 1 }}</span>
              </div>
              <div class="match-score" :style="{ '--score-color': getScoreColor(result.score) }">
                <span class="score-value">{{ result.score }}%</span>
                <span class="score-label">匹配度</span>
              </div>
            </div>

            <div class="match-body">
              <div class="match-club-badge">{{ result.club.category }}</div>
              <h3 class="match-club-name">{{ result.club.name }}</h3>
              <p class="match-club-desc">{{ result.club.description.substring(0, 120) }}...</p>

              <div class="match-reasons">
                <div class="reasons-title">
                  <span class="title-icon">💡</span>
                  <span>匹配理由</span>
                </div>
                <ul>
                  <li v-for="(reason, idx) in result.reasons" :key="idx">
                    {{ reason }}
                  </li>
                </ul>
              </div>

              <div class="match-stats">
                <div class="stat-item">
                  <span class="stat-icon">👥</span>
                  <span class="stat-value">{{ result.club.memberCount }} 成员</span>
                </div>
                <div class="stat-item">
                  <span class="stat-icon">🏷️</span>
                  <span class="stat-value">3+ 个标签</span>
                </div>
              </div>
            </div>

            <div class="match-actions">
              <button class="action-btn secondary" @click="showClubDetails(result.club)">
                <span>查看详情</span>
                <span class="action-arrow">→</span>
              </button>
              <button class="action-btn primary" @click="applyToClub(result.club)">
                <span>申请加入</span>
                <span class="action-arrow">→</span>
              </button>
            </div>
          </div>
        </div>
      </sectional>
    </div>
  </div>
</template>

<style scoped>
.matching-page {
  min-height: 100vh;
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Floating Elements */
.floating-elements {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.float-item {
  position: absolute;
  font-size: var(--size);
  opacity: 0.1;
  animation: float 20s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
  50% {
    transform: translateY(-30px) rotate(10deg) scale(1.05);
  }
}

/* Page Header */
.page-header {
  position: relative;
  padding: 80px 20px 60px;
  overflow: hidden;
}

.header-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 0%, rgba(255, 107, 107, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 100%, rgba(46, 134, 171, 0.15) 0%, transparent 50%);
  animation: patternMove 30s ease-in-out infinite;
}

@keyframes patternMove {
  0%, 100% {
    transform: scale(1) translate(0);
  }
  50% {
    transform: scale(1.05) translate(5px, -5px);
  }
}

.header-content {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: 1;
}

.header-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  box-shadow: 0 8px 24px rgba(255, 107, 107, 0.25);
  animation: bounce 3s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.icon-emoji {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.header-text {
  flex: 1;
}

.page-title {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 800;
  color: var(--color-dark);
  margin-bottom: 8px;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 18px;
  color: var(--color-gray-600);
}

/* API Warning */
.api-warning {
  margin-bottom: 40px;
}

.warning-card {
  background: rgba(245, 158, 11, 0.95);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-lg);
  padding: 32px;
  display: flex;
  align-items: center;
  gap: 20px;
  animation: slideDown 0.4s ease-out;
}

.warning-icon {
  font-size: 48px;
}

.warning-card h3 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 12px;
}

.warning-card p {
  color: var(--color-gray-600);
  margin-bottom: 16px;
}

.code-block {
  background: var(--color-gray-900);
  color: #F8F9FA;
  padding: 16px 24px;
  border-radius: var(--radius-md);
  font-family: monospace;
  font-size: 14px;
  overflow-x: auto;
}

/* Content Wrapper */
.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* Form Section */
.form-section {
  animation: slideUp 0.5s ease-out 0.2s both;
}

.form-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 40px;
  box-shadow: var(--shadow-lg);
}

.form-group {
  margin-bottom: 40px;
}

.form-group:last-child {
  margin-bottom: 32px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.label-icon {
  font-size: 24px;
}

.form-label label {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--color-dark);
}

/* Tag Input Group */
.tag-input-group {
  display: flex;
  gap: 12px;
}

.tag-input {
  flex: 1;
  padding: 14px 20px;
  font-size: 16px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-full);
  outline: none;
  transition: all 0.3s ease;
  background: var(--color-gray-50);
}

.tag-input:focus {
  border-color: var(--color-primary);
  background: white;
  box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.2);
}

.add-tag-btn {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border: none;
  border-radius: var(--radius-full);
  color: white;
  font-size: 28px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
  flex-shrink: 0;
}

.add-tag-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.35);
}

/* Tags Container */
.tags-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  min-height: 48px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 9999px;
  font-size: 14px;
  color: var(--color-dark);
  font-weight: 500;
  animation: slideUp 0.3s ease-out both;
  animation-delay: calc(var(--index, 0) * 0.05s);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tag-remove {
  margin-left: 4px;
  opacity: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-item:hover .tag-remove {
  opacity: 1;
}

/* Skill Options */
.skill-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.skill-option {
  padding: 16px 24px;
  background: var(--color-gray-100);
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: 15px;
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

.skill-option:hover {
  background: rgba(255, 107, 107, 0.05);
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

.skill-option.active {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  border-color: var(--color-secondary);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: center;
  padding-top: 40px;
  border-top: 1px solid var(--color-gray-100);
}

.submit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 18px 48px;
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  border: none;
  border-radius: 9999px;
  color: white;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.4s ease;
  min-width: 280px;
  box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
}

.submit-button:hover:not(.disabled) {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 32px rgba(255, 107, 107, 0.4);
}

.submit-button.loading {
  pointer-events: none;
  opacity: 0.8;
}

.submit-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-gray-300);
}

.btn-icon {
  font-size: 24px;
}

.btn-text {
  font-weight: 600;
}

.btn-loading {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Results Section */
.results-section {
  animation: slideUp 0.5s ease-out 0.3s both;
}

.results-header {
  text-align: center;
  margin-bottom: 48px;
}

.results-title {
  font-family: var(--font-display);
);
  font-size: 36px;
  font-weight: 800;
  color: var(--color-dark);
  margin-bottom: 8px;
}

.results-subtitle {
  color: var(--color-gray-600);
  font-size: 16px;
}

/* Empty Results */
.empty-results {
  text-align: center;
  padding: 60px 40px;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  animation: bounce 2s ease-in-out infinite;
}

.empty-text {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 12px;
}

.empty-hint {
  color: var(--color-gray-600);
  margin-bottom: 32px;
}

.reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  border-radius: 9999px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  background: rgba(255, 107, 107, 0.1);
}

/* Results Grid */
.match-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 32px;
}

/* Match Result Card */
.match-result-card {
  background: white;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  transition: all 0.4s ease;
  opacity: 0;
  animation: slideUp 0.6s ease-out both;
  animation-delay: var(--delay);
}

.match-result-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
}

/* Match Header */
.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--color-gray-100);
}

.match-rank {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-number {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 800;
}

.match-score {
  flex: 1;
}

.score-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  color: var(--score-color);
}

.score-label {
  font-size: 13px;
  color: var(--color-gray-600);
  margin-left: 4px;
}

/* Match Body */
.match-body {
  padding: 24px;
}

.match-club-badge {
  display: inline-block;
  padding: 6px 14px;
  background: rgba(255, 107, 107, 0.1);
  color: var(--color-secondary);
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}

.match-club {
  margin-bottom: 24px;
}

.match-club-name {
  font: 22px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 8px;
  line-height: 1.4;
}

.match-club-desc {
  color: var(--color-gray-600);
  line-height: 1.7;
  margin-bottom: 20px;
}

/* Match Reasons */
.match-reasons {
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 20px;
}

.reasons-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-weight: 600;
  color: var(--color-dark);
  font-size: 15px;
}

.match-reasons ul {
  margin: 0;
  padding-left: 20px;
}

.match-reasons li {
  color: var(--color-gray-600);
  line-height: 1.8;
  margin-bottom: 8px;
  position: relative;
  padding-left: 16px;
}

.match-reasons li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-secondary);
  font-weight: 700;
}

/* Match Stats */
.match-stats {
  display: flex;
  gap: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-gray-100);
}

.stat-item {
  flex: 1;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  font-size: 20px;
}

.stat-value {
  font-weight: 600;
  color: var(--color-dark);
  font-size: 15px;
}

/* Match Actions */
.match-actions {
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid var(--color-gray-100);
}

.action-btn {
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 9999px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn.primary {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
}

.action-btn.secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.action-btn.secondary:hover {
  background: rgba(255, 107, 107, 0.1);
}

.action.action-arrow {
  font-size: 14px;
  opacity: 0;
  transition: all 0.3s ease;
}

.action-btn:hover .action-arrow {
  opacity: 1;
  transform: translateX(4px);
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 32px;
  }

  .form-card {
    padding: 24px;
  }

  .skill-options {
    grid-template-columns: 1fr;
  }

  .match-results-grid {
    grid-template-columns: 1fr;
  }
}
</style>
