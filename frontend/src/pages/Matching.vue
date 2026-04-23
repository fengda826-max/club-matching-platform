<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useClubsStore } from '@/stores/clubs'
import { useUserStore } from '@/stores/user'
import { apiClient } from '@/api/client'
import { addTag, removeTag, truncateText, formatMatchScore, MATCHING_CONFIG } from '@/shared'
import type { MatchResult } from '@/types'
import type { UserPreference } from '@/types'
import type { Club } from '@/types'

const router = useRouter()
const clubsStore = useClubsStore()
const userStore = useUserStore()

const interestsInput = ref('')
const interestTags = ref<string[]>([])
const skillLevel = ref<'' | 'beginner' | 'intermediate' | 'advanced' | 'expert'>('')
const goalsInput = ref('')
const goalTags = ref<string[]>([])
const isLoading = ref(false)
const showResults = ref(false)

const skillLevels: Array<{ label: string, value: 'beginner' | 'intermediate' | 'advanced' | 'expert' }> = [
  { label: '初学者', value: 'beginner' },
  { label: '有一定基础', value: 'intermediate' },
  { label: '熟练掌握', value: 'advanced' },
  { label: '专家水平', value: 'expert' },
]

const { SCORE_THRESHOLDS } = MATCHING_CONFIG

const matchResults = computed(() => userStore.matchResults)
const totalTags = computed(() => interestTags.value.length + goalTags.value.length)

// Check backend health on mount
const backendAvailable = ref(true)
async function checkBackendHealth() {
  try {
    await apiClient.ai.health()
    backendAvailable.value = true
  } catch (err) {
    console.error('Backend not available:', err)
    backendAvailable.value = false
  }
}

onMounted(async () => {
  checkBackendHealth()
  // Fetch clubs if not already loaded
  if (clubsStore.clubs.length === 0) {
    try {
      await clubsStore.fetchClubs()
    } catch (err) {
      console.error('Failed to load clubs:', err)
    }
  }
})

const hasValidBackend = computed(() => backendAvailable.value)

const addInterest = () => {
  interestsInput.value = addTag(interestsInput.value, interestTags.value)
}

const removeInterest = (interest: string) => {
  removeTag(interest, interestTags.value)
}

const addGoal = () => {
  goalsInput.value = addTag(goalsInput.value, goalTags.value)
}

const removeGoal = (goal: string) => {
  removeTag(goal, goalTags.value)
}

const generateMatches = async () => {
  if (!hasValidBackend.value) {
    ElMessage.warning('后端服务不可用，请检查后端是否启动')
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

    const response = await apiClient.ai.matching(preferences)

    const results: MatchResult[] = response.matches
      .map((match) => {
        const club = clubsStore.getClubById(String(match.clubId))
        if (club) {
          return {
            club,
            score: match.matchScore,
            reasons: [match.matchReason],
          }
        }
        return null
      })
      .filter((r) => r !== null)
      .sort((a, b) => b.score - a.score)

    userStore.setMatchResults(results)
    showResults.value = true

    ElMessage.success(`为你找到 ${results.length} 个匹配的社团！`)
  } catch (error) {
    console.error('Error generating matches:', error)
    ElMessage.error('生成推荐失败，请检查后端服务是否正常运行')
  } finally {
    isLoading.value = false
  }
}

const showClubDetails = (club: Club) => {
  const clubId = club.id
  router.push({ name: 'clubs', query: { clubId } })
}

const applyToClub = (club: Club) => {
  ElMessage.success(`已向 "${club.name}" 提交申请！`)
}

const getScoreColor = (score: number) => formatMatchScore(score, 'css-var').color

// Score gradient configuration
const scoreGradientConfig = [
  { threshold: SCORE_THRESHOLDS.HIGH, colorVar: '--color-primary', rgba: '255, 107, 107' },
  { threshold: SCORE_THRESHOLDS.MEDIUM, colorVar: '--color-secondary', rgba: '46, 134, 171' },
  { threshold: SCORE_THRESHOLDS.LOW, colorVar: '--color-accent', rgba: '255, 217, 61' },
  { threshold: 0, colorVar: '--color-gray-600', rgba: '134, 142, 150' },
] as const

const getScoreBg = (score: number) => {
  const config = scoreGradientConfig.find(c => score >= c.threshold)!
  return `conic-gradient(var(${config.colorVar}) ${score}%, rgba(${config.rgba}, 0.15) 0)`
}
</script>

<template>
  <div class="matching-page">
    <!-- Noise Grain Overlay -->
    <div class="noise-overlay"></div>

    <!-- Animated Magical Orb that responds to input -->
    <div class="magic-orb" :class="{ active: totalTags > 0 }" :style="{
      '--pulse-size': 1 + (totalTags * 0.03),
      '--orb-hue': 'calc(20 + ' + (totalTags * 8) + ')'
    }"></div>

    <!-- Floating Particles -->
    <div class="particles">
      <div
        v-for="i in 8"
        :key="i"
        class="particle"
        :style="{
          '--delay': -i * 1.2 + 's',
          '--left': (i * 11) + '%',
          '--top': (i * 9 + 15) + '%',
          '--size': (4 + i) + 'px'
        }"
      ></div>
    </div>

    <!-- Hero Header with Diagonal Cut -->
    <section class="hero-header">
      <div class="hero-gradient"></div>
      <div class="hero-content container">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          AI 智能匹配
        </div>
        <h1 class="hero-title">
          找到<span class="title-gradient">最适合你的</span>
          <br>社团组织
        </h1>
        <p class="hero-subtitle">告诉我们你的兴趣爱好与目标，AI 将为你精准推荐</p>
      </div>
      <div class="hero-diagonal"></div>
    </section>

    <!-- Backend Warning -->
    <div class="container api-warning" v-if="!hasValidBackend">
      <div class="warning-banner">
        <div class="warning-icon">⚡</div>
        <div class="warning-text">
          <h3>后端服务未连接，AI 功能不可用</h3>
          <p>请先启动后端服务: <code>cd backend &amp;&amp; npm run dev</code></p>
        </div>
      </div>
    </div>

    <div class="container content-container">
      <!-- Preference Form - Diagonal Layout -->
      <section v-if="!showResults" class="form-section">
        <div class="form-wrapper">
          <div class="form-side-left">
            <div class="form-intro">
              <h2>告诉你自己</h2>
              <p>填写的信息越详细，AI 推荐越精准✍️</p>
            </div>

            <!-- Interests -->
            <div class="form-group">
              <div class="form-label">
                <span class="label-emoji">🎨</span>
                <label>兴趣爱好</label>
                <span class="label-count">{{ interestTags.length }} 个</span>
              </div>
              <div class="tag-input-wrapper">
                <input
                  v-model="interestsInput"
                  type="text"
                  class="custom-tag-input"
                  placeholder="输入后按回车添加..."
                  @keyup.enter="addInterest"
                />
                <button class="add-btn" @click="addInterest">添加</button>
              </div>
              <div class="tag-cloud">
                <span
                  v-for="(interest, idx) in interestTags"
                  :key="interest"
                  class="tag-chip"
                  :style="{ '--animation-order': idx + 's' }"
                >
                  {{ interest }}
                  <button class="chip-remove" @click="removeInterest(interest)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </span>
              </div>
            </div>

            <!-- Skill Level -->
            <div class="form-group">
              <div class="form-label">
                <span class="label-emoji">⚡</span>
                <label>技能水平</label>
              </div>
              <div class="skill-grid">
                <button
                  v-for="level in skillLevels"
                  :key="level.value"
                  class="skill-card"
                  :class="{ active: skillLevel === level.value }"
                  @click="skillLevel = level.value"
                >
                  <span class="skill-card-text">{{ level.label }}</span>
                  <span class="skill-card-bg"></span>
                </button>
              </div>
            </div>

            <!-- Goals -->
            <div class="form-group">
              <div class="form-label">
                <span class="label-emoji">🎯</span>
                <label>参与目标</label>
                <span class="label-count">{{ goalTags.length }} 个</span>
              </div>
              <div class="tag-input-wrapper">
                <input
                  v-model="goalsInput"
                  type="text"
                  class="custom-tag-input"
                  placeholder="输入后按回车添加..."
                  @keyup.enter="addGoal"
                />
                <button class="add-btn" @click="addGoal">添加</button>
              </div>
              <div class="tag-cloud">
                <span
                  v-for="(goal, idx) in goalTags"
                  :key="goal"
                  class="tag-chip secondary"
                  :style="{ '--animation-order': idx + 's' }"
                >
                  {{ goal }}
                  <button class="chip-remove" @click="removeGoal(goal)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </span>
              </div>
            </div>

            <!-- Magic Match Button -->
            <button
              class="magic-button"
              :class="{ loading: isLoading, disabled: isLoading || !hasValidBackend }"
              @click="generateMatches"
            >
              <span class="magic-button-text">
                <span v-if="!isLoading">开始魔法匹配</span>
                <span v-else>AI 正在匹配中...</span>
              </span>
              <span class="magic-button-icon" v-if="!isLoading">🔮</span>
              <span class="magic-button-spinner" v-if="isLoading"></span>
              <span class="magic-button-glow"></span>
            </button>
          </div>
          <div class="form-side-right">
            <div class="visual-card">
              <div class="visual-orb" :style="{ '--fill': totalTags * 5 + '%' }">
                <div class="visual-orb-inner">
                  <span class="orb-text">{{ totalTags }}</span>
                  <span class="orb-label">已填写偏好</span>
                </div>
              </div>
              <div class="visual-stats">
                <div class="stat-row">
                  <span class="stat-label">兴趣</span>
                  <span class="stat-value">{{ interestTags.length }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">目标</span>
                  <span class="stat-value">{{ goalTags.length }}</span>
                </div>
                <div class="stat-row" v-if="skillLevel">
                  <span class="stat-label">技能</span>
                  <span class="stat-value">已设置</span>
                </div>
                <div class="stat-row" v-if="!skillLevel">
                  <span class="stat-label">技能</span>
                  <span class="stat-value">未设置</span>
                </div>
              </div>
              <div class="visual-caption">
                添加更多标签<br>让 AI 更懂你
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Match Results - 3D Card Stack -->
      <section v-if="showResults" class="results-section">
        <div class="results-hero">
          <div class="results-hero-icon">🌟</div>
          <h2 class="results-hero-title">发现你的匹配</h2>
          <p class="results-hero-sub">
            已为你分析 <strong>{{ matchResults.length }}</strong> 个最适合的社团
          </p>
          <button class="back-button" @click="showResults = false">
            ← 重新匹配
          </button>
        </div>

        <!-- No Results -->
        <div v-if="matchResults.length === 0" class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>没有找到匹配</h3>
          <p>试试添加更多兴趣标签或调整条件</p>
          <button class="reset-button" @click="showResults = false">
            重新开始
          </button>
        </div>

        <!-- Results 3D Grid -->
        <div v-else class="results-grid">
          <article
            v-for="(result, index) in matchResults"
            :key="result.club.id"
            class="result-card-3d"
            :style="{
              '--animation-delay': (index * 0.18) + 's',
              '--card-z': (matchResults.length - index) * 4 + 'px'
            }"
          >
            <div class="card-border-glow"></div>
            <div class="card-content">
              <div class="card-header">
                <div class="rank-badge">
                  <span>#{{ index + 1 }}</span>
                </div>
                <div class="score-ring">
                  <div class="score-progress" :style="{ background: getScoreBg(result.score) }">
                    <div class="score-inner">
                      <span class="score-number" :style="{ color: getScoreColor(result.score) }">
                        {{ result.score }}
                      </span>
                      <span class="score-percent">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card-body">
                <span class="category-badge">{{ result.club.category }}</span>
                <h3 class="club-name">{{ result.club.name }}</h3>
                <p class="club-description">
                  {{ truncateText(result.club.description, 100) }}
                </p>

                <div class="why-match">
                  <h4>
                    <span class="why-icon">💫</span>
                    为什么匹配你
                  </h4>
                  <ul>
                    <li v-for="(reason, i) in result.reasons.slice(0, 3)" :key="i">
                      {{ reason }}
                    </li>
                  </ul>
                </div>

                <div class="club-meta">
                  <div class="meta-item">
                    <span class="meta-icon">👥</span>
                    <span>{{ result.club.memberCount }} 成员</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-icon">📊</span>
                    <span>{{ result.score }}% 匹配度</span>
                  </div>
                </div>
              </div>

              <div class="card-actions">
                <button class="btn-outline" @click="showClubDetails(result.club)">
                  查看详情
                </button>
                <button class="btn-primary" @click="applyToClub(result.club)">
                  申请加入
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Base Layout with Grain Texture */
.matching-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 0% 0%, rgba(255, 107, 107, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 100% 100%, rgba(46, 134, 171, 0.08) 0%, transparent 50%),
    #fbfbff;
  position: relative;
  overflow-x: hidden;
  animation: pageEnter 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pageEnter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Noise Overlay */
.noise-overlay {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
}

/* Animated Magic Orb */
.magic-orb {
  position: fixed;
  width: 60vmax;
  height: 60vmax;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    hsl(calc(var(--orb-hue, 20)), 100%, 85%) 0%,
    hsl(calc(var(--orb-hue, 20) + 20), 100%, 75%) 30%,
    transparent 70%
  );
  filter: blur(80px);
  opacity: 0.4;
  animation: orbPulse 8s ease-in-out infinite;
  transform: translate(-50%, -50%) scale(var(--pulse-size, 1));
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
  will-change: transform, opacity;
  z-index: 0;
}

.magic-orb.active {
  opacity: 0.6;
}

@keyframes orbPulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(var(--pulse-size, 1));
  }
  50% {
    transform: translate(-50%, -52%) scale(calc(var(--pulse-size, 1) * 1.05));
  }
}

/* Floating Particles */
.particles {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.particle {
  position: absolute;
  left: var(--left);
  top: var(--top);
  width: var(--size);
  height: var(--size);
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  border-radius: 50%;
  opacity: 0.3;
  animation: particleFloat 12s ease-in-out infinite;
  animation-delay: var(--delay);
  will-change: transform, opacity;
}

@keyframes particleFloat {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(20px, -40px) scale(1.2);
  }
  50% {
    transform: translate(-10px, -80px) scale(0.8);
  }
  75% {
    transform: translate(-30px, -20px) scale(1.1);
  }
}

/* Hero Header with Diagonal Cut */
.hero-header {
  position: relative;
  padding: 120px 0 160px;
  overflow: hidden;
  z-index: 2;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, #FF6B6B 0%, #2E86AB 100%);
}

.hero-diagonal {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: #fbfbff;
  clip-path: polygon(0 100%, 100% 100%, 100% 0);
}

.hero-content {
  position: relative;
  z-index: 2;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(10px);
  border-radius: 999px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 24px;
  animation: badgeSlideIn 0.8s ease-out;
}

@keyframes badgeSlideIn {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.badge-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  animation: dotPulse 2s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.hero-title {
  font-family: 'Poppins', var(--font-display);
  font-size: clamp(42px, 8vw, 76px);
  font-weight: 900;
  line-height: 1.05;
  color: white;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
  animation: titleSlideIn 0.8s ease-out 0.2s both;
}

.title-gradient {
  background: linear-gradient(135deg, #FFD93D 0%, #FFF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@keyframes titleSlideIn {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-subtitle {
  font-size: clamp(16px, 3vw, 22px);
  color: rgba(255, 255, 255, 0.85);
  font-weight: 400;
  animation: subtitleSlideIn 0.8s ease-out 0.4s both;
}

@keyframes subtitleSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* API Warning Banner */
.api-warning {
  margin-top: -40px;
  position: relative;
  z-index: 3;
  margin-bottom: 48px;
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(255, 217, 61, 0.95), rgba(240, 201, 41, 0.95));
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(255, 217, 61, 0.25);
}

.warning-icon {
  font-size: 32px;
}

.warning-text h3 {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--color-dark);
  margin: 0 0 4px;
}

.warning-text p {
  margin: 0;
  color: rgba(45, 52, 54, 0.7);
  font-size: 14px;
}

.warning-text code {
  background: rgba(45, 52, 54, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
}

.content-container {
  position: relative;
  z-index: 2;
  padding-bottom: 80px;
}

/* Form Section - Split Diagonal Layout */
.form-section {
  animation: formEnter 0.8s ease-out 0.3s both;
}

@keyframes formEnter {
  from {
    opacity: 0;
    transform: translateY(60px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-wrapper {
  display: grid;
  grid-template-columns: 1.4fr 0.6fr;
  gap: 40px;
  align-items: start;
}

.form-side-left {
  background: white;
  border-radius: 32px;
  padding: 48px;
  box-shadow:
    0 24px 80px rgba(45, 52, 54, 0.1);
}

.form-intro {
  margin-bottom: 48px;
}

.form-intro h2 {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  color: var(--color-dark);
  margin: 0 0 8px;
}

.form-intro p {
  margin: 0;
  color: var(--color-gray-600);
  font-size: 16px;
}

.form-group {
  margin-bottom: 40px;
}

.form-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.form-label label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--color-dark);
}

.label-emoji {
  font-size: 24px;
}

.label-count {
  font-size: 14px;
  color: var(--color-gray-600);
  font-weight: 500;
}

/* Tag Input */
.tag-input-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.custom-tag-input {
  flex: 1;
  padding: 16px 24px;
  font-size: 16px;
  border: 3px solid var(--color-gray-200);
  border-radius: 999px;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: #fafafa;
}

.custom-tag-input:focus {
  border-color: var(--color-primary);
  background: white;
  box-shadow: 0 0 0 6px rgba(255, 107, 107, 0.15);
}

.add-btn {
  padding: 0 32px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  border: none;
  border-radius: 999px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
}

.add-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 107, 107, 0.4);
}

/* Tag Cloud */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 40px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(255, 107, 107, 0.05));
  border: 2px solid rgba(255, 107, 107, 0.3);
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-primary);
  animation: tagReveal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--animation-order) * 0.1);
}

.tag-chip.secondary {
  background: linear-gradient(135deg, rgba(46, 134, 171, 0.15), rgba(46, 134, 171, 0.05));
  border-color: rgba(46, 134, 171, 0.3);
  color: var(--color-secondary);
}

@keyframes tagReveal {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: none;
  border: none;
  cursor: pointer;
  border-radius: 50%;
  transition: all 0.2s ease;
  opacity: 0.6;
}

.chip-remove:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

/* Skill Grid */
.skill-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.skill-card {
  position: relative;
  padding: 24px;
  background: #f8f9fa;
  border: 3px solid #e9ecef;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.skill-card-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--color-secondary), var(--color-primary));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.skill-card-text {
  position: relative;
  z-index: 1;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-gray-600);
  transition: color 0.3s ease;
}

.skill-card:hover {
  border-color: var(--color-primary);
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(255, 107, 107, 0.15);
}

.skill-card.active {
  border-color: transparent;
}

.skill-card.active .skill-card-bg {
  opacity: 1;
}

.skill-card.active .skill-card-text {
  color: white;
}

/* Right Visual Side Card */
.form-side-right {
  position: sticky;
  top: 100px;
}

.visual-card {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 32px;
  padding: 48px 32px;
  color: white;
  text-align: center;
  box-shadow: 0 24px 80px rgba(26, 26, 46, 0.4);
  overflow: hidden;
  position: relative;
}

.visual-card::before {
  content: '';
  position: absolute;
  inset: -50%;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 107, 107, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 50% 100%, rgba(46, 134, 171, 0.3) 0%, transparent 50%);
  animation: visualGlow 8s ease-in-out infinite;
}

@keyframes visualGlow {
  0%, 100% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.1) rotate(5deg);
  }
}

.visual-orb {
  position: relative;
  z-index: 1;
  width: 160px;
  height: 160px;
  margin: 0 auto 32px;
  border-radius: 50%;
  background: conic-gradient(#FF6B6B var(--fill), rgba(255, 255, 255, 0.1) 0);
  padding: 8px;
  animation: orbSpin 10s linear infinite;
}

@keyframes orbSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.visual-orb-inner {
  width: 100%;
  height: 100%;
  background: #1a1a2e;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.orb-text {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 900;
  background: linear-gradient(135deg, #FF6B6B, #2E86AB);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.orb-label {
  font-size: 14px;
  opacity: 0.7;
}

.visual-stats {
  position: relative;
  z-index: 1;
  margin-bottom: 32px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 15px;
  opacity: 0.7;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
}

.visual-caption {
  position: relative;
  z-index: 1;
  font-size: 14px;
  opacity: 0.6;
  line-height: 1.6;
}

/* Magic Button */
.magic-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 24px 48px;
  background: linear-gradient(135deg, #FF6B6B 0%, #2E86AB 100%);
  border: none;
  border-radius: 999px;
  color: white;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow:
    0 8px 24px rgba(255, 107, 107, 0.35),
    0 20px 60px rgba(46, 134, 171, 0.25);
  margin-top: 24px;
}

.magic-button:not(.disabled):hover {
  transform: translateY(-6px);
  box-shadow:
    0 16px 40px rgba(255, 107, 107, 0.45),
    0 32px 80px rgba(46, 134, 171, 0.35);
}

.magic-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.magic-button.loading {
  opacity: 0.8;
  pointer-events: none;
}

.magic-button-icon {
  font-size: 28px;
  animation: iconFloat 2s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.magic-button-spinner {
  width: 28px;
  height: 28px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.magic-button-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: glowSweep 3s infinite;
}

@keyframes glowSweep {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

/* Results Section */
.results-section {
  animation: resultsReveal 0.6s ease-out both;
}

@keyframes resultsReveal {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.results-hero {
  text-align: center;
  margin-bottom: 64px;
}

.results-hero-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: heroIconBounce 1s ease-out;
}

@keyframes heroIconBounce {
  0% {
    transform: scale(0) translateY(-50px);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) translateY(10px);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.results-hero-title {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 900;
  color: var(--color-dark);
  margin: 0 0 12px;
}

.results-hero-sub {
  font-size: 18px;
  color: var(--color-gray-600);
  margin: 0 0 24px;
}

.back-button {
  padding: 12px 28px;
  background: transparent;
  border: 2px solid var(--color-gray-300);
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(255, 107, 107, 0.05);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 40px;
  background: white;
  border-radius: 32px;
  box-shadow: 0 12px 48px rgba(45, 52, 54, 0.08);
}

.empty-state-icon {
  font-size: 80px;
  margin-bottom: 24px;
}

.empty-state h3 {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--color-dark);
  margin: 0 0 12px;
}

.empty-state p {
  color: var(--color-gray-600);
  margin: 0 0 32px;
  font-size: 16px;
}

.reset-button {
  padding: 16px 40px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  border: none;
  border-radius: 999px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
  transition: all 0.3s ease;
}

.reset-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(255, 107, 107, 0.4);
}

/* Results 3D Grid */
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 32px;
}

.result-card-3d {
  position: relative;
  background: white;
  border-radius: 28px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(45, 52, 54, 0.08);
  transform: translate3d(0, 0, var(--card-z));
  opacity: 0;
  animation: cardReveal 0.6s ease-out var(--animation-delay) both;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, box-shadow;
}

.result-card-3d:hover {
  transform: translate3d(0, -12px, var(--card-z));
  box-shadow: 0 24px 80px rgba(45, 52, 54, 0.18);
}

@keyframes cardReveal {
  from {
    opacity: 0;
    transform: translate3d(0, 40px, var(--card-z)) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, var(--card-z)) scale(1);
  }
}

.card-border-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
}

.card-content {
  padding: 28px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.rank-badge {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 900;
}

.score-ring {
  width: 80px;
  height: 80px;
  padding: 6px;
  border-radius: 50%;
  background: var(--color-gray-100);
}

.score-progress {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  padding: 6px;
}

.score-inner {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-number {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
}

.score-percent {
  font-size: 14px;
  color: var(--color-gray-600);
  font-weight: 600;
}

.card-body {
  margin-bottom: 24px;
}

.category-badge {
  display: inline-block;
  padding: 6px 16px;
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(46, 134, 171, 0.1));
  color: var(--color-secondary);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 12px;
}

.club-name {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 800;
  color: var(--color-dark);
  margin: 0 0 12px;
  line-height: 1.2;
}

.club-description {
  color: var(--color-gray-600);
  line-height: 1.7;
  margin: 0 0 20px;
  font-size: 15px;
}

.why-match {
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.05), rgba(46, 134, 171, 0.05));
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
}

.why-match h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--color-dark);
}

.why-icon {
  font-size: 18px;
}

.why-match ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.why-match li {
  position: relative;
  padding-left: 20px;
  margin-bottom: 8px;
  color: var(--color-gray-600);
  font-size: 14px;
  line-height: 1.6;
}

.why-match li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--color-primary);
  font-weight: 700;
  font-size: 16px;
}

.why-match li:last-child {
  margin-bottom: 0;
}

.club-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--color-gray-100);
  border-radius: 12px;
  font-size: 14px;
  color: var(--color-dark);
  font-weight: 500;
}

.meta-icon {
  font-size: 18px;
}

.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  border-top: 1px solid var(--color-gray-200);
  padding-top: 24px;
}

.btn-outline,
.btn-primary {
  padding: 14px 20px;
  border-radius: 16px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-outline {
  background: transparent;
  border: 2px solid var(--color-gray-300);
  color: var(--color-gray-600);
}

.btn-outline:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-2px);
}

.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  border: none;
  color: white;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(255, 107, 107, 0.4);
}

/* Responsive Design */
@media (max-width: 968px) {
  .form-wrapper {
    grid-template-columns: 1fr;
  }

  .form-side-right {
    position: static;
  }

  .visual-card {
    padding: 32px;
  }

  .results-grid {
    grid-template-columns: 1fr;
  }

  .hero-header {
    padding: 80px 0 120px;
  }
}

@media (max-width: 768px) {
  .form-side-left {
    padding: 32px 24px;
  }

  .skill-grid {
    grid-template-columns: 1fr;
  }

  .club-meta {
    flex-direction: column;
  }

  .results-hero-title {
    font-size: 36px;
  }
}
</style>
