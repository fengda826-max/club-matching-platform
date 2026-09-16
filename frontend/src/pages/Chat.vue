<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useClubsStore } from '@/stores/clubs'
import { useUserStore } from '@/stores/user'
import { apiClient, type ChatMessage as BackendChatMessage } from '@/api/client'
import { streamChat } from '@/api/sse'
import AnswerSources from '@/components/chat/AnswerSources.vue'
import PageIntro from '@/components/layout/PageIntro.vue'
import StatusPill from '@/components/ui/StatusPill.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const clubsStore = useClubsStore()
const userStore = useUserStore()
const inputMessage = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const activeController = ref<AbortController | null>(null)
const connection = ref<'checking' | 'online' | 'offline'>('checking')
const aiAvailable = ref(false)
const configuredModel = ref('')
const messages = computed(() => userStore.chatHistory)
const hasValidBackend = computed(() => connection.value === 'online')
const connectionStatus = computed(() => ({
  checking: { tone: 'neutral' as const, label: '正在检查连接' },
  online: aiAvailable.value
    ? { tone: 'success' as const, label: '已连接' }
    : { tone: 'warning' as const, label: '规则问答可用' },
  offline: { tone: 'danger' as const, label: '服务未连接' },
})[connection.value])
const latestAnswer = computed(() => [...messages.value].reverse().find(message => message.role === 'assistant'))
const modelLabel = computed(() => latestAnswer.value?.model || (connection.value === 'online' && !aiAvailable.value ? '基于社团资料 · 规则问答' : configuredModel.value || '模型待确认'))
const generationStatus = computed(() => {
  if (isLoading.value) return '正在生成'
  if (latestAnswer.value?.error === '已停止生成') return '已停止生成'
  if (latestAnswer.value?.error) return '回答中断，可重新提问'
  return latestAnswer.value ? '回答已完成' : '等待提问'
})

async function checkBackendHealth() {
  connection.value = 'checking'
  try {
    const health = await apiClient.ai.health()
    connection.value = 'online'
    aiAvailable.value = health.healthy
    configuredModel.value = typeof health.provider?.model === 'string' ? health.provider.model : ''
  } catch {
    connection.value = 'offline'
  }
}

onMounted(async () => {
  void checkBackendHealth()
  // Preserve the real club context loaded by the existing chat workflow.
  if (clubsStore.clubs.length === 0) {
    try {
      await clubsStore.fetchClubs()
      await clubsStore.fetchStatistics()
    } catch (error) {
      console.error('Failed to load clubs:', error)
    }
  }
})
onBeforeUnmount(() => activeController.value?.abort())

const questionGroups = [
  { title: '找到方向', questions: ['有哪些技术类社团？', '哪个社团最适合编程初学者？'] },
  { title: '了解门槛', questions: ['有哪些社团不需要基础就能加入？', 'AI社团需要什么基础？'] },
  { title: '安排时间与装备', questions: ['社团活动时间是怎样的？', '摄影协会需要自备相机吗？'] },
  { title: '探索具体社团', questions: ['我想加入篮球社团，有什么要求？', '舞蹈协会有哪些舞种？'] },
]

watch(messages, () => {
  nextTick(() => {
    if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  })
}, { deep: true })

const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value || !hasValidBackend.value) return

  userStore.addUserMessage(message)
  inputMessage.value = ''
  isLoading.value = true
  const assistantIndex = userStore.startAssistantMessage()
  const controller = new AbortController()
  activeController.value = controller

  try {
    const history: BackendChatMessage[] = userStore.chatHistory.slice(0, -2).map(msg => ({
      role: msg.role,
      content: msg.content,
    }))
    await streamChat({ message, history }, {
      metadata: data => userStore.updateAssistantMetadata(assistantIndex, { sources: data.sources, model: data.model }),
      chunk: data => userStore.appendAssistantChunk(assistantIndex, data.text),
      usage: data => userStore.updateAssistantMetadata(assistantIndex, { durationMs: data.durationMs }),
      error: data => userStore.updateAssistantMetadata(assistantIndex, { error: data.message }),
    }, controller.signal)
  } catch (error) {
    if (controller.signal.aborted) {
      userStore.updateAssistantMetadata(assistantIndex, { error: '已停止生成' })
    } else {
      // Fetch and response-body transport failures reject with TypeError.
      if (error instanceof TypeError) connection.value = 'offline'
      userStore.updateAssistantMetadata(assistantIndex, { error: error instanceof Error ? error.message : '回答失败，请稍后重试' })
      if (!userStore.chatHistory[assistantIndex]?.content) userStore.appendAssistantChunk(assistantIndex, '抱歉，暂时无法生成回答。')
    }
  } finally {
    isLoading.value = false
    activeController.value = null
  }
}

const cancelMessage = () => activeController.value?.abort()
const clearChat = () => {
  if (isLoading.value || !messages.value.length) return
  userStore.clearChatHistory()
}
const useSuggestedQuestion = (question: string) => {
  if (isLoading.value) return
  inputMessage.value = question
  void sendMessage()
}
const retryMessage = (index: number) => {
  const question = messages.value[index - 1]
  if (question?.role === 'user') useSuggestedQuestion(question.content)
}
</script>

<template>
  <div class="chat-page">
    <PageIntro>
      AI 问答
      <template #description><p>把入社要求、活动安排和选择顾虑问清楚，结合社团资料做决定。</p></template>
      <template #aside><span class="context-note">基于社团资料的对话</span></template>
    </PageIntro>

    <section class="chat-panel" aria-label="AI 社团顾问工作台">
      <header class="workspace-status">
        <div class="model-status">
          <strong>社团顾问</strong>
          <span class="model-name">{{ modelLabel }}</span>
        </div>
        <div class="status-items">
          <StatusPill :tone="connectionStatus.tone" :label="connectionStatus.label" />
          <span class="generation-status" role="status">{{ generationStatus }}</span>
        </div>
      </header>

      <div ref="chatContainer" class="chat-messages" role="log" aria-label="社团问答记录" aria-live="polite" aria-relevant="additions text" tabindex="0">
        <EmptyState v-if="connection === 'offline'" class="connection-empty"
          title="暂时无法连接服务"
          description="可以继续查看对话、整理问题。连接恢复后再发送。">
          <template #action><button type="button" class="button-secondary" @click="checkBackendHealth">重新连接</button></template>
        </EmptyState>

        <div v-if="messages.length === 0" class="chat-empty">
          <div class="empty-intro">
            <span class="section-kicker">从一个具体问题开始</span>
            <h2>找到适合自己的校园生活</h2>
            <p>问清时间、基础与投入。回答会附上本次参考的社团资料，方便你核对。</p>
          </div>
          <section class="suggested-questions" aria-labelledby="suggested-heading">
            <h3 id="suggested-heading">你可以这样问</h3>
            <div class="questions-grid">
              <div v-for="group in questionGroups" :key="group.title" class="question-group">
                <h4>{{ group.title }}</h4>
                <button v-for="question in group.questions" :key="question" type="button" class="suggested-question"
                  :disabled="isLoading" @click="useSuggestedQuestion(question)">{{ question }}</button>
              </div>
            </div>
          </section>
        </div>

        <div v-else class="messages-list">
          <article v-for="(msg, index) in messages" :key="index" :class="['message', msg.role]" :aria-label="msg.role === 'user' ? '你的问题' : 'AI 顾问回答'">
            <div class="message-content">
              <header class="message-header">
                <strong>{{ msg.role === 'user' ? '你' : 'AI 社团顾问' }}</strong>
                <time :datetime="new Date(msg.timestamp).toISOString()">{{ new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</time>
              </header>
              <div class="message-text">{{ msg.content || (isLoading && index === messages.length - 1 ? '正在整理社团资料…' : '本次没有生成正文。') }}</div>
              <template v-if="msg.role === 'assistant'">
                <AnswerSources :sources="msg.sources || []" :pending="isLoading && index === messages.length - 1 && !msg.sources" />
                <div v-if="msg.model || msg.durationMs !== undefined" class="message-meta">
                  <span v-if="msg.model">{{ msg.model }}</span>
                  <span v-if="msg.durationMs !== undefined">耗时 {{ (msg.durationMs / 1000).toFixed(1) }} 秒</span>
                </div>
                <div v-if="msg.error" class="message-error" :class="{ stopped: msg.error === '已停止生成' }" :role="msg.error === '已停止生成' ? 'status' : 'alert'">
                  <p>{{ msg.error }}</p>
                  <button type="button" class="button-secondary" :disabled="isLoading || !hasValidBackend" @click="retryMessage(index)">重新提问</button>
                </div>
              </template>
            </div>
          </article>
        </div>
      </div>

      <form class="chat-composer" aria-label="提问输入区" @submit.prevent="sendMessage">
        <label for="chat-question">向 AI 社团顾问提问</label>
        <textarea id="chat-question" v-model="inputMessage" aria-label="向 AI 社团顾问提问" aria-describedby="composer-help"
          rows="2" placeholder="例如：零基础可以加入编程社吗？每周需要多少时间？" @keydown.ctrl.enter.prevent="sendMessage" />
        <div class="composer-footer">
          <span id="composer-help">Enter 换行 · Ctrl+Enter 发送</span>
          <div class="composer-actions">
            <button type="button" class="button-secondary" :disabled="!messages.length || isLoading" @click="clearChat">清空对话</button>
            <button type="button" class="button-secondary" :disabled="!isLoading" @click="cancelMessage">停止生成</button>
            <button type="submit" class="button-primary" :disabled="!inputMessage.trim() || isLoading || !hasValidBackend">发送</button>
          </div>
        </div>
      </form>
    </section>
    <p class="workspace-footnote">AI 回答仅供参考，具体招募与活动安排请以社团最新通知为准。</p>
  </div>
</template>

<style scoped>
.chat-page { width: min(calc(100% - 64px), var(--content-app)); margin-inline: auto; padding-bottom: 32px; }
.context-note, .workspace-footnote { color: var(--text-muted); font-size: 14px; line-height: 1.6; }
.chat-panel { display: flex; flex-direction: column; height: clamp(560px, calc(100dvh - 290px), 800px); overflow: hidden; border: 1px solid var(--border-moss); border-radius: var(--radius-panel); background: var(--surface); }
.workspace-status { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 24px; padding: 18px 24px; border-bottom: 1px solid var(--border-moss); }
.model-status { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; min-width: 0; }
.model-status strong { color: var(--text-ink); font-size: 16px; }
.model-name { color: var(--text-muted); font-size: 14px; overflow-wrap: anywhere; }
.status-items { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.generation-status { color: var(--text-muted); font-size: 14px; }
.chat-messages { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 28px; background: var(--field-paper); }
.connection-empty { margin-bottom: 24px; }
.chat-empty { max-width: 820px; margin: 0 auto; }
.empty-intro { margin-bottom: 24px; }
.section-kicker { color: var(--campus-green); font-size: 14px; font-weight: 650; }
.empty-intro h2 { margin: 10px 0 12px; color: var(--text-ink); font-size: clamp(22px, 2.4vw, 28px); font-weight: 750; }
.empty-intro p { max-width: 64ch; margin: 0; color: var(--text-muted); font-size: 15px; line-height: 1.8; }
.suggested-questions h3 { margin: 0 0 14px; color: var(--text-ink); font-size: 16px; }
.questions-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.question-group { min-width: 0; }
.question-group h4 { margin: 0 0 8px; font-size: 14px; font-weight: 500; color: var(--text-muted); }
.suggested-question { display: block; width: 100%; min-height: 44px; padding: 10px 12px; margin-top: 8px; border: 1px solid var(--border-moss); border-radius: var(--radius-control); background: var(--surface); color: var(--ink-forest); font: inherit; font-size: 14px; text-align: left; cursor: pointer; }
.suggested-question:hover { border-color: var(--campus-green); }
.messages-list { display: flex; flex-direction: column; gap: 24px; }
.message { display: flex; min-width: 0; }
.message.user { justify-content: flex-end; }
.message-content { max-width: min(88%, 760px); min-width: 0; padding: 18px 20px; border: 1px solid var(--border-moss); border-radius: var(--radius-card); background: var(--surface); }
.user .message-content { background: var(--ink-forest); color: var(--surface); border-color: var(--ink-forest); }
.message-header { display: flex; align-items: baseline; justify-content: space-between; gap: 20px; margin-bottom: 12px; font-size: 14px; }
.message-header time { white-space: nowrap; color: var(--text-muted); }
.user time { color: var(--surface); }
.message-text { font-size: 16px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
.message-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 12px; color: var(--text-muted); font-size: 14px; overflow-wrap: anywhere; }
.message-error { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-moss); color: var(--danger); font-size: 14px; overflow-wrap: anywhere; }
.message-error p { margin: 0 0 10px; line-height: 1.6; }
.message-error.stopped { color: var(--text-muted); }
.chat-composer { position: sticky; bottom: 0; z-index: 1; flex-shrink: 0; padding: 18px 24px; border-top: 1px solid var(--border-moss); background: var(--surface); }
.chat-composer label { display: block; margin-bottom: 8px; color: var(--text-ink); font-size: 14px; font-weight: 650; }
.chat-composer textarea { display: block; width: 100%; min-height: 76px; max-height: 160px; padding: 12px; border: 1px solid var(--border-moss); border-radius: var(--radius-control); background: var(--surface); color: var(--text-ink); font: inherit; font-size: 16px; line-height: 1.5; resize: vertical; }
.chat-composer textarea::placeholder { color: var(--text-muted); }
.composer-footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; }
#composer-help { color: var(--text-muted); font-size: 14px; }
.composer-actions { display: flex; flex-wrap: wrap; gap: 8px; }
button { min-width: 44px; min-height: 44px; }
button:disabled { cursor: not-allowed; }
.chat-page :is(button, textarea, [tabindex]):focus-visible { outline: 3px solid var(--campus-green); outline-offset: 3px; }
.workspace-footnote { margin: 14px 0 0; }
@media (max-width: 820px) {
  .chat-page { width: calc(100% - 36px); }
  .context-note { display: none; }
  .workspace-status { padding: 14px 16px; }
  .chat-messages { padding: 20px 16px; }
  .chat-composer { padding: 14px 16px; }
  .message-content { max-width: 95%; padding: 16px; }
}
@media (max-width: 520px) {
  .chat-panel { height: max(590px, calc(100dvh - 250px)); }
  .questions-grid { grid-template-columns: 1fr; gap: 16px; }
  .composer-footer { gap: 10px; }
  .composer-actions { width: 100%; justify-content: space-between; }
  .composer-actions button { padding-inline: 12px; }
}
</style>
