<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'

const route = useRoute()
const router = useRouter()
const clubsStore = useClubsStore()

const selectedClub = ref<any>(null)
const showDetails = ref(false)
const hoveredClub = ref<string | null>(null)

onMounted(() => {
  if (route.query.search) {
    clubsStore.setSearchQuery(route.query.search as string)
  }
  if (route.query.category) {
    clubsStore.setSelectedCategory(route.query.category as string)
  }
})

const filteredClubs = computed(() => clubsStore.filteredClubs)
const categories = computed(() => clubsStore.categories)
const allTags = computed(() => clubsStore.all.allTags)

const handleSearch = (value: string) => {
  clubsStore.setSearchQuery(value)
}

const handleCategoryChange = (value: string) => {
  clubsStore.setSelectedCategory(value)
}

const handleTagChange = (tags: string[]) => {
  clubsStore.setSelectedTags(tags)
}

const toggleTag = (tag: string) => {
  clubsStore.toggleTag(tag)
}

const clearFilters = () => {
  clubsStore.clearFilters()
}

const showClubDetails = (club: any) => {
  selectedClub.value = club
  showDetails.value = true
}

const applyToClub = (club: any) => {
  showClubDetails(club)
}

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

const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    '技术': 'from-blue-500 to-cyan-500',
    '体育': 'from-green-500 to-emerald-500',
    '艺术': 'from-pink-500 to-rose-500',
    '学术': 'from-purple-500 to-indigo-500',
    '文化': 'from-orange-500 to-amber-500',
  }
  return colorMap[category] || 'from-gray-400 to-gray-500'
}
</script>

<template>
  <div class="clubs-page">
    <!-- Header -->
    <section class="page-header">
      <div class="header-pattern"></div>
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">📚</span>
          <span class="title-text">探索社团</span>
        </h1>
        <p class="page-subtitle">
          浏览全校社团，发现属于你的组织
        </p>
      </div>
    </section>

    <!-- Filters -->
    <section class="filters-section">
      <div class="filter-card">
        <div class="filter-row">
          <div class="filter-item filter-search">
            <label>搜索</label>
            <div class="search-wrapper">
              <input
                v-model="clubsStore.searchQuery"
                type="text"
                class="search-input"
                placeholder="搜索社团名称、标签或关键词..."
                @input="handleSearch"
              />
              <button class="search-clear" v-if="clubsStore.searchQuery" @click="handleSearch('')">
                ✕
              </button>
            </div>
          </div>
          <div class="filter-item">
            <label>分类</label>
            <div class="category-chips">
              <button
                :class="['category-chip', { active: clubsStore.selectedCategory === 'all' }]"
                @click="handleCategoryChange('all')"
              >
                全部
              </button>
              <button
                v-for="cat in categories"
                :key="cat.id"
                :class="['category-chip', { active: clubsStore.selectedCategory === cat.name }]"
                @click="handleCategoryChange(cat.name)"
              >
                <span class="chip-icon">{{ cat.icon }}</span>
                <span class="chip-label">{{ cat.name }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="tags-filter" v-if="allTags.length > 0">
          <label>标签筛选</label>
          <div class="tags-container">
            <button
              v-for="tag in allTags.slice(0, 12)"
              :key="tag"
              :class="['tag-chip', { active: clubsStore.selectedTags.includes(tag) }]"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
            <button
              v-if="allTags.length > 12"
              class="tag-chip more"
              @click="router.push({ name: 'clubs', query: { showAllTags: 'true' } })"
            >
              +{{ allTags.length - 12 }}
            </button>
          </div>
        </div>

        <div class="filter-actions">
          <button
            v-if="clubsStore.searchQuery || clubsStore.selectedCategory !== 'all' || clubsStore.selectedTags.length > 0"
            class="clear-button"
            @click="clearFilters"
          >
            <span>✕</span>
            清除筛选
          </button>
        </div>
      </div>
    </section>

    <!-- Results Info -->
    <section class="results-info-section">
      <div class="results-info">
        <span class="info-label">找到</span>
        <span class="info-number">{{ filteredClubs.length }}</span>
        <span class="info-label">个社团</span>
      </div>
    </section>

    <!-- Clubs Grid -->
    <section class="clubs-section">
      <div class="clubs-grid">
        <div
          v-for="(club, index) in filteredClubs"
          :key="club.id"
          class="club-card"
          :class="{ hovered: hoveredClub === club.id }"
          @mouseenter="hoveredClub = club.id"
          @mouseleave="hoveredClub = null"
          @click="showClubDetails(club)"
        >
          <div class="club-header">
            <div class="club-badge" :class="getCategoryColor(club.category)">
              <span class="badge-icon">{{ getCategoryEmoji(club.category) }}</span>
              <span class="badge-text">{{ club.category }}</span>
            </div>
            <div class="club-members">
              <span>👥</span>
              <span>{{ club.memberCount }} 成员</span>
            </div>
          </div>

          <div class="club-body">
            <h3 class="club-name">{{ club.name }}</h3>
            <p class="club-description">{{ club.description.substring(0, 100) }}...</p>

            <div class="club-tags">
              <span
                v-for="(tag, idx) in club.tags.slice(0, 5)"
                :key="idx"
                class="tag-item"
              >
                {{ tag }}
              </span>
              <span
                v-if="club.tags.length > 5"
                class="tag-item more"
              >
                +{{ club.tags.length - 5 }}
              </span>
            </div>

            <div class="club-actions">
              <button class="action-button secondary" @click.stop="router.push('/clubs')">
                <span>查看详情</span>
                <span class="arrow">→</span>
              </button>
              <button class="action-button primary" @click.stop="applyToClub(club)">
                <span>加入社团</span>
              </button>
            </div>
          </div>

          <div class="club-card-shine"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredClubs.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p class="empty-title">没有找到符合条件的社团</p>
        <p class="empty-hint">试试调整筛选条件或清空所有筛选</p>
        <button class="empty-action" @click="clearFilters">
          清除筛选
        </button>
      </div>
    </section>

    <!-- Club Detail Modal -->
    <div v-if="showDetails && selectedClub" class="modal-overlay" @click="showDetails = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <div class="modal-close" @click="showDetails = false">✕</div>
          <div class="modal-badge" :class="getCategoryColor(selectedClub.category)">
            <span class="badge-icon">{{ getCategoryEmoji(selectedClub.category) }}</span>
            <span class="badge-text">{{ selectedClub.category }}</span>
          </div>
        </div>

        <div class="modal-body">
          <h2 class="modal-title">{{ selectedClub.name }}</h2>

          <div class="modal-info-grid">
            <div class="modal-info-item">
              <span class="info-icon">👥</span>
              <span class="info-text">{{ selectedClub.memberCount }} 成员</span>
            </div>
          </div>

          <div class="modal-section">
            <h3 class="section-title">社团介绍</h3>
            <p class="section-description">{{ selectedClub.description }}</p>
          </div>

          <div class="modal-section">
            <h3 class="section-title">入社要求</h3>
            <p class="section-description">{{ selectedClub.requirements }}</p>
          </div>

          <div class="modal-section">
            <h3 class="section-title">标签</h3>
            <div class="modal-tags">
              <span
                v-for="(tag, index) in selectedClub.tags"
                :key="index"
                class="modal-tag"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <div class="modal-section contact-section">
            <h3 class="section-title">联系方式</h3>
            <div class="contact-box">
              <span class="contact-icon">📞</span>
              <span class="contact-text">{{ selectedClub.contact }}</span>
            </div>
            <button class="contact-action" @click.stop="showDetails = false">
              <span>已记录联系方式</span>
              <span class="arrow">→</span>
            </button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-button secondary" @click="showDetails = false">
            关闭
          </button>
          <button class="modal-button primary" @click="showDetails = false">
            <span>返回列表</span>
            <span class="arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clubs-page {
  min-height: 100vh;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Page Header */
.page-header {
  position: relative;
  padding: 60px 20px 40px;
  overflow: hidden;
}

.header-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(46, 134, 171, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(255, 217, 61, 0.08) 0%, transparent 50%);
  animation: patternMove 30s ease-in-out infinite;
}

@keyframes patternMove {
  0%, 100% {
    transform: scale(1) translate(0);
  }
  50% {
    transform: scale(1.05) translate(10px);
  }
}

.header-content {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
  z-index: 1;
}

.page-title {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 12px;
}

.title-icon {
  font-size: 56px;
  animation: float 3s ease-in-out infinite;
}

.title-text {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 18px;
  color: var(--color-gray-600);
}

/* Filters Section */
.filters-section {
  padding: 040px 20px 60px;
  max-width: 1400px;
  margin: 0 auto;
}

.filter-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-lg);
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-row {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
}

.filter-item {
  flex: 1;
}

.filter-item label {
  display: block;
  font-weight: 600;
  color: var(--color-dark);
  margin-bottom: 12px;
  font-size: 14px;
}

.search-wrapper {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 16px 56px;
  font-size: 16px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-full);
  background: white;
  outline: none;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.1);
}

.search-clear {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  background: var(--color-gray-200);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--color-gray-600);
}

.search-clear:hover {
  background: var(--color-gray-300);
}

/* Category Chips */
.category-chips {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.category-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--color-gray-100);
  border: 2px solid transparent;
  border-radius: 9999px;
  font-weight: 500;
  font-size: 14px;
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-chip:hover {
  background: var(--color-gray-200);
}

.category-chip.active {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  border-color: var(--color-primary);
}

.chip-icon {
  font-size: 16px;
}

.chip-label {
  font-weight: 600;
}

/* Tags Filter */
.tags-filter {
  margin-bottom: 24px;
}

.tags-filter label {
  display: block;
  font-weight: 600;
  color: var(--color-dark);
  margin-bottom: 12px;
  font-size: 14px;
}

.tags-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tag-chip {
  padding: 8px 16px;
  background: var(--color-gray-100);
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.tag-chip:hover {
  background: var(--color-gray-200);
  transform: translateY(-2px);
}

.tag-chip.active {
  background: rgba(255, 107, 107, 0.1);
  color: var(--color-secondary);
  border-color: var(--color-secondary);
}

.tag-chip.more {
  color: var(--color-secondary);
  font-weight: 600;
}

/* Filter Actions */
.filter-actions {
  display: flex;
  justify-content: center;
}

.clear-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  color: var(--color-dark);
  border: 2px solid var(--color-gray-300);
  border-radius: 9999px;
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-button:hover {
  background: var(--color-gray-100);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* Results Info Section */
.results-info-section {
  padding: 0 20px 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.results-info {
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  padding: 16px 32px;
  border-radius: 9999px;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.2);
}

.info-label {
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.info-number {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  color: white;
}

/* Clubs Grid Section */
.clubs-section {
  padding: 0 20px 60px;
  max-width: 1400px;
  margin: 0 auto;
}

.clubs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 32px;
}

/* Club Card */
.club-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px;
  cursor: pointer;
  transition: all 0.4s ease;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.club-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.club-card:hover {
  transform: translateY(-12px);
  box-shadow: var(--shadow-lg);
}

.club-card:hover::before {
  opacity: 1;
}

.club-card.hovered {
  transform: translateY(-8px);
}

.club-card-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 50% 50%, rgba(255, 107, 107, 0.15) 0%, transparent 70%);
  border-radius: 50%;
  pointer-events: none;
  transition: transform 0.4s ease;
}

.club-card:hover .club-card-shine {
  transform: scale(1.1);
}

/* Club Header */
.club-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.club-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 13px;
  box-shadow: var(--shadow-sm);
}

.badge-icon {
  font-size: 16px;
}

.badge-text {
  font-weight: 700;
}

.club-members {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-gray-600);
  font-size: 14px;
  font-weight: 500;
}

/* Club Body */
.club-body {
  margin-bottom: 20px;
}

.club-name {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 12px;
  line-height: 1.3;
}

.club-description {
  color: var(--color-gray-600);
  line-height: 1.7;
  margin-bottom: 16px;
  min-height: 60px;
}

/* Club Tags */
.club-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.tag-item {
  padding: 6px 12px;
  background: var(--color-gray-100);
  border-radius: 9999px;
  font-size: 12px;
  color: var(--color-gray-600);
  font-weight: 500;
}

.tag-item.more {
  background: var(--color-gray-200);
  color: var(--color-gray-600);
}

/* Club Actions */
.club-actions {
  display: flex;
  gap: 12px;
}

.action-button {
  flex: 1;
  padding: 12px 24px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-button:hover {
  transform: translateY(-2px);
}

.action-button.primary {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.action-button.primary:hover {
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.action-button.secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}

.action-button.secondary:hover {
  background: rgba(255, 107, 107, 0.1);
}

.arrow {
  font-size: 16px;
  transition: transform 0.3s ease;
}

.action-button:hover .arrow {
  transform: translateX(4px);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
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

.empty-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 12px;
}

.empty-hint {
  color: var(--color-gray-600);
  margin-bottom: 32px;
}

.empty-action {
  padding: 16px 40px;
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  border: none;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.empty-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.3);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: var(--radius-lg);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px;
  border-bottom: 1px solid var(--color-gray-100);
  margin-bottom: 24px;
}

.modal-close {
  width: 40px;
  height: 40px;
  background: var(--color-gray-100);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--color-gray-600);
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: var(--color-gray-200);
  color: var(--color-dark);
}

.modal-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 13px;
}

/* Modal Body */
.modal-body {
  padding: 0 24px 32px;
}

.modal-title {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  color: var(--color-dark);
  margin-bottom: 24px;
  line-height: 1.3;
}

.modal-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.modal-info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
}

.info-icon {
  font-size: 32px;
}

.info-text {
  font-weight: 600;
  color: var(--color-dark);
  font-size: 18px;
}

/* Modal Sections */
.modal-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--color-dark);
  margin-bottom: 16px;
}

.section-description {
  color: var(--color-gray-600);
  line-height: 1.8;
  padding: 20px;
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
}

/* Modal Tags */
.modal-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.modal-tag {
  padding: 10px 16px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  border-radius: 9999px;
  font-weight: 500;
}

/* Contact Section */
.contact-section {
  background: linear-gradient(135deg, rgba(255, 217, 61, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%);
  margin-top: 24px;
  padding: 24px;
  border-radius: var(--radius-md);
}

.contact-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.contact-icon {
  font-size: 32px;
}

.contact-text {
  font-weight: 600;
  color: white;
  font-size: 18px;
  word-break: break-word;
}

.contact-action {
  padding: 12px 32px;
  background: white;
  color: var(--color-secondary);
  border: none;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.contact-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--color-gray-100);
}

.modal-button {
  flex: 1;
  padding: 16px 32px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.modal-button:hover {
  transform: translateY(-2px);
}

.modal-button.secondary {
  background: transparent;
  color: var(--color-gray-600);
  border: 2px solid var(--color-gray-300);
}

.modal-button.secondary:hover {
  background: var(--color-gray-100);
}

.modal-button.primary {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.3);
}

.modal-button.primary:hover {
  box-shadow: 0 6px 24px rgba(255, 107, 107, 0.4);
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 32px;
  }

  .filter-row {
    flex-direction: column;
  }

  .clubs-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .modal-info-grid {
    grid-template-columns: 1fr;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}
</style>
