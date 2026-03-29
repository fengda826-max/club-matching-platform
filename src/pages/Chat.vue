<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useClubsStore } from '@/stores/clubs'
import { useUserStore } from '@/stores/user'
import { chatWithAI, getApiKeyStatus } from '@/api/claude'

const clubsStore = useClubsStore()
const userStore = useUserStore()

const inputMessage = ref('')
const isLoading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)

const apiKeyStatus = computed(() => getApiKeyStatus())
const hasValidApiKey = computed(() => apiKeyStatus.value.valid)
const messages = computed(() => userStore.chatHistory)

const suggestedQuestions = [
  '有哪些技术类社团？',
  '我想加入篮球社团，有什么要求？',
  '哪个社团最适合编程初学者？',
  '社团活动时间是怎样的？',
  '摄影协会需要自备相机吗？',
  '有哪些社团不需要基础就能加入？',
  'AI社团需要什么基础？',
  '舞蹈协会有哪些舞种？',
]

watch(messages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
})

const sendMessage = async (text?: string) => {
  const message = text || inputMessage.value.trim()
  if (!message) {
    return
  }

  if (!hasValidApiKey.value) {
    ElMessage.warning('请先配置 API Key')
    return
  }

  userStore.addUserMessage(message)
  inputMessage.value = ''

  isLoading.value = true

  try {
    const response = await chatWithAI({
      question: message,
      clubs: clubsStore.clubs,
      conversationHistory: userStore.chatHistory.slice(0, -1), // Exclude current message
    })

    userStore.addAssistantMessage(response)
  } catch (error) {
    console.error('Error sending message:', error)
    ElMessage.error('发送消息失败，请检查 API Key 配置')
    userStore.addAssistantMessage('抱歉，我暂时无法回答你的问题，请稍后再试。')
  } finally {
    isLoading.value = false
  }
}

const clearChat = () => {
  userStore.clearChatHistory()
  ElMessage.success('对话已清空')
}

const useSuggestedQuestion = (question: string) => {
  sendMessage(question)
}
</script>

<template>
  <div class="chat-page">
    <!-- Floating Elements -->
    <div class="floating-elements">
      <div class="float-item" style="--delay: 0s; --x: 10%; --y: 20%">💬</div>
      <div class="float-item" style="--delay: -3s; --x: 90%; --y: 60%">🎨</div>
      <div class="float-item" style="--delay: -6s; --x: 15%; --y: 80%">📚</div>
    </div>

    <!-- Header -->
    <section class="page-header">
      <div class="header-pattern"></div>
      <div class="header-content">
        <div class="header-icon">
          <span class="icon-emoji">💬</span>
        </div>
        <div class="header-text">
          <h1 class="page-title">AI 问答</h1>
          <p class="page-subtitle">有任何关于社团的问题？AI助手随时为你解答</p>
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
      <!-- Chat Container -->
      <div class="chat-container">
        <div class="chat-messages" ref="chatContainer">
          <!-- Empty State -->
          <div v-if="messages.length === 0" class="chat-empty">
            <div class="empty-icon">
              <span class="pulse">💬</span>
            </div>
            <p class="empty-title">开始提问吧！</p>
            <p class="empty-hint">你可以询问社团信息、入社要求、活动时间等任何问题</p>

            <div class="suggested-questions">
              <h4 class="suggested-title">推荐问题：</h4>
              <div class="questions-grid">
                <button
                  v-for="question in suggestedQuestions"
                  :key="question"
                  class="suggested-question"
                  @click="useSuggestedQuestion(question)"
                >
                  {{ question }}
                </button>
              </div>
            </div>
          </div>

          <!-- Messages -->
          <div v-else class="messages-list">
            <div
              v-for="(msg, index) in messages"
              :key="index"
              :class="['message', msg.role]"
            >
              <div class="message-content">
                <div class="message-header">
                  <span class="message-icon">
                    <template v-if="msg.role === 'user'">👤</template>
                    <template v-else>🤖</template>
                  </span>
                  <span class="message-role">
                    {{ msg.role === 'user' ? '你' : 'AI助手' }}
                  </span>
                  <span class="message-time">
                    {{ new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                </div>
                <div class="message-text">{{ msg.content }}</div>
              </div>
            </div>

            <!-- Loading Indicator -->
            <div v-if="isLoading" class="message assistant loading">
              <div class="message-content">
                <div class="message-header">
                  <span class="message-icon">🤖</span>
                  <span class="message-role">AI助手</span>
                </div>
                <div class="message-text loading-text">
                  <span class="loading-pulse"></span>
                  正在思考...
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="chat-input-area">
          <div class="input-wrapper">
            <input
              v-model="inputMessage"
              type="text"
              class="chat-input"
              placeholder="输入你的问题..."
              @keyup.ctrl.enter="sendMessage"
              :disabled="isLoading || !hasValidApiKey"
            />
            <button class="send-button" :disabled="!inputMessage.trim() || isLoading || !hasValidApiKey" @click="sendMessage">
              <span class="send-icon">🚀</span>
            </button>
          </div>
          <div class="input-actions">
            <button
              v-if="messages.length > 0"
              class="action-button secondary"
              @click="clearChat"
            >
              <span class="action-icon">🗑️</span>
              <span>清空对话</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
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
    transform: translateY(-30px) rotate(10deg) scale(1.05);
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
    radial-gradient(circle at 20% 50%, rgba(255, 107, 107, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(46, 134, 171, 0.1) 0%, transparent 50%);
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
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.header-text {
  flex: 1;
}

.page-title {
  font-family: var(--font-display);
  font-size: 36px;
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
  margin-bottom: 0;
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
  max-width: 1000px;
  margin: 0 auto;
}

/* Chat Container */
.chat-container {
  background: white;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  overflow: hidden;
  animation: slideUp 0.6s ease-out;
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

/* Chat Messages */
.chat-messages {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
  background: var(--color-gray-50);
}

/* Chat Empty State */
.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  animation: bounce 2s ease-in-out infinite;
}

.pulse {
  display: inline-block;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.empty-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  color: var(--color-dark);
  margin-bottom: 12px;
}

.empty-hint {
  color: var(--color-gray-600);
  font-size: 16px;
  margin-bottom: 40px;
}

/* Suggested Questions */
.suggested-questions {
  width: 100%;
  max-width: 800px;
}

.suggested-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-dark);
  margin-bottom: 20px;
}

.questions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.suggested-question {
  padding: 14px 24px;
  background: var(--color-gray-100);
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-dark);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.suggested-question:hover {
  background: rgba(255, 107, 107, 0.1);
  border-color: var(--color-primary);
  transform: translateY(-2px);
}

/* Messages List */
.messages-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 20px;
}

.message {
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.message-content {
  max-width: 80%;
  padding: 20px 24px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.message.user .message-content {
  background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary) 100%);
  color: white;
}

.message.assistant .message-content {
  background: white;
  color: var(--color-dark);
}

.message-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.message-icon {
  font-size: 20px;
}

.message-role {
  font-weight: 600;
  font-size: 13px;
  opacity: 0.8;
}

.message-time {
  font-size: 12px;
  opacity: 0.6;
  margin-left: auto;
}

.message-text {
  line-height: 1.7;
  word-break: break-word;
}

.message-text.loading-text {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-pulse {
  width: 12px;
  height: 12px;
  background: var(--color-primary);
  border-radius: 50%;
  animation: loadingPulse 1s ease-in-out infinite;
}

@keyframes loadingPulse {
  0%, 100% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
}

/* Input Area */
.chat-input-area {
  padding: 24px 32px;
  background: var(--color-gray-100);
  border-top: 1px solid var(--color-gray-200);
}

.input-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.chat-input {
  flex: 1;
  padding: 18px 24px;
  font-size: 16px;
  border: 2px solid var(--color-gray-200);
  border-radius: var(--radius-full);
  outline: none;
  transition: all 0.3s ease;
  background: white;
}

.chat-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(255, 107, 107, 0.2);
}

.chat-input:disabled {
  background: var(--color-gray-100);
  cursor: not-allowed;
}

.chat-input::placeholder {
  color: var(--color-gray-600);
}

.send-button {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 24px;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.send-button:hover:not(.disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4);
}

.send-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-icon {
  animation: float 4s ease-in-out infinite;
}

/* Input Actions */
.input-actions {
  display: flex;
  justify-content: flex-end;
}

.action-button {
  padding: 12px 24px;
  background: transparent;
  color: var(--color-gray-600);
  border: 2px solid var(--color-gray-300);
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-button:hover {
  background: rgba(255, 107, 107, 0.1);
  color: var(--color-secondary);
  border-color: var(--color-secondary);
  transform: translateY(-2px);
}

.action-icon {
  font-size: 16px;
}

/* Responsive */
@media (max-width: 768px) {
  .page-title {
    font-size: 28px;
  }

  .header-content {
    flex-direction: column;
    gap: 12px;
  }

  .chat-container {
    height: calc(100100vh - 160px);
  }

  .questions-grid {
    grid-template-columns: 1fr;
  }

  .message-content {
    max-width: 95%;
  }

  .input-wrapper {
    flex-direction: column;
  }
}
</style>
