<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'

const router = useRouter()
const clubsStore = useClubsStore()

const searchInput = ref('')
const activeCategory = ref('')

const featuredClubs = clubsStore.featuredClubs
const categories = [
  { id: 'tech', name: '技术', icon: '💻', color: 'from-blue-500 to-cyan-500' },
  { id: 'sports', name: '体育', icon: '⚽', color: 'from-green-500 to-emerald-500' },
  { id: 'arts', name: '艺术', icon: '🎨', color: 'from-pink-500 to-rose-500' },
  { id: 'academic', name: '学术', icon: '📚', color: 'from-purple-500 to-indigo-500' },
  { id: 'cultural', name: '文化', icon: '🌍', color: 'from-orange-500 to-amber-500' },
]

const handleSearch = () => {
  if (searchInput.value.trim()) {
    router.push({ name: 'clubs', query: { search: searchInput.value } })
  }
}

const selectCategory = (categoryId: string) => {
  activeCategory.value = activeCategory.value === categoryId ? '' : categoryId
}
</script>

<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-pattern"></div>
      <div class="hero-content">
        <div class="hero-badge">
          <span class="pulse-dot"></span>
          <span>新学期 · 新开始</span>
        </div>

        <h1 class="hero-title">
          <span class="title-gradient">发现属于你的</span>
          <br />
          <span class="title-highlight">社团天地</span>
        </h1>

        <p class="hero-description">
          告别选择困难，让 AI 为你精准匹配最适合的社团
          <br />
          一键获取联系方式，开启精彩的校园生活 ✨
        </p>

        <div class="hero-search">
          <div class="search-wrapper">
            <input
              v-model="searchInput"
              type="text"
              class="search-input"
              placeholder="搜索社团名称、标签或关键词..."
              @keyup.enter="handleSearch"
            />
            <button class="search-button" @click="handleSearch">
              <span>🔍</span>
            </button>
          </div>
        </div>

        <div class="hero-actions">
          <button class="action-button primary" @click="router.push('/matching')">
            <span class="button-icon">✨</span>
            <span>智能匹配</span>
          </button>
          <button class="action-button secondary" @click="router.push('/chat')">
            <span class="button-icon">💬</span>
            <span>AI 问答</span>
          </button>
          <button class="action-button outline" @click="router.push('/clubs')">
            <span>浏览全部</span>
          </button>
        </div>

        <!-- Stats -->
        <div class="hero-stats">
          <div class="stat-item">
            <span class="stat-number">10+</span>
            <span class="stat-label">精品社团</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">1000+</span>
            <span class="stat-label">活跃成员</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">5</span>
            <span class="stat-label">社团分类</span>
          </div>
        </div>
      </div>

      <!-- Floating Elements -->
      <div class="floating-elements">
        <div class="float-item" style="--delay: 0s; --x: 10%; --y: 20%">🎯</div>
        <div class="float-item" style="--delay: -2s; --x: 85%; --y: 30%">🎨</div>
        <div class="float-item" style="--delay: -4s; --x: 15%; --y: 70%">⚽</div>
        <div class="float-item" style="--delay: -6s; --x: 80%; --y: 75%">📚</div>
      </div>
    </section>

    <!-- Categories Section -->
    <section class="categories-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">📂</span>
          探索分类
        </h2>
        <p class="section-subtitle">找到你感兴趣的领域</p>
      </div>

      <div class="categories-grid">
        <div
          v-for="category in categories"
          :key="category.id"
          class="category-card"
          :class="{ active: activeCategory === category.id }"
          @click="selectCategory(category.id)"
        >
          <div class="category-icon-wrapper">
            <span class="category-icon">{{ category.icon }}</span>
          </div>
          <h3 class="category-name">{{ category.name }}</h3>
          <div class="category-arrow">
            <span>→</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Clubs Section -->
    <section class="featured-section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="title-icon">🔥</span>
          热门社团
        </h2>
        <p class="section-subtitle">最受同学们欢迎的社团</p>
      </div>

      <div class="clubs-grid">
        <div v-for="(club, index) in featuredClubs" :key="club.id" class="club-card" :style="{ '--delay': index * 0.1 + 's' }">
          <div class="club-image">
            <div class="club-emoji">{{ getCategoryEmoji(club.category) }}</div>
            <div class="club-badge">{{ club.category }}</div>
          </div>

          <div class="club-content">
            <h3 class="club-name">{{ club.name }}</h3>
            <p class="club-description">{{ club.description.substring(0, 90) }}...</p>

            <div class="club-footer">
              <div class="club-members">
                <span>👥</span>
                <span>{{ club.memberCount }} 成员</span>
              </div>
              <button class="club-cta" @click="router.push('/clubs')">
                查看详情 →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="section-cta">
        <button class="cta-button" @click="router.push('/clubs')">
          <span>探索更多社团</span>
          <span class="cta-arrow">→</span>
        </button>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <span class="feature-icon">✨</span>
          </div>
          <h3 class="feature-title">AI 智能匹配</h3>
          <p class="feature-description">
            告诉我们你的兴趣和目标，AI 精准分析并为你推荐最适合的社团
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
            <span class="feature-icon">💬</span>
          </div>
          <h3 class="feature-title">智能问答助手</h3>
          <p class="feature-description">
            有任何疑问？AI 助手随时在线，为你解答所有社团相关问题
          </p>
        </div>

        <div class="feature-card">
          <div class="feature-icon-wrapper" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
            <span class="feature-icon">🎯</span>
          </div>
          <h3 class="feature-title">一键加入社团</h3>
          <p class="feature-description">
            找到心仪社团后，立即获取联系方式，快速开始你的社团之旅
          </p>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content">
        <div class="cta-emoji">🚀</div>
        <h2 class="cta-title">准备好开始了吗？</h2>
        <p class="cta-description">
          还在犹豫？让 AI 帮你找到答案，开启精彩的校园社团生活
        </p>
        <button class="cta-primary-button" @click="router.push('/matching')">
          <span>开始智能匹配</span>
          <span class="cta-arrow">→</span>
        </button>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
const getCategoryEmoji = (category: string) => {
  const emojiMap: Record<string, string> = {
    '技术': '💻',
    '体育': '⚽',
    '艺术': '🎨',
    '学术': '📚',
    '文化': '🌍',
  }
  return emojiMap[category] || '🎯'
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 40px 20px;
}

.hero-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(255, 107, 107, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(46, 134, 171, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(255, 217, 61, 0.1) 0%, transparent 50%);
  animation: patternMove 20s ease-in-out infinite;
}

@keyframes patternMove {
  0%, 100% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(1.1) rotate(5deg);
  }
}

.hero-content {
  position: relative;
  max-width: 900px;
  text-align: center;
  z-index: 1;
}

/* Hero Badge */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: rgba(255, 107, 107, 0.1);
  border: 2px solid rgba(255, 107, 107, 0.3);
  border-radius: 9999px;
  color: #FF6B6B;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 32px;
  animation: slideDown 0.6s ease-out;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #FF6B6B;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.5;
  }
}

/* Hero Title */
.hero-title {
  font-family: var(--font-display);
  font-size: clamp(40px, 8vw, 72px);
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 24px;
  animation: slideUp 0.6s ease-out 0.1s both;
}

.title-gradient {
  background: linear-gradient(135deg, #2E86AB 0%, #2E86AB 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-highlight {
  display: inline-block;
  background: linear-gradient(135deg, #FF6B6B 0%, #EE5A5A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.1);
  }
}

/* Hero Description */
.hero-description {
  font-size: 18px;
  color: var(--color-gray-600);
  line-height: 1.8;
  margin-bottom: 40px;
  animation: slideUp 0.6s ease-out 0.2s both;
}

/* Hero Search */
.hero-search {
  margin-bottom: 40px;
  animation: slideUp 0.6s ease-out 0.3s both;
}

.search-wrapper {
  display: flex;
  gap: 12px;
  max-width: 600px;
  margin: 0 auto;
}

.search-input {
  flex: 1;
  padding: 16px 24px;
  font-size: 16px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-full);
  outline: none;
  transition: all 0.3s ease;
  background: white;
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.1);
}

.search-input::placeholder {
  color: var(--color-gray-600);
}

.search-button {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.search-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.search-button:active {
  transform: scale(0.95);
}

/* Hero Actions */
.hero-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  animation: slideUp 0.6s ease-out 0.4s both;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 32px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.action-button.primary {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(46, 134, 171, 0.3);
}

.action-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(46, 134, 171, 0.4);
}

.action-button.secondary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
}

.action-button.secondary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(255, 107, 107, 0.4);
}

.action-button.outline {
  background: white;
  color: var(--color-dark);
  border: 2px solid var(--color-gray-300);
}

.action-button.outline:hover {
  border-color: var(--color-secondary);
  color: var(--color-secondary);
  background: rgba(46, 134, 171, 0.05);
}

.button-icon {
  font-size: 20px;
}

/* Hero Stats */
.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  margin-top: 48px;
  animation: slideUp 0.6s ease-out 0.5s both;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-number {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 14px;
  color: var(--color-gray-600);
  font-weight: 500;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--color-gray-200);
}

/* Floating Elements */
.floating-elements {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.float-item {
  position: absolute;
  font-size: 48px;
  left: var(--x);
  top: var(--y);
  animation: float 6s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Section Styles */
.categories-section,
.featured-section,
.features-section,
.cta-section {
  padding: 80px 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-title {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 800;
  color: var(--color-dark);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.title-icon {
  font-size: 36px;
}

.section-subtitle {
  font-size: 18px;
  color: var(--color-gray-600);
}

/* Categories Grid */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.category-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid var(--color-gray-100);
  position: relative;
  overflow: hidden;
}

.category-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.category-card:hover {
  transform: translateY(-8px);
  border-color: var(--color-primary);
  box-shadow: 0 12px 32px rgba(255, 107, 107, 0.15);
}

.category-card.active {
  border-color: var(--color-primary);
  background: rgba(255, 107, 107, 0.05);
}

.category-icon-wrapper {
  width: 80px;
  height: 80px;
  background: var(--color-gray-100);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  transition: all 0.3s ease;
}

.category-card:hover .category-icon-wrapper {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%);
  transform: scale(1.1) rotate(5deg);
}

.category-icon {
  font-size: 40px;
}

.category-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 0;
}

.category-arrow {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  font-size: 24px;
  color: var(--color-primary);
  opacity: 0;
  transition: all 0.3s ease;
}

.category-card:hover .category-arrow {
  opacity: 1;
  right: 20px;
}

/* Clubs Grid */
.clubs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
  margin-bottom: 48px;
}

.club-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.4s ease;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  opacity: 0;
  animation: slideUp 0.6s ease-out both;
  animation-delay: var(--delay);
}

.club-card:hover {
  transform: translateY(-12px);
  box-shadow: var(--shadow-lg);
}

.club-image {
  height: 160px;
  background: linear-gradient(135deg, var(--color-gray-100) 0%, var(--color-gray-200) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.club-emoji {
  font-size: 64px;
  animation: float 4s ease-in-out infinite;
}

.club-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 14px;
  color: var(--color-secondary);
  backdrop-filter: blur(10px);
}

.club-content {
  padding: 24px;
}

.club-name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 12px;
}

.club-description {
  color: var(--color-gray-600);
  line-height: 1.6;
  margin-bottom: 20px;
  min-height: 64px;
}

.club-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--color-gray-100);
}

.club-members {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-gray-600);
  font-size: 14px;
  font-weight: 500;
}

.club-cta {
  padding: 10px 20px;
  background: transparent;
  color: var(--color-primary);
  border: none;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: var(--radius-md);
}

.club-cta:hover {
  background: rgba(255, 107, 107, 0.1);
}

/* Section CTA */
.section-cta {
  text-align: center;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 40px;
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-dark) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(46, 134, 171, 0.3);
}

.cta-button:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(46, 134, 171, 0.4);
}

.cta-arrow {
  transition: transform 0.3s ease;
}

.cta-button:hover .cta-arrow {
  transform: translateX(4px);
}

/* Features Section */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.feature-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 40px 32px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  border: 2px solid var(--color-gray-100);
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-md);
  border-color: rgba(255, 107, 107, 0.3);
}

.feature-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
}

.feature-icon {
  font-size: 40px;
}

.feature-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 12px;
}

.feature-description {
  color: var(--color-gray-600);
  line-height: 1.7;
}

/* CTA Section */
.cta-section {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border-radius: var(--radius-lg);
  margin: 80px 20px;
  position: relative;
  overflow: hidden;
}

.cta-section::before {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  top: -200px;
  right: -100px;
  animation: float 8s ease-in-out infinite;
}

.cta-content {
  position: relative;
  text-align: center;
  padding: 60px 40px;
  z-index: 1;
}

.cta-emoji {
  font-size: 64px;
  margin-bottom: 24px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.cta-title {
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 800;
  color: white;
  margin-bottom: 16px;
}

.cta-description {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 40px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.cta-primary-button {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 48px;
  background: white;
  color: var(--color-primary);
  border: none;
  border-radius: var(--radius-full);
  font-weight: 700;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.cta-primary-button:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .hero-actions {
    flex-direction: column;
    width: 100%;
  }

  .action-button {
    width: 100%;
    justify-content: center;
  }

  .hero-stats {
    flex-direction: column;
    gap: 24px;
  }

  .stat-divider {
    width: 40px;
    height: 1px;
  }

  .hero-search {
    margin-bottom: 32px;
  }

  .categories-section,
  .featured-section,
  .features-section {
    padding: 60px 20px;
  }

  .categories-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .clubs-grid {
    grid-template-columns: 1fr;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .cta-section {
    margin: 60px 20px;
  }

  .cta-title {
    font-size: 28px;
  }
}
</style>
