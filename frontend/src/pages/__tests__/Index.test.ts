// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, type Club } from '@/api/client'
import { convertClub, useClubsStore } from '@/stores/clubs'
import Index from '../Index.vue'

const club: Club = {
  id: 41, name: '校园开源实验社', category: '技术', description: '一起从小项目开始学习编程。',
  requirements: '欢迎初学者', memberCount: 32, contact: 'campus@example.test', tags: '编程,开源',
  activityTime: '周六下午', weeklyHours: 2, campus: '东校区', fee: 0,
  skillRequirement: 'beginner', isRecruiting: true,
  createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
}
const statistics = { totalClubs: 17, totalMembers: 1234, categories: [{ category: '技术', count: 17 }] }
const wrappers: ReturnType<typeof mount>[] = []

async function renderHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Index },
      ...['clubs', 'matching', 'chat'].map(name => ({ path: `/${name}`, name, component: { template: '<div />' } })),
    ],
  })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(Index, { global: { plugins: [router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router }
}

describe('Index page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(apiClient.clubs, 'getAll').mockResolvedValue([
      club, { ...club, id: 42, name: '暂停招募的社团', memberCount: 200, isRecruiting: false },
    ])
    vi.spyOn(apiClient.clubs, 'getStatistics').mockResolvedValue(statistics)
  })
  afterEach(() => {
    wrappers.splice(0).forEach(wrapper => wrapper.unmount())
    vi.restoreAllMocks()
  })

  it('sends the trimmed written requirement to the matching route', async () => {
    const { wrapper, router } = await renderHome()
    await wrapper.get('textarea[name="requirement"]').setValue('  周末有空，零基础，想学编程  ')
    await wrapper.get('form[aria-label="描述匹配需求"]').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/matching')
    expect(router.currentRoute.value.query).toEqual({ need: '周末有空，零基础，想学编程' })
  })

  it('opens matching without a need query when the requirement is blank', async () => {
    const { wrapper, router } = await renderHome()
    await wrapper.get('textarea[name="requirement"]').setValue('   ')
    await wrapper.get('form[aria-label="描述匹配需求"]').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/matching')
    expect(router.currentRoute.value.query).toEqual({})
  })

  it('preserves keyword search navigation to club discovery', async () => {
    const { wrapper, router } = await renderHome()
    await wrapper.get('input[type="search"]').setValue('开源')
    await wrapper.get('form[aria-label="搜索社团"]').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/clubs')
    expect(router.currentRoute.value.query.search).toBe('开源')
  })

  it.each(['/matching', '/chat', '/clubs'])('keeps the %s CTA reachable', async path => {
    const { wrapper, router } = await renderHome()
    await wrapper.get(`a[href="${path}"]`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(path)
  })

  it('shows fetched statistics and recruiting clubs even below the featured member threshold', async () => {
    const { wrapper } = await renderHome()
    const stats = wrapper.get('[aria-label="社团数据"]')
    expect(stats.text()).toContain('17')
    expect(stats.text()).toContain('1234')
    expect(stats.text()).toContain('1')
    const recruiting = wrapper.get('[aria-labelledby="recruiting-heading"]')
    expect(recruiting.text()).toContain('校园开源实验社')
    expect(recruiting.text()).toContain('周六下午')
    expect(recruiting.text()).toContain('东校区')
    expect(recruiting.text()).not.toContain('暂停招募的社团')
    expect(wrapper.findAll('h1')).toHaveLength(1)
  })

  it('loads statistics even when club data is already cached', async () => {
    useClubsStore().clubs = [convertClub(club)]
    const { wrapper } = await renderHome()
    expect(wrapper.get('[aria-label="社团数据"]').text()).toContain('1234')
  })

  it('offers a retry when loading the club list fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(apiClient.clubs.getAll).mockRejectedValueOnce(new Error('offline'))
    const { wrapper } = await renderHome()
    expect(wrapper.get('[role="alert"]').text()).toContain('社团数据暂时无法加载')
    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[aria-labelledby="recruiting-heading"]').text()).toContain('校园开源实验社')
  })
})
