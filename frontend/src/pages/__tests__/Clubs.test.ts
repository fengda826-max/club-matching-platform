// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, type Club } from '@/api/client'
import Clubs from '../Clubs.vue'

const club: Club = {
  id: 41, name: '开源编程社', category: '技术', description: '一起学习编程和开源协作。',
  requirements: '欢迎初学者', memberCount: 32, contact: 'campus@example.test', tags: '编程,开源',
  activityTime: '周六下午', weeklyHours: 2, campus: '东校区', fee: 0,
  skillRequirement: 'beginner', isRecruiting: true,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
}
const wrappers: ReturnType<typeof mount>[] = []

async function renderClubs(path = '/clubs') {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/clubs', component: Clubs }] })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(Clubs, { attachTo: document.body, global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

describe('Clubs discovery', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(apiClient.clubs, 'getAll').mockResolvedValue([
      club,
      { ...club, id: 42, name: '算法研究社', description: '算法竞赛训练', tags: '算法', fee: 80, skillRequirement: 'advanced', isRecruiting: false },
      { ...club, id: 43, name: '摄影社', category: '艺术', description: '校园影像创作', tags: '摄影', campus: '西校区' },
    ])
    vi.spyOn(apiClient.clubs, 'getStatistics').mockResolvedValue({ totalClubs: 3, totalMembers: 96, categories: [] })
    vi.spyOn(apiClient.intents, 'record').mockResolvedValue({ created: true })
  })
  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    vi.restoreAllMocks()
  })

  it('labels keyword search and announces the active query and result count', async () => {
    const wrapper = await renderClubs()
    const search = wrapper.get('input[type="search"]')
    expect(search.attributes('aria-label')).toBe('搜索社团')
    await search.setValue('编程')
    expect(wrapper.get('[aria-live="polite"]').text()).toContain('编程')
    expect(wrapper.get('[aria-live="polite"]').text()).toContain('1 个结果')
    expect(wrapper.findAll('article')).toHaveLength(1)
  })

  it('combines category and tags and clears only the category with 全部', async () => {
    const wrapper = await renderClubs()
    await wrapper.get('button[aria-label="分类：技术"]').trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(2)
    await wrapper.get('button[aria-label="标签：开源"]').trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(1)
    expect(wrapper.get('[aria-live="polite"]').text()).toContain('技术')
    expect(wrapper.get('[aria-live="polite"]').text()).toContain('开源')
    expect(wrapper.get('button[aria-label="标签：开源"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('button[aria-label="分类：全部"]').trigger('click')
    expect(wrapper.get('button[aria-label="标签：开源"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('button[aria-label="标签：开源"]').trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(3)
  })

  it('preserves incoming keyword and category and clears an empty result', async () => {
    const wrapper = await renderClubs('/clubs?search=编程&category=艺术')
    expect(wrapper.get<HTMLInputElement>('input[type="search"]').element.value).toBe('编程')
    expect(wrapper.get('[aria-live="polite"]').text()).toContain('艺术')
    const empty = wrapper.get('.empty-state')
    expect(empty.text()).toContain('没有找到')
    await empty.get('button').trigger('click')
    expect(wrapper.findAll('article')).toHaveLength(3)
    expect(wrapper.get<HTMLInputElement>('input[type="search"]').element.value).toBe('')
  })

  it('exposes a collapsible filter panel with an accurate expanded state', async () => {
    const wrapper = await renderClubs()
    const toggle = wrapper.get('button[aria-controls="club-filters"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })

  it('shows decision facts, recruitment status and exactly one action per card', async () => {
    const wrapper = await renderClubs()
    const cards = wrapper.findAll('article')
    expect(cards[0]!.get('dl').text()).toContain('周六下午')
    expect(cards[0]!.get('dl').text()).toContain('东校区')
    expect(cards[0]!.get('dl').text()).toContain('免费')
    expect(cards[0]!.get('dl').text()).toContain('零基础可加入')
    expect(cards[0]!.text()).toContain('招募中')
    expect(cards[1]!.text()).toContain('暂停招新')
    expect(cards[1]!.get('dl').text()).toContain('80 元')
    for (const card of cards) {
      expect(card.findAll('button')).toHaveLength(1)
      expect(card.get('button').text()).toBe('查看详情')
      expect(card.text()).not.toContain('campus@example.test')
    }
  })

  it('opens a named dialog with contact details, traps focus and restores it on Escape', async () => {
    const wrapper = await renderClubs()
    const trigger = wrapper.get('article button')
    ;(trigger.element as HTMLButtonElement).focus()
    await trigger.trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('开源编程社')
    expect(dialog.text()).toContain('campus@example.test')
    expect(dialog.text()).toContain('欢迎初学者')
    const close = dialog.get('button[aria-label="关闭社团详情"]')
    expect(document.activeElement).toBe(close.element)
    await close.trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement?.textContent).toContain('记录加入意向')
    await dialog.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })

  it('keeps intent recording available only for recruiting clubs', async () => {
    const wrapper = await renderClubs()
    await wrapper.findAll('article')[1]!.get('button').trigger('click')
    expect(wrapper.get('[role="dialog"] button:disabled').text()).toBe('暂停招新')
    await wrapper.get('button[aria-label="关闭社团详情"]').trigger('click')
    await wrapper.get('article button').trigger('click')
    const intent = wrapper.get('[role="dialog"] .intent-button')
    await intent.trigger('click')
    await flushPromises()
    expect(apiClient.intents.record).toHaveBeenCalledWith({ clubId: 41, source: 'browsing' })
    expect(wrapper.get('[role="dialog"]').text()).toContain('意向已记录')
  })

  it('offers a retry after a failed club request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(apiClient.clubs.getAll).mockRejectedValueOnce(new Error('offline'))
    const wrapper = await renderClubs()
    expect(wrapper.get('[role="alert"]').text()).toContain('暂时无法加载')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('article')).toHaveLength(3)
  })

  it('keeps pending intent state with its club when switching detail dialogs', async () => {
    let resolveFirst!: (value: { created: boolean }) => void
    let resolveSecond!: (value: { created: boolean }) => void
    vi.mocked(apiClient.intents.record)
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve }))
    const wrapper = await renderClubs()
    await wrapper.get('article button').trigger('click')
    await wrapper.get('.intent-button').trigger('click')
    expect(wrapper.get('.intent-button').text()).toBe('正在记录…')
    await wrapper.get('button[aria-label="关闭社团详情"]').trigger('click')
    await wrapper.findAll('article')[2]!.get('button').trigger('click')
    expect(wrapper.get('.intent-button').text()).toBe('记录加入意向')
    await wrapper.get('.intent-button').trigger('click')
    expect(apiClient.intents.record).toHaveBeenNthCalledWith(2, { clubId: 43, source: 'browsing' })
    resolveFirst({ created: true })
    await flushPromises()
    expect(wrapper.get('.intent-button').text()).toBe('正在记录…')
    expect(wrapper.get('[role="dialog"]').text()).not.toContain('意向已记录')
    await wrapper.get('.intent-button').trigger('click')
    expect(apiClient.intents.record).toHaveBeenCalledTimes(2)
    resolveSecond({ created: true })
    await flushPromises()
    expect(wrapper.get('[role="dialog"]').text()).toContain('意向已记录')
    expect(wrapper.get('.intent-button').text()).toBe('记录加入意向')
  })
})
