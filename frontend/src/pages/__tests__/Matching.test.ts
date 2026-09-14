// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import Matching from '../Matching.vue'

const wrappers: ReturnType<typeof mount>[] = []
async function render(query: Record<string, string | (string | null)[]> = {}) {
  const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/matching', component: Matching }] })
  await router.push({ path: '/matching', query })
  await router.isReady()
  const wrapper = mount(Matching, { global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe('Matching workspace', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.spyOn(apiClient.ai, 'health').mockResolvedValue({ healthy: false, provider: null })
    vi.spyOn(apiClient.matching, 'recommend').mockResolvedValue({ mode: 'rules-only', warning: '模型不可用，已使用规则结果', matches: [] })
  })
  afterEach(() => { wrappers.splice(0).forEach(w => w.unmount()); vi.restoreAllMocks() })

  it('consumes the first string need once, trims it, and preserves later edits', async () => {
    const { wrapper, router } = await render({ need: [null, '  想学习编程  ', '摄影'] })
    expect(wrapper.get('textarea').element.value).toBe('想学习编程')
    await wrapper.get('textarea').setValue('我的新需求')
    await router.replace({ query: { need: '不要覆盖' } })
    expect(wrapper.get('textarea').element.value).toBe('我的新需求')
  })

  it('allows manual matching while AI is unavailable and visibly labels fallback', async () => {
    const { wrapper } = await render()
    await wrapper.get('input[name="interests"]').setValue('编程、摄影')
    await wrapper.get('form[aria-label="确认匹配条件"]').trigger('submit')
    await flushPromises()
    expect(apiClient.matching.recommend).toHaveBeenCalledWith({ interests: ['编程', '摄影'], goals: [], availableTimes: [], skillLevel: 'beginner' })
    expect(wrapper.get('[aria-labelledby="results-heading"]').text()).toContain('已降级为规则结果')
    expect(wrapper.get('[aria-labelledby="results-heading"]').text()).toContain('没有社团满足全部条件')
    expect(wrapper.get('[aria-labelledby="results-heading"]').text()).not.toContain('规则评分 + AI 解释')
  })

  it('keeps an extraction failure visible and the original text editable', async () => {
    vi.mocked(apiClient.ai.health).mockResolvedValue({ healthy: true, provider: null })
    vi.spyOn(apiClient.matching, 'extractPreferences').mockRejectedValue(new Error('internal provider failure'))
    const { wrapper } = await render({ need: '我喜欢摄影' })
    await wrapper.get('[data-action="extract"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-status="extraction"]').text()).toContain('请直接填写条件')
    expect(wrapper.text()).not.toContain('internal provider failure')
    expect(wrapper.get('textarea').element.value).toBe('我喜欢摄影')
  })

  it.each([
    ['input[name="availableTimes"]', '周末'],
    ['input[name="campus"]', '东校区'],
    ['input[name="maxWeeklyHours"]', '4'],
    ['input[name="maxFee"]', '0'],
    ['select', 'intermediate'],
  ])('moves to condition review when only %s changes', async (selector, value) => {
    const { wrapper } = await render()
    await wrapper.get(selector).setValue(value)
    expect(wrapper.get('[aria-current="step"]').text()).toContain('确认条件')
  })

  it('keeps a successful intent completed when the page is remounted after refresh', async () => {
    vi.mocked(apiClient.matching.recommend).mockResolvedValue({ mode: 'rules-only', matches: [{
      clubId: 1, score: 75, dimensions: { interest: 40, goal: 0, schedule: 20, skill: 15 },
      evidence: ['兴趣：编程'], caveats: ['每周需要 3 小时'], reason: '适合编程初学者',
      club: { id: 1, name: '编程俱乐部', category: '技术', description: '', requirements: '', memberCount: 128,
        contact: 'club@example.test', tags: '编程', activityTime: '周六', weeklyHours: 3, campus: '南校区',
        fee: 0, skillRequirement: 'beginner', isRecruiting: true, createdAt: '', updatedAt: '' },
    }] })
    vi.spyOn(apiClient.intents, 'record').mockResolvedValue({ created: true })
    const first = await render()
    await first.wrapper.get('form').trigger('submit')
    await flushPromises()
    await first.wrapper.get('.match-card button').trigger('click')
    await flushPromises()
    expect(first.wrapper.get('.match-card button').text()).toBe('已登记意向')
    first.wrapper.unmount()
    const refreshed = await render()
    await refreshed.wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(refreshed.wrapper.get('.match-card button').text()).toBe('已登记意向')
    expect(refreshed.wrapper.get('.match-card button').attributes('disabled')).toBeDefined()
  })
})
