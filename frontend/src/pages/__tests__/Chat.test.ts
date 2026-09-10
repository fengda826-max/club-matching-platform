// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import { streamChat, type ChatStreamHandlers } from '@/api/sse'
import { useUserStore } from '@/stores/user'
import Chat from '../Chat.vue'

vi.mock('@/api/sse', () => ({ streamChat: vi.fn() }))
const wrappers: ReturnType<typeof mount>[] = []
let handlers: ChatStreamHandlers
let finish: () => void
let fail: (error: Error) => void
let signal: AbortSignal | undefined

async function render() {
  const wrapper = mount(Chat)
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
function button(wrapper: ReturnType<typeof mount>, name: string) {
  const match = wrapper.findAll('button').find(item => item.text() === name)
  if (!match) throw new Error(`Missing button: ${name}`)
  return match
}

describe('Chat decision workspace', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(apiClient.ai, 'health').mockResolvedValue({ healthy: true, provider: { model: 'test-model' } })
    vi.spyOn(apiClient.clubs, 'getAll').mockResolvedValue([])
    vi.spyOn(apiClient.clubs, 'getStatistics').mockResolvedValue({ totalClubs: 0, totalMembers: 0, categories: [] })
    vi.mocked(streamChat).mockImplementation((_request, callbacks, abortSignal) => {
      handlers = callbacks
      signal = abortSignal
      return new Promise<void>((resolve, reject) => {
        finish = resolve
        fail = reject
        abortSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      })
    })
  })
  afterEach(async () => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    await flushPromises()
    vi.restoreAllMocks()
    vi.mocked(streamChat).mockReset()
  })

  it('provides a labeled live transcript and multiline composer with safe idle actions', async () => {
    const wrapper = await render()
    expect(wrapper.get('[role="log"]').attributes('aria-live')).toBe('polite')
    expect(wrapper.get('[role="log"]').attributes('aria-label')).toBe('社团问答记录')
    expect(wrapper.find('textarea[aria-label="向 AI 社团顾问提问"]').exists()).toBe(true)
    expect(wrapper.get('button[type="submit"]').text()).toBe('发送')
    expect(button(wrapper, '停止生成').attributes('disabled')).toBeDefined()
    expect(button(wrapper, '清空对话').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('已连接')
  })

  it('streams a suggested question into real history with sources, timing, and generation controls', async () => {
    const wrapper = await render()
    await button(wrapper, '有哪些技术类社团？').trigger('click')
    expect(useUserStore().chatHistory[0]?.content).toBe('有哪些技术类社团？')
    expect(wrapper.text()).toContain('正在生成')
    expect(button(wrapper, '停止生成').attributes('disabled')).toBeUndefined()
    expect(button(wrapper, '清空对话').attributes('disabled')).toBeDefined()
    handlers.metadata?.({ sources: [{ clubId: 7, name: '编程社' }], model: 'test-model' })
    handlers.chunk?.({ text: '欢迎零基础同学。\n' })
    handlers.chunk?.({ text: '每周有项目实践。' })
    handlers.usage?.({ durationMs: 1200 })
    finish()
    await flushPromises()
    const answer = wrapper.get('article.assistant')
    expect(answer.text()).toContain('欢迎零基础同学。\n每周有项目实践。')
    expect(answer.get('[aria-label="回答资料来源"]').text()).toContain('编程社')
    expect(answer.text()).toContain('1.2 秒')
    expect(wrapper.text()).toContain('回答已完成')
    expect(button(wrapper, '停止生成').attributes('disabled')).toBeDefined()
    expect(useUserStore().chatHistory[1]?.sources).toEqual([{ clubId: 7, name: '编程社' }])
  })

  it('sends multiline follow-ups with previous history and prevents duplicate submissions', async () => {
    useUserStore().addUserMessage('我想了解编程社')
    useUserStore().addAssistantMessage('编程社欢迎初学者')
    const wrapper = await render()
    await wrapper.get('textarea').setValue('  有什么要求？\n时间呢？  ')
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter', ctrlKey: true })
    await wrapper.get('form').trigger('submit')
    expect(streamChat).toHaveBeenCalledTimes(1)
    expect(streamChat).toHaveBeenCalledWith({ message: '有什么要求？\n时间呢？', history: [
      { role: 'user', content: '我想了解编程社' }, { role: 'assistant', content: '编程社欢迎初学者' },
    ] }, expect.any(Object), expect.any(AbortSignal))
    expect(useUserStore().chatHistory).toHaveLength(4)
    finish()
    await flushPromises()
  })

  it('keeps partial output and shows stopped status before allowing history to be cleared', async () => {
    const wrapper = await render()
    await button(wrapper, '有哪些技术类社团？').trigger('click')
    handlers.chunk?.({ text: '已经生成的内容' })
    await button(wrapper, '停止生成').trigger('click')
    await flushPromises()
    expect(signal?.aborted).toBe(true)
    expect(wrapper.get('article.assistant').text()).toContain('已经生成的内容')
    expect(wrapper.text()).toContain('已停止生成')
    expect(wrapper.text()).toContain('已连接')
    expect(wrapper.text()).not.toContain('重新连接')
    expect(button(wrapper, '停止生成').attributes('disabled')).toBeDefined()
    await button(wrapper, '清空对话').trigger('click')
    expect(useUserStore().chatHistory).toHaveLength(0)
    expect(button(wrapper, '清空对话').attributes('disabled')).toBeDefined()
  })

  it('keeps stream errors below the affected partial answer and retries the same question', async () => {
    const wrapper = await render()
    await button(wrapper, '有哪些技术类社团？').trigger('click')
    handlers.chunk?.({ text: '编程社适合你。' })
    fail(new Error('连接中断，请重试'))
    await flushPromises()
    expect(wrapper.get('article.assistant').text()).toContain('编程社适合你。')
    expect(wrapper.get('article.assistant [role="alert"]').text()).toContain('连接中断，请重试')
    expect(wrapper.get('article.assistant').text()).toContain('暂无资料来源')
    await button(wrapper, '重新提问').trigger('click')
    expect(useUserStore().chatHistory[2]?.content).toBe('有哪些技术类社团？')
    handlers.chunk?.({ text: '新的回答' })
    finish()
    await flushPromises()
    expect(wrapper.findAll('article.assistant')[1]?.text()).toContain('新的回答')
  })

  it('disables only sending when AI is unavailable, preserves drafts/history and reconnects', async () => {
    vi.mocked(apiClient.ai.health).mockResolvedValue({ healthy: false, provider: null })
    useUserStore().addUserMessage('已有问题')
    const wrapper = await render()
    expect(wrapper.text()).toContain('AI 暂不可用')
    await wrapper.get('textarea').setValue('保留我的草稿')
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(button(wrapper, '清空对话').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[role="log"]').text()).toContain('已有问题')
    vi.mocked(apiClient.ai.health).mockResolvedValue({ healthy: true, provider: { model: 'restored-model' } })
    await button(wrapper, '重新连接').trigger('click')
    await flushPromises()
    expect(wrapper.get('textarea').element.value).toBe('保留我的草稿')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('restored-model')
  })

  it('marks a failed stream transport offline and reconnects without losing partial content or the draft', async () => {
    const wrapper = await render()
    expect(wrapper.text()).toContain('已连接')
    await button(wrapper, '有哪些技术类社团？').trigger('click')
    handlers.chunk?.({ text: '编程社欢迎初学者。' })
    fail(new TypeError('Failed to fetch'))
    await flushPromises()

    expect(wrapper.text()).not.toContain('已连接')
    expect(wrapper.text()).toContain('服务未连接')
    expect(wrapper.get('article.assistant').text()).toContain('编程社欢迎初学者。')
    expect(wrapper.get('article.assistant [role="alert"]').text()).toContain('Failed to fetch')
    await wrapper.get('textarea').setValue('保留断线后的草稿')
    expect(wrapper.get('textarea').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    expect(button(wrapper, '重新提问').attributes('disabled')).toBeDefined()
    await wrapper.get('form').trigger('submit')
    expect(useUserStore().chatHistory).toHaveLength(2)

    await button(wrapper, '重新连接').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('已连接')
    expect(wrapper.get('textarea').element.value).toBe('保留断线后的草稿')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(button(wrapper, '重新提问').attributes('disabled')).toBeUndefined()
    expect(useUserStore().chatHistory[1]?.content).toBe('编程社欢迎初学者。')
  })

  it('aborts an active stream on unmount without losing the partial history', async () => {
    const wrapper = await render()
    await button(wrapper, '有哪些技术类社团？').trigger('click')
    handlers.chunk?.({ text: '保留这段回答' })
    wrapper.unmount()
    await flushPromises()
    expect(signal?.aborted).toBe(true)
    expect(useUserStore().chatHistory[1]?.content).toBe('保留这段回答')
  })
})
