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
      keyActivities: keyActivities.value.length > 0 ? keyActivities.value : [newClub.value.category],
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
      <div class="float-item" style="--delay: 0; --size: 80px; --x: 10%; --y: 15%;">⚙️</div>
      <div class="float-item" style="--delay: -5s; --size: 60px; --x: 90%; --y: 25%;">📊</div>
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
