<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useClubsStore } from '@/stores/clubs'
import type { Club } from '@/types'

const route = useRoute()
const clubsStore = useClubsStore()

const selectedClub = ref<Club | null>(null)
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

const handleSearch = (value: string) => {
  clubsStore.setSearchQuery(value)
}

const handleCategoryChange = (value: string) => {
  clubsStore.setSelectedCategory(value)
}

const toggleTag = (tag: string) => {
  clubsStore.toggleTag(tag)
}

const clearFilters = () => {
  clubsStore.clearFilters()
}

const showClubDetails = (club: Club) => {
  selectedClub.value = club
  showDetails.value = true
}

const applyToClub = (club: Club) => {
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
    '技术': 'category-tech',
    '体育': 'category-sports',
    '艺术': 'category-arts',
    '学术': 'category-academic',
    '文化': 'category-cultural',
  }
  return colorMap[category] || 'category-default'
}
</script>

<template>
  <div class="clubs-page">
    <!-- Floating Elements -->
    <div class="floating-elements">
      <div class="float" style="--delay: 0s; --x:; 10%; --y: 15%; --size: 80px">🔍</div>
      <div class="float" style="--delay: -5s; --x: 85%; --y: 30%; --size: 60px">🎯</div>
    </div>

    <!-- Header -->
    <section class="page-header">
      <div class="header-pattern"></div>
      <div class="header-content">
        <div class="header-icon">
          <span class="icon-emoji">🎯</span>
        </div>
        <div class="header-text">
          <h1 class="page-title">社团列表</h1>
          <p class="page-subtitle">浏览所有社团，找到最适合你的兴趣社群</p>
        </div>
      </div>
    </section>

    <div class="content-wrapper">
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
                  @input="(e: Event) => handleSearch((e.target as HTMLInputElement).value)"
                />
                <button class="search-clear" v-if="clubsStore.searchQuery" @click="handleSearch('')">
                  ✕
                </button>
              </div>
            </div>
          </div>
          <div class="filter-row">
            <div class="filter-item">
              <label>分类</label>
              <div class="category-chips">
                <button
                  :class="['category-chip', { active: clubsStore.selectedCategory === 'all' || !clubsStore.selectedCategory }]"
                  @click="handleCategoryChange('')"
                >
                  全部
                </button>
                <button
                  v-for="cat in clubsStore.categories"
                  :key="cat.name"
                  :class="['category-chip', { active: clubsStore.selectedCategory === cat.name }]"
                  @click="handleCategoryChange(cat.name)"
                >
                  <span class="chip-icon">{{ cat.icon }}</span>
                  <span>{{ cat.name }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="filter-row" v-if="clubsStore.allTags.length > 0">
            <div class="filter-item">
              <label>标签</label>
              <div class="tag-chips">
                <button
                  v-for="tag in clubsStore.allTags"
                  :key="tag"
                  :class="['tag-chip', { active: clubsStore.selectedTags.includes(tag) }]"
                  @click="toggleTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
          </div>
          <div class="filter-actions">
            <button
              v-if="
                clubsStore.searchQuery ||
                clubsStore.selectedCategory ||
                clubsStore.selectedTags.length > 0
              "
              class="clear-button"
              @click="clearFilters"
            >
              <span>🔄</span>
              <span>清除筛选</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Clubs Grid -->
      <section class="clubs-section">
        <div v-if="filteredClubs.length === 0" class="empty-state">
          <div class="empty-icon">🔍</div>
          <p class="empty-text">没有找到符合条件的社团</p>
          <p class="empty-hint">尝试调整筛选条件？</p>
        </div>

        <div class="clubs-grid">
          <div
            v-for="(club, index) in filteredClubs"
            :key="club.id"
            class="club-card"
            :class="{ hovered: hoveredClub === club.id }"
            @mouseenter="hoveredClub = club.id"
            @mouseleave="hoveredClub = null"
            @click="showClubDetails(club)"
            :style="{ '--delay': (index * 0.1) + 's' }"
          >
            <div class="club-header">
              <div class="club-badge" :class="getCategoryColor(club.category)">
                <span class="badge-icon">{{ getCategoryEmoji(club.category) }}</span>
                <span class="badge-text">{{ club.category }}</span>
              </div>
              <div class="club-favorite">
                <span>⭐</span>
              </div>
            </div>

            <div class="club-body">
              <h3 class="club-name">{{ club.name }}</h3>
              <p class="club-desc">
                {{ club.description.substring(0, 80) }}{{ club.description.length > 80 ? '...' : '' }}
              </p>

              <div class="club-tags">
                <span
                    v-for="(tag, idx) in club.tags.slice(0, 3)"
                    :key="idx"
                    class="club-tag"
                  >
                  {{ tag }}
                </span>
                <span v-if="club.tags.length > 3" class="club-tag-more">
                  +{{ club.tags.length - 3 }}
                </span>
              </div>

              <div class="club-footer">
                <div class="club-stats">
                  <span class="stat-item">
                    <span class="stat-icon">👥</span>
                    {{ club.memberCount }} 成员
                  </span>
                </div>
                <div class="club-action">
                  <button class="view-btn">
                    <span>查看详情</span>
                    <span class="action-arrow">→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Club Details Modal -->
    <div v-if="showDetails && selectedClub" class="modal-overlay" @click="showDetails = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <div class="modal-club-badge" :class="getCategoryColor(selectedClub.category)">
            <span class="badge-icon">{{ getCategoryEmoji(selectedClub.category) }}</span>
            <span class="badge-text">{{ selectedClub.category }}</span>
          </div>
          <div class="modal-close" @click="showDetails = false">✕</div>
        </div>

        <div class="modal-body">
          <h2 class="modal-club-title">{{ selectedClub.name }}</h2>

          <div class="modal-tags">
            <span v-for="tag in selectedClub.tags" :key="tag" class="modal-tag">
              {{ tag }}
            </span>
          </div>

          <p class="modal-description">{{ selectedClub.description }}</p>

          <div class="modal-info-card">
            <div class="info-item">
              <span class="info-icon">👥</span>
              <div class="info-content">
                <span class="info-label">成员数量</span>
                <span class="info-value">{{ selectedClub.memberCount }} 人</span>
              </div>
            </div>
            <div class="info-item">
              <span class="info-icon">📋</span>
              <div class="info-content">
                <span class="info-label">入社要求</span>
                <span class="info-value">{{ selectedClub.requirements }}</span>
              </div>
            </div>
            <div class="info-item">
              <span class="info-icon">📞</span>
            <div class="info-content">
                <span class="info-label">联系方式</span>
                <span class="info-value">{{ selectedClub.contact }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn modal-btn-secondary" @click="showDetails = false">
            关闭
          </button>
          <button class="modal-btn modal-btn-primary" @click="applyToClub(selectedClub)">
            <span>申请加入</span>
            <span class="btn-icon">→</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clubs-page {
  min-height: 100vh;
  animation: fadeIn 0.6s ease-out;
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

/* Floating Elements */
.floating-elements {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.float {
  position: absolute;
  font-size: var(--size);
  opacity: 0.08;
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

.header.header-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 0%, rgba(46, 134, 171, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 100%, rgba(255, 107, 107, 0.15) 0%, transparent 50%);
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
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  box-shadow: 0 8px 24px rgba(46, 134, 171, 0.25);
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
  animation: pulse pulse 2s ease-in-out infinite;
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

/* Content Wrapper */
.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* Filters Section */
.filters-section {
  margin-bottom: 40px;
}

.filter-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: var(--shadow-md);
}

.filter-row {
  margin-bottom: 24px;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-item {
  flex: 1;
}

.filter-item > label {
  display: block;
  font-weight: 600;
  color: var(--color-dark);
  margin-bottom: 12px;
  font-size: 15px;
}

.filter-search {
  flex: 2;
}

.filter-search .search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  flex: 1;
  padding: 14px 40px 14px 16px;
  font-size: 15px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-full);
  outline: none;
  transition: all 0.3s ease;
  background: var(--color-gray-50);
}

.search-input:focus {
  border-color: var(--color-secondary);
  background: white;
  box-shadow: 0 0 0 4px rgba(46, 134, 171, 0.2);
}

.search-clear {
  width: 40px;
  height: 40px;
  background: var(--color-gray-200);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  color: var(--color-gray-600);
  font-size: 16px;
  transition: all 0.3s ease;
  margin-left: 8px;
}

.search-clear:hover {
  background: var(--color-gray-300);
  color: var(--color-dark);
}

/* Category Chips */
.category-chips {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--color-gray-100);
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-chip:hover {
  background: var(--color-gray-200);
  transform: translateY(-2px);
}

.category-chip.active {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  border-color: var(--color-secondary);
  box-shadow: 0 4px 12px rgba(46, 134, 171, 0.2);
}

.chip-icon {
  font-size: 18px;
}

/* Tag Chips */
.tag-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag-chip {
  padding: 8px 16px;
  background: var(--color-gray-100);
  border: 1px solid var(--color-gray-200);
  border-radius: 9999px;
  font-size: 13px;
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.3s ease;
}

.tag-chip:hover {
  background: var(--color-gray-200);
  transform: translateY(-2px);
}

.tag-chip.active {
  background: rgba(255, 107, 107, 0.15);
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* Filter Actions */
.filter.filter-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid var(--color-gray-100);
}

.clear-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: transparent;
  color: var(--color-gray-600);
  border: 1px solid var(--color-gray-300);
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-button:hover {
  background: var(--color-gray-100);
  color: var(--color-dark);
  border-color: var(--color-dark);
}

/* Clubs Section */
.clubs-section {
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 80px 40px;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  animation: bounce bounce 2s ease-in-out infinite;
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
}

.clubs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* Club Card */
.club-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: all 0.4s ease;
  opacity: 0;
  animation: slideUp slideUp 0.6s ease-out both;
  animation-delay: var(--delay);
  cursor: pointer;
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

.club-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
}

.club-card.hovered {
  border: 2px solid var(--color-primary);
}

/* Club Header */
.club-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(46, 134, 171, 0.05) 0%, rgba(255, 107, 107, 0.05) 100%);
}

.club-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
}

.category-tech {
  background: rgba(46, 134, 171, 0.15);
  color: var(--color-secondary);
}

.category-sports {
  background: rgba(46, 134, 171, 0.15);
  color: var(--color-secondary);
}

.category-arts {
  background: rgba(255, 107, 107, 0.15);
  color: var(--color-primary);
}

.category-academic {
  background: rgba(46, 134, 171, 0.15);
  color: var(--color-secondary);
}

.category-cultural {
  background: rgba(255, 217, 61, 0.15);
  color: var(--color-accent);
}

.category-default {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.badge-icon {
  font-size: 16px;
}

.badge-text {
  font-size: 12px;
}

.club-favorite {
  width: 40px;
  height: 40px;
  background: var(--color-gray-100);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.3s ease;
}

.club-card:hover .club-favorite {
  background: var(--color-accent);
  color: white;
}

/* Club Body */
.club-body {
  padding: 20px;
}

.club-name {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 12px;
  line-height: 1.3;
}

.club-desc {
  color: var(--color-gray-600);
  line-height: 1.6;
  margin-bottom: 16px;
  font-size: 15px;
}

/* Club Tags */
.club-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.club-tag {
  padding: 6px 12px;
  background: var(--color-gray-100);
  border-radius: 9999px;
  font-size: 12px;
  color: var(--color-gray-600);
  font-weight: 500;
}

.club-tag-more {
  padding: 6px 12px;
  background: var(--color-gray-200);
  border-radius: 9999px;
  font-size: 12px;
  color: var(--color-gray-500);
}

/* Club Footer */
.club-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--color-gray-100);
}

.club-stats {
  flex: 1;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: var(--color-gray-600);
  font-weight: 500;
}

.club-action {
  flex: 0;
}

.view-btn {
  width: 100%;
  padding: 12px 24px;
  background: transparent;
  border: 2px solid var(--color-secondary);
  border-radius: 9999px;
  color: var(--color-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.view-btn:hover {
  background: var(--color-secondary);
  color: white;
}

.action-arrow {
  font-size: 14px;
  opacity: 0;
  transition: all 0.3s ease;
}

.view-btn:hover .action-arrow {
  opacity: 1;
  transform: translateX(4px);
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
}

.modal-content {
  background: white;
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn modalSlideIn 0.4s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid var(--color-gray-100);
}

.modal-club-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
;
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
  font-size: 18px;
  color: var(--color-gray-600);
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: var(--color-gray-200);
  color: var(--color-dark);
}

/* Modal Body */
.modal-body {
  padding: 32px;
}

.modal-club-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  color: var(--color-dark);
  margin-bottom: 20px;
}

.modal-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.modal-tag {
  padding: 8px 16px;
  background: rgba(255, 107, 107, 0.15);
  color: var(--color-primary);
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
}

.modal-description {
  color: var(--color-gray-600);
  line-height: 1.8;
  margin-bottom: 24px;
  font-size: 15px;
}

.modal-info-card {
  background: var(--color-gray-50);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: grid;
  gap: 20px;
}

.info-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.info-icon {
  font-size: 24px;
  margin-top: 4px;
}

.info-content {
  flex: 1;
}

.info-label {
  display: block;
  font-weight: 600;
  color: var(--color-gray-600);
  font-size: 13px;
  margin-bottom: 4px;
}

.info-value {
  color: var(--color-dark);
  font-size: 15px;
  line-height: 1.5;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  padding: 32px;
  border-top: 1px solid var(--color-gray-100);
}

.modal-btn {
  flex: 1;
  padding: 16px 32px;
  border-radius: 9999px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.modal-btn:hover {
  transform: translateY(-2px);
}

.modal-btn-secondary {
  background: transparent;
  color: var(--color-gray-600);
  border: 2px solid var(--color-gray-300);
}

.modal-btn-secondary:hover {
  background: var(--color-gray-100);
  color: var(--color-dark);
  border-color: var(--color-dark);
}

.modal-btn-primary {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
}

.modal-btn-primary:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(255, 107, 107, 0.4);
}

.btn-icon {
  font-size: 14px;
  margin-left: 4px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 32px;
  }

  .filter-card {
    padding: 24px;
  }

  .filter-row {
    flex-direction: column;
  }

  .filter-item {
    width: 100%;
  }

  .filter-search {
    width: 100%;
  }

  .clubs-grid {
    grid-template-columns: 1fr;
  }

  .modal-content {
    width: 95%;
  }
}
</style>
