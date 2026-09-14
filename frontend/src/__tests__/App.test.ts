// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/api/client'
import App from '../App.vue'

async function renderApp() {
  const router = createRouter({ history: createMemoryHistory(), routes: ['/', '/matching', '/clubs', '/chat', '/admin'].map(path => ({ path, component: { template: '<div>Page</div>' } })) })
  await router.push('/')
  await router.isReady()
  return mount(App, { global: { plugins: [router] } })
}

describe('App AI status', () => {
  afterEach(() => vi.restoreAllMocks())

  it('keeps health unconfirmed until the request resolves, then shows the actual online state', async () => {
    let resolveHealth!: (value: { healthy: boolean, provider: unknown }) => void
    vi.spyOn(apiClient.ai, 'health').mockReturnValue(new Promise(resolve => { resolveHealth = resolve }))
    const wrapper = await renderApp()
    expect(wrapper.get('.app-header [role="status"]').text()).toBe('AI 状态未确认')
    expect(apiClient.ai.health).toHaveBeenCalledOnce()
    resolveHealth({ healthy: true, provider: {} })
    await flushPromises()
    expect(wrapper.get('.app-header [role="status"]').text()).toBe('AI 在线')
    wrapper.unmount()
  })

  it.each([false, 'offline'])('shows an unavailable status when health is %s', async health => {
    const request = vi.spyOn(apiClient.ai, 'health')
    if (health === false) request.mockResolvedValue({ healthy: false, provider: {} })
    else request.mockRejectedValue(new Error('offline'))
    const wrapper = await renderApp()
    await flushPromises()
    expect(wrapper.get('.app-header [role="status"]').text()).toBe('AI 暂不可用')
    wrapper.unmount()
  })
})
