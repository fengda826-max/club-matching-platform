// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import AppHeader from '../AppHeader.vue'

async function mountHeader(aiOnline?: boolean) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/clubs', '/matching', '/chat', '/admin'].map(path => ({
      path,
      component: { template: '<div />' },
    })),
  })
  await router.push('/')
  await router.isReady()
  return { router, wrapper: mount(AppHeader, { attachTo: document.body, props: aiOnline === undefined ? {} : { aiOnline }, global: { plugins: [router] } }) }
}

describe('AppHeader', () => {
  it('exposes all five destinations and toggles the mobile menu accessibly', async () => {
    const { wrapper } = await mountHeader()
    expect(wrapper.findAll('nav a').map(link => link.attributes('href')))
      .toEqual(['/', '/clubs', '/matching', '/chat', '/admin'])
    const toggle = wrapper.get('button[aria-controls="mobile-navigation"]')
    expect(toggle.attributes('aria-label')).toBeTruthy()
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('closes the menu after selecting a destination, including the current route', async () => {
    const { router, wrapper } = await mountHeader()
    const toggle = wrapper.get('button[aria-controls="mobile-navigation"]')
    await toggle.trigger('click')
    await wrapper.get('nav a[href="/"]').trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    await wrapper.get('nav a[href="/clubs"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/clubs')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('nav a[href="/clubs"]').attributes('aria-current')).toBe('page')
    wrapper.unmount()
  })

  it('closes the open menu with Escape and returns focus to its toggle', async () => {
    const { wrapper } = await mountHeader()
    const toggle = wrapper.get('button[aria-controls="mobile-navigation"]')
    await toggle.trigger('click')
    await wrapper.get('nav').trigger('keydown', { key: 'Escape' })
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle.element)
    wrapper.unmount()
  })

  it('does not claim AI is online without a supplied health result', async () => {
    const { wrapper } = await mountHeader()
    expect(wrapper.get('[role="status"]').text()).toBe('AI 状态未确认')
    await wrapper.setProps({ aiOnline: true })
    expect(wrapper.get('[role="status"]').text()).toBe('AI 在线')
    await wrapper.setProps({ aiOnline: false })
    expect(wrapper.get('[role="status"]').text()).toBe('AI 暂不可用')
    wrapper.unmount()
  })
})
