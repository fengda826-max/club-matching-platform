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
})
