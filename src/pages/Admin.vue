<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useClubsStore } from '@/stores/clubs'
import { generateDescription, getApiKeyStatus } from '@/api/claude'
import type { Club } from '@/types'

const clubsStore = useClubsStore()

const activeTab = ref('stats')
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const tabs = [
  { id: 'stats', label: '统计', icon: '📊' },
  { id: 'clubs', label: '社团', icon: '🎯' },
]
const editingClub = ref<Club | null>(null)

const newClub = ref<Partial<Club>>({
  name: '',
  category: '',
  tags: [],
  description: '',
  requirements: '',
  memberCount: 0,
  contact: '',
})

const tagInput = ref('')
const keyActivitiesInput = ref('')
const keyActivities = ref<string[]>([])
const isGenerating = ref(false)

const categories = computed(() => clubsStore.categories)
const clubs = computed(() => clubsStore.clubs)
const hasValidApiKey = computed(() => getApiKeyStatus().valid)

const categoryOptions = computed(() =>
  categories.value.map((cat) => ({ label: cat.name, value: cat.name })),
)

const stats = computed(() => ({
  totalClubs: clubs.value.length,
  totalMembers: clubs.value.reduce((sum, club) => sum + (typeof club.memberCount === 'number' ? club.memberCount : parseInt(club.memberCount) || 0), 0),
  categories: new Set(clubs.value.map((club) => club.category)).size,
}))

const addTag = () => {
  if (tagInput.value.trim() && newClub.value.tags) {
    const tag = tagInput.value.trim()
    if (!newClub.value.tags.includes(tag)) {
      newClub.value.tags.push(tag)
    }
    tagInput.value = ''
  }
}

const removeTag = (tag: string) => {
  if (newClub.value.tags) {
    const index = newClub.value.tags.indexOf(tag)
    if (index > -1) {
      newClub.value.tags.splice(index, 1)
    }
  }
}

const addKeyActivity = () => {
  if (keyActivitiesInput.value.trim()) {
    const activity = keyActivitiesInput.value.trim()
    if (!keyActivities.value.includes(activity)) {
      keyActivities.value.push(activity)
    }
    keyActivitiesInput.value = ''
  }
}

const removeKeyActivity = (activity: string) => {
  const index = keyActivities.value.indexOf(activity)
  if (index > -1) {
    keyActivities.value.splice(index, 1)
  }
}

const generateClubContent = async () => {
  if (!hasValidApiKey.value) {
    ElMessage.warning('请先配置 API Key')
    return
  }

  if (!newClub.value.name || !newClub.value.category) {
    ElMessage.warning('请先填写社团名称和分类')
    return
  }

  isGenerating.value = true

  try {
    const response = await generateDescription({
      clubName: newClub.value.name,
      category: newClub.value.category,
      keyActivities: keyActivities.value.length > 0 ? keyActivities.value : [newclub.value.category],
    })

    newClub.value.description = response.description
    newClub.value.tags = response.suggestedTags
    newClub.value.requirements = response.suggestedRequirements

    ElMessage.success('生成成功！')
  } catch (error) {
    console.error('Error generating content:', error)
    ElMessage.error('生成失败，请检查 API Key 配置')
  } finally {
    isGenerating.value = false
  }
}

const handleAddClub = () => {
  if (!newClub.value.name || !newClub.value.category || !newClub.value.description) {
    ElMessage.warning('请填写必填信息')
    return
  }

  const club: Club = {
    id: Date.now().toString(),
    name: newClub.value.name,
    category: newClub.value.category,
    tags: newClub.value.tags || [],
    description: newClub.value.description,
    requirements: newClub.value.requirements || '无特殊要求',
    memberCount: newClub.value.memberCount || 0,
    contact: newClub.value.contact || '待补充',
    aiGenerated: true,
  }

  clubsStore.addClub(club)
  showAddDialog.value = false
  resetForm()
  ElMessage.success('社团添加成功！')
}

const openEditDialog = (club: Club) => {
  editingClub.value = { ...club }
  showEditDialog.value = true
}

const handleUpdateClub = () => {
  if (editingClub.value) {
    clubsStore.updateClub(editingClub.value.id, editingClub.value)
    showEditDialog.value = false
    editingClub.value = null
    ElMessage.success('社团更新成功！')
  }
}

const handleDeleteClub = async (club: Club) => {
  try {
    await ElMessageBox.confirm(`确定要删除 "${club.name}" 吗？`, '确认删除', {
      type: 'warning',
    })

    clubsStore.deleteClub(club.id)
    ElMessage.success('社团删除成功！')
  } catch {
    // User cancelled
  }
}

const resetForm = () => {
  newClub.value = {
    name: '',
    category: '',
    tags: [],
    description: '',
    requirements: '',
    memberCount: 0,
    contact: '',
  }
  tagInput.value = ''
  keyActivitiesInput.value = ''
  keyActivities.value = []
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
</script>

<template>
  <div class="admin-page">
    <!-- Floating Elements -->
    <div class="floating-elements">
      <div class="float-item" style="--delay: 0s; --x: 10%; --y: 15%;">⚙️</div>
      <div class="float-item" style="--delay: -5s; --x: 90%; --y: 25%;">📊</div>
    </div>

    <!-- Header -->
    <section class="page-header">
      <div class="header-pattern"></div>
      <div class="header-content">
        <div class="header-icon">
          <span class="pulse">⚙️</span>
        </div>
        <div class="header-text">
          <h1 class="page-title">管理后台</h1>
          <p class="page-subtitle">管理社团信息、生成内容、查看统计数据</p>
        </div>
      </div>
    </section>

    <!-- API Key Warning -->
    <div class="api-warning" v-if="!hasValidApiKey">
      <div class="warning-card">
        <div class="warning-icon">⚠️</div>
        <h3>AI 功能受限</h3>
        <p>配置 API Key 后可使用 AI 自动生成社团描述和标签功能</p>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- Tabs -->
      <div class="tabs-container">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="['tab-button', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <!-- Stats Tab -->
      <section v-if="activeTab === 'stats'" class="tab-content">
        <div class="stats-grid">
          <div class="stat-card stat-card-primary">
            <div class="stat-icon">📚</div>
            <div class="stat-info">
              <span class="stat-number">{{ stats.totalClubs }}</span>
              <span class="stat-label">社团总数</span>
            </div>
          </div>

          <div class="stat-card stat-card-secondary">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <span class="stat-number">{{ stats.totalMembers }}</span>
              <span class="stat-label">总成员数</span>
            </div>
          </div>

          <div class="stat-card stat-card-accent">
            <div class="stat-icon">🎨</div>
            <div class="stat-info">
              <span class="stat-number">{{ stats.categories }}</span>
              <span class="stat-label">社团分类</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Clubs Tab -->
      <section v-if="activeTab === 'clubs'" class="tab-content">
        <div class="actions-header">
          <button class="action-button" @click="showAddDialog = true">
            <span class="btn-icon">➕</span>
            <span class="btn-text">添加社团</span>
          </button>
        </div>

        <div class="clubs-table-wrapper">
          <table class="clubs-table">
            <thead>
              <tr>
                <th class="table-header">社团名称</th>
                <th class="table-header">分类</th>
                <th class="table-header text-center">成员数</th>
                <th class="table-header">标签</th>
                <th class="table-header text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="club in clubs" :key="club.id" class="table-row">
                <td class="table-cell">
                  <div class="cell-content">
                    <span class="category-emoji">{{ getCategoryEmoji(club.category) }}</span>
                    <span class="club-name">{{ club.name }}</span>
                  </div>
                </td>
                <td class="table-cell">
                  <span class="category-badge">{{ club.category }}</span>
                </td>
                <td class="table-cell text-center">
                  <span class="member-count">{{ club.memberCount }}</span>
                </td>
                <td class="table-cell">
                  <div class="tags-wrapper">
                    <span
                      v-for="(tag, index) in club.tags.slice(0, 2)"
                      :key="index"
                      class="table-tag"
                    >
                      {{ tag }}
                    </span>
                    <span v-if="club.tags.length > 2" class="table-tag table-tag-more">
                      +{{ club.tags.length - 2 }}
                    </span>
                  </div>
                </td>
                <td class="table-cell text-center">
                  <div class="action-buttons">
                    <button class="table-btn btn-edit" @click="openEditDialog(club)">
                      编辑
                    </button>
                    <button class="table-btn btn-delete" @click="handleDeleteClub(club)">
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Add Club Dialog -->
    <div v-if="showAddDialog" class="modal-overlay" @click="showAddDialog = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <div class="modal-icon">➕</div>
          <h2 class="modal-title">添加新社团</h2>
          <div class="modal-close" @click="showAddDialog = false">✕</div>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">社团名称</label>
            <input
              v-model="newClub.name"
              type="text"
              class="form-input"
              placeholder="输入社团名称"
            />
          </div>

          <div class="form-group">
            <label class="form-label">分类</label>
            <div class="category-select">
              <button
                v-for="cat in categories"
                :key="cat.id"
                :class="['category-btn', { active: newClub.category === cat.name }]"
                @click="newClub.category = cat.name"
              >
                <span class="category-icon">{{ cat.icon }}</span>
                <span>{{ cat.name }}</span>
              </button>
            </div>
          </div>

          <div class="form-group ai-section" v-if="hasValidApiKey">
            <div class="ai-hint">
              <span class="hint-icon">✨</span>
              <span>填了社团名称和分类后，让 AI 自动生成描述和标签</span>
            </div>

            <label class="form-label">主要活动（可选）</label>
            <div class="tag-input-group">
              <input
                v-model="keyActivitiesInput"
                type="text"
                class="form-input"
                placeholder="输入社团主要活动，按回车添加"
                @keyup.enter="addKeyActivity"
              />
              <button class="add-tag-btn" @click="addKeyActivity">
                <span>+</span>
              </button>
            </div>
            <div class="tags-container">
              <span
                v-for="activity in keyActivities"
                :key="activity"
                class="tag-item"
              >
                {{ activity }}
                <span class="tag-remove" @click="removeKeyActivity(activity)">✕</span>
              </span>
            </div>

            <button
              class="ai-generate-btn"
              :class="{ loading: isGenerating, disabled: isGenerating }"
              @click="generateClubContent"
            >
              <span class="btn-icon">✨</span>
              <span class="btn-text">{{ isGenerating ? '生成中...' : 'AI 自动生成' }}</span>
            </button>
          </div>

          <div class="form-group">
            <label class="form-label">社团描述</label>
            <textarea
              v-model="newClub.description"
              class="form-textarea"
              rows="4"
              placeholder="输入社团描述..."
            />
          </div>

          <div class="form-group">
            <label class="form-label">标签</label>
            <div class="tag-input-group">
              <input
                v-model="tagInput"
                type="text"
                class="form-input"
                placeholder="输入标签，按回车添加"
                @keyup.enter="addTag"
              />
              <button class="add-tag-btn" @click="addTag">
                <span>+</span>
              </button>
            </div>
            <div class="tags-container">
              <span
                v-for="tag in newClub.tags"
                :key="tag"
                class="tag-item"
              >
                {{ tag }}
                <span class="tag-remove" @click="removeTag(tag)">✕</span>
              </span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">入社要求</label>
            <textarea
              v-model="newClub.requirements"
              class="form-textarea"
              rows="3"
              placeholder="输入入社要求..."
            />
          </div>

          <div class="form-group">
            <label class="form-label">成员数</label>
            <input
              v-model.number="newClub.memberCount"
              type="number"
              class="form-input"
              min="0"
              placeholder="输入成员数"
            />
          </div>

          <div class="form-group">
            <label class="form-label">联系方式</label>
            <input
              v-model="newClub.contact"
              type="text"
              class="form-input"
              placeholder="输入联系方式..."
            />
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn modal-btn-secondary" @click="showAddDialog = false">
            取消
          </button>
          <button class="modal-btn modal-btn-primary" @click="handleAddClub">
            添加社团
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Club Dialog -->
    <div v-if="showEditDialog && editingClub" class="modal-overlay" @click="showEditDialog = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <div class="modal-icon">✏️</div>
          <h2 class="modal-title">编辑社团</h2>
          <div class="modal-close" @click="showEditDialog = false">✕</div>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">社团名称</label>
            <input v-model="editingClub.name" type="text" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">分类</label>
            <div class="category-select">
              <button
                v-for="cat in categories"
                :key="cat.id"
                :class="['category-btn', { active: editingClub.category === cat.name }]"
                @click="editingClub.category = cat.name"
              >
                <span class="category-icon">{{ cat.icon }}</span>
                <span>{{ cat.name }}</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea v-model="editingClub.description" class="form-textarea" rows="4" />
          </div>

          <div class="form-group">
            <label class="form-label">入社要求</label>
            <textarea v-model="editingClub.requirements" class="form-textarea" rows="3" />
          </div>

          <div class="form-group">
            <label class="form-label">成员数</label>
            <input v-model.number="editingClub.memberCount" type="number" class="form-input" min="0" />
          </div>

          <div class="form-group">
            <label class="form-label">联系方式</label>
            <input v-model="editingClub.contact" type="text" class="form-input" />
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn modal-btn-secondary" @click="showEditDialog = false">
            取消
          </button>
          <button class="modal-btn modal-btn-primary" @click="handleUpdateClub">
            保存修改
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page {
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
  opacity: 0.08;
  animation: float 25s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg) scale(1);
  }
  50% {
    transform: translateY(-40px) rotate(10deg) scale(1.05);
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
    radial-gradient(circle at 20% 30%, rgba(255, 107, 107, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(46, 134, 171, 0.15) 0%, transparent 50%);
  animation: patternMove 30s ease-in-out infinite;
}

@keyframes patternMove {
  0%, 100% {
    transform: scale(1) translate(0);
  }
  50% {
    transform: scale(1.05) translate(10px, -5px);
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

.pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
}

.header-text {
  color: white;
}

.page-title {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 8px;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 16px;
  opacity: 0.9;
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
  margin-bottom: 12px;
}

.warning-card h3 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--color-dark);
  margin-bottom: 8px;
}

.warning-card p {
  color: var(--color-gray-600);
  font-size: 14px;
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

/* Content Wrapper */
.content-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* Tabs */
.tabs-container {
  display: flex;
  gap: 12px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.tab-button {
  flex: 1;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: transparent;
  border: 2px solid var(--color-gray-200);
  border-radius: 9999px;
  font-weight: 600;
  font-size: 15px;
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-button:hover {
  background: var(--color-gray-100);
}

.tab-button.active {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  border-color: var(--color-primary);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.2);
}

.tab-icon {
  font-size: 24px;
}

.tab-label {
  font-weight: 600;
}

/* Tab Content */
.tab-content {
  animation: slideUp 0.5s ease-out 0.2s both;
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

/* Stats Section */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
}

.stat-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 40px 32px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-md);
}

.stat-card-primary {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
}

.stat-card-secondary {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
}

.stat-card-accent {
  background: linear-gradient(135deg, #FF6B6B 0%, #FFD93D 100%);
  color: white;
}

.stat-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 800;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

/* Clubs Table */
.actions-header {
  margin-bottom: 32px;
  display: flex;
  justify-content: flex-end;
}

.clubs-table-wrapper {
  background: white;
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: var(--shadow-md);
}

.clubs-table {
  width: 100%;
  border-collapse: collapse;
}

.table-header {
  background: var(--color-gray-50);
  padding: 16px;
  font-weight: 600;
  color: var(--color-dark);
  font-size: 14px;
  text-align: left;
}

.table-header.text-center {
  text-align: center;
}

.table-row {
  border-bottom: 1px solid var(--color-gray-100);
}

.table-row:hover {
  background: var(--color-gray-50);
}

.table-cell {
  padding: 20px 16px;
  vertical-align: middle;
}

.cell-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.category-emoji {
  font-size: 24px;
}

.club-name {
  font-weight: 600;
  color: var(--color-dark);
}

.category-badge {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(255, 107, 107, 0.1);
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-secondary);
}

.member-count {
  color: var(--color-gray-600);
  font-weight: 500;
}

.tags-wrapper {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.table-tag {
  padding: 6px 12px;
  background: var(--color-gray-100);
  border-radius: 9999px;
  font-size: 13px;
  color: var(--color-gray-600);
}

.table-tag-more {
  background: var(--color-gray-200);
  color: var(--color-gray-500);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
}

.table-btn {
  padding: 8px 16px;
  background: var(--color-gray-100);
  border: none;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.table-btn:hover {
  background: var(--color-gray-200);
}

.table-btn.btn-edit {
  color: var(--color-secondary);
}

.table-btn.btn-delete {
  color: #EF4444;
}

.table-btn.btn-delete:hover {
  background: #DC2626;
  color: white;
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
  animation: slideUp 0.4s ease-out;
}

/* Modal Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid var(--color-gray-100);
  margin-bottom: 24px;
}

.modal-icon {
  font-size: 32px;
  color: var(--color-secondary);
}

.modal-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--color-dark);
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

/* Form Group */
.form-group {
  margin-bottom: 24px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-weight: 600;
  color: var(--color-dark);
  margin-bottom: 12px;
  font-size: 15px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 14px 20px;
  font-size: 15px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  outline: none;
  transition: all 0.3s ease;
  background: var(--color-gray-50);
  font-family: var(--font-body);
}

.form-input:focus,
.form-textarea:focus {
  border-color: var(--color-primary);
  background: white;
  box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.2);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

/* Category Select */
.category-select {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  background: var(--color-gray-100);
  border: 2px solid var(--color-gray-200);
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-btn:hover {
  background: var(--color-gray-200);
}

.category-btn.active {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  border-color: var(--color-primary);
}

.category-icon {
  font-size: 18px;
}

/* AI Section */
.ai-section {
  background: linear-gradient(135deg, rgba(255, 107, 107, 0.05) 0%, rgba(255, 217, 61, 0.05) 100%);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 107, 107, 0.1);
}

.ai-hint {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: var(--color-dark);
}

.hint-icon {
  background: var(--color-secondary);
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

/* Tag Input Group */
.tag-input-group {
  display: flex;
  gap: 12px;
}

.add-tag-btn {
  width: 56px;
  height: 56px;
  background: var(--color-primary);
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.add-tag-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
}

/* AI Generate Button */
.ai-generate-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 32px;
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  border: none;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.ai-generate-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.35);
}

.ai-generate-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tags Container */
.tags-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--color-gray-100);
  border-radius: 9999px;
  font-size: 14px;
  color: var(--color-gray-600);
  animation: slideUp 0.3s ease-out both;
  animation: calc(var(--index, 0) * 0.05s) both;
}

.tag-remove {
  margin: 2px 0 0 0 8px;
  opacity: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-item:hover .tag-remove {
  opacity: 1;
}

.tag-remove:hover {
  transform: scale(1.2);
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid var(--color-gray-100);
}

.modal-btn {
  flex: 1;
  padding: 14px 32px;
  border-radius: 9999px;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.modal-btn.secondary {
  background: transparent;
  color: var(--color-gray-600);
}

.modal-btn.secondary:hover {
  background: var(--color-gray-100);
  color: var(--color-dark);
}

.modal-btn.primary {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.25);
}

.modal-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.35);
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 28px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .category-select {
    grid-template-columns: 1fr;
  }

  .clubs-table-wrapper {
    overflow-x: auto;
  }

  .modal-content {
    width: 95%;
  }
}
</style>
