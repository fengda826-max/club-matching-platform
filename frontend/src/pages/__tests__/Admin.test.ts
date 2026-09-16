// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient, ApiClientError, type AnalyticsSummary, type Club } from '@/api/client'
import Admin from '../Admin.vue'

const summary: AnalyticsSummary = {
  business: { clubCount: 1, recommendationCount: 20, intentCount: 6, conversionRate: 30, topCategories: [] },
  ai: { requestCount: 10, successRate: 80, averageDurationMs: 1200, validationFailures: 1, fallbackCount: 2, inputTokens: 100, outputTokens: 40 },
}
const club: Club = { id: 7, name: '编程社', category: '技术', description: '一起学习编程', requirements: '零基础可加入', memberCount: 20, contact: '社团办公室', tags: '编程,学习', activityTime: '周末', weeklyHours: 2, campus: '全校区', fee: 0, skillRequirement: 'beginner', isRecruiting: true, createdAt: '', updatedAt: '' }
const wrappers: ReturnType<typeof mount>[] = []
async function render() {
  const wrapper = mount(Admin, { attachTo: document.body })
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}
function button(wrapper: ReturnType<typeof mount>, text: string) {
  const found = wrapper.findAll('button').find(item => item.text() === text)
  if (!found) throw new Error(`Missing button: ${text}`)
  return found
}

describe('Operations dashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(apiClient.auth, 'status').mockResolvedValue({ authenticated: false })
    vi.spyOn(apiClient.auth, 'login').mockResolvedValue({ authenticated: true })
    vi.spyOn(apiClient.auth, 'logout').mockResolvedValue({ authenticated: false })
    vi.spyOn(apiClient.analytics, 'summary').mockResolvedValue(summary)
    vi.spyOn(apiClient.clubs, 'getAll').mockResolvedValue([club])
  })
  afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks(); document.body.innerHTML = '' })

  it('labels the table and refreshes actual displayed metrics', async () => {
    const wrapper = await render()
    expect(wrapper.get('caption').text()).toBe('社团运营列表')
    expect(wrapper.findAll('thead th[scope="col"]')).toHaveLength(5)
    expect(wrapper.get('tbody').text()).toContain('招募中')
    vi.mocked(apiClient.analytics.summary).mockResolvedValue({ ...summary, business: { ...summary.business, intentCount: 9 } })
    await button(wrapper, '刷新数据').trigger('click')
    await flushPromises()
    expect(wrapper.get('dl[aria-label="业务指标"]').text()).toContain('9')
  })

  it('focuses and traps login, blocks duplicate login and Escape while pending, retains a failed password', async () => {
    let reject!: (error: Error) => void
    vi.mocked(apiClient.auth.login).mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    const wrapper = await render()
    const trigger = button(wrapper, '管理登录')
    trigger.element.focus()
    await trigger.trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('管理登录')
    const input = dialog.get<HTMLInputElement>('input[type="password"]')
    expect(wrapper.get(`label[for="${input.attributes('id')}"]`).text()).toBe('管理密码')
    expect(document.activeElement).toBe(input.element)
    const last = dialog.get<HTMLButtonElement>('button[type="submit"]')
    last.element.focus()
    await last.trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(input.element)
    await input.setValue('retain-this-password')
    await dialog.trigger('submit')
    await dialog.trigger('submit')
    expect(apiClient.auth.login).toHaveBeenCalledTimes(1)
    expect(last.attributes('disabled')).toBeDefined()
    await dialog.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    reject(new Error('密码不正确，请重试'))
    await flushPromises()
    expect(input.element.value).toBe('retain-this-password')
    expect(dialog.get('[role="alert"]').text()).toContain('密码不正确')
    await dialog.trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })

  it('moves focus off the disabled login submit and contains Tab in both directions while login is pending', async () => {
    let reject!: (error: Error) => void
    vi.mocked(apiClient.auth.login).mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    const wrapper = await render()
    await button(wrapper, '管理登录').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]')
    const input = dialog.get<HTMLInputElement>('input[type="password"]')
    const submit = dialog.get<HTMLButtonElement>('button[type="submit"]')
    await input.setValue('pending-login-password')
    submit.element.focus()
    expect(document.activeElement).toBe(submit.element)
    await dialog.trigger('submit')
    await flushPromises()
    expect(submit.element.disabled).toBe(true)
    expect(document.activeElement).toBe(input.element)
    expect(dialog.element.contains(document.activeElement)).toBe(true)
    for (const shiftKey of [false, true]) {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })
      document.activeElement!.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(input.element)
    }
    reject(new Error('请重试'))
    await flushPromises()
    expect(input.element.value).toBe('pending-login-password')
    expect(submit.element.disabled).toBe(false)
    expect(dialog.get('[role="alert"]').text()).toBe('请重试')
  })

  it('logs in and logs out through the existing session API', async () => {
    const wrapper = await render()
    await button(wrapper, '管理登录').trigger('click')
    await wrapper.get('input[type="password"]').setValue('test')
    await wrapper.get('[role="dialog"]').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('管理会话已登录')
    await button(wrapper, '退出登录').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('管理登录')
    expect(wrapper.text()).not.toContain('管理会话已登录')
  })

  it('retains edit values after a failed save and disables submit and close while saving', async () => {
    let reject!: (error: Error) => void
    vi.spyOn(apiClient.clubs, 'update').mockImplementation(() => new Promise((_resolve, fail) => { reject = fail }))
    const wrapper = await render()
    await button(wrapper, '编辑').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]')
    const name = dialog.get<HTMLInputElement>('#club-name')
    expect(document.activeElement).toBe(name.element)
    await name.setValue('编程社新名称')
    await dialog.trigger('submit')
    await dialog.trigger('submit')
    expect(apiClient.clubs.update).toHaveBeenCalledTimes(1)
    expect(dialog.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await dialog.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    reject(new Error('保存失败，请重试'))
    await flushPromises()
    expect(name.element.value).toBe('编程社新名称')
    expect(dialog.get('[role="alert"]').text()).toContain('保存失败')
    expect(dialog.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('shows inline field errors and applies generated description and suggested tags before create', async () => {
    vi.spyOn(apiClient.ai, 'generateDescription').mockResolvedValue({ description: 'AI 草稿，可编辑' })
    const suggestedTags: Awaited<ReturnType<typeof apiClient.ai.suggestTags>> = ['编程', '合作']
    vi.spyOn(apiClient.ai, 'suggestTags').mockResolvedValue(suggestedTags)
    vi.spyOn(apiClient.clubs, 'create').mockResolvedValue({ ...club, id: 8, name: '新社团', description: 'AI 草稿，可编辑', tags: '编程,合作' })
    const wrapper = await render()
    await button(wrapper, '新增社团').trigger('click')
    await wrapper.get('[role="dialog"]').trigger('submit')
    expect(wrapper.get('#club-name').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('#name-error').text()).toContain('名称')
    await wrapper.get('#club-name').setValue('新社团')
    await button(wrapper, 'AI 生成描述').trigger('click')
    await flushPromises()
    expect(wrapper.get<HTMLTextAreaElement>('#club-description').element.value).toBe('AI 草稿，可编辑')
    await button(wrapper, 'AI 推荐标签').trigger('click')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#club-tags').element.value).toBe('编程、合作')
    await wrapper.get('[role="dialog"]').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(apiClient.clubs.create).toHaveBeenCalledWith(expect.objectContaining({ name: '新社团', tags: '编程,合作', description: 'AI 草稿，可编辑' }))
  })

  it('preserves tag drafts and enables retry after a tag-generation error', async () => {
    vi.spyOn(apiClient.ai, 'suggestTags').mockRejectedValueOnce(new ApiClientError(503, 'AI_UNAVAILABLE', '标签生成暂不可用')).mockResolvedValue(['编程', '合作'])
    const wrapper = await render()
    await button(wrapper, '编辑').trigger('click')
    await wrapper.get('#club-tags').setValue('手动标签')
    await button(wrapper, 'AI 推荐标签').trigger('click')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#club-tags').element.value).toBe('手动标签')
    expect(wrapper.get('[role="dialog"] [role="alert"]').text()).toBe('标签生成暂不可用')
    expect(button(wrapper, 'AI 推荐标签').attributes('disabled')).toBeUndefined()
    await button(wrapper, 'AI 推荐标签').trigger('click')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#club-tags').element.value).toBe('编程、合作')
    expect(wrapper.find('[role="dialog"] [role="alert"]').exists()).toBe(false)
  })

  it('prompts for expired authentication above the preserved edit and returns focus after login', async () => {
    vi.spyOn(apiClient.clubs, 'update').mockRejectedValue(new ApiClientError(401, 'UNAUTHORIZED', '会话已过期'))
    const wrapper = await render()
    await button(wrapper, '编辑').trigger('click')
    await wrapper.get('#club-name').setValue('未保存的名称')
    await wrapper.get('[role="dialog"]').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('[role="dialog"]')).toHaveLength(1)
    await wrapper.get('input[type="password"]').setValue('test')
    await wrapper.get('[role="dialog"]').trigger('submit')
    await flushPromises()
    expect(wrapper.get<HTMLInputElement>('#club-name').element.value).toBe('未保存的名称')
    expect(wrapper.get('[role="dialog"]').text()).toContain('编辑社团')
    expect(wrapper.get('[role="dialog"]').element.contains(document.activeElement)).toBe(true)
  })

  it('keeps keyboard focus inside the form when every field is disabled during a request', async () => {
    let resolve!: (value: { description: string }) => void
    vi.spyOn(apiClient.ai, 'generateDescription').mockImplementation(() => new Promise(done => { resolve = done }))
    const wrapper = await render()
    await button(wrapper, '编辑').trigger('click')
    await button(wrapper, 'AI 生成描述').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]')
    expect(document.activeElement).toBe(dialog.element)
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    dialog.element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    resolve({ description: '生成后的草稿' })
    await flushPromises()
    expect(wrapper.get<HTMLTextAreaElement>('#club-description').element.value).toBe('生成后的草稿')
  })

  it('requires the real delete confirmation and supports cancellation without deleting', async () => {
    vi.spyOn(apiClient.clubs, 'delete').mockResolvedValue(club)
    const wrapper = await render()
    await button(wrapper, '删除').trigger('click')
    await flushPromises()
    const cancel = [...document.querySelectorAll<HTMLButtonElement>('.el-message-box button')].find(item => item.textContent === '取消')
    expect(cancel).toBeDefined()
    cancel!.click()
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('编程社')
    expect(apiClient.clubs.delete).not.toHaveBeenCalled()
    await button(wrapper, '删除').trigger('click')
    await flushPromises()
    vi.mocked(apiClient.clubs.getAll).mockResolvedValue([])
    const confirm = [...document.querySelectorAll<HTMLButtonElement>('.el-message-box button')].filter(item => item.textContent === '确认删除').at(-1)
    expect(confirm).toBeDefined()
    confirm!.click()
    await flushPromises()
    expect(wrapper.text()).toContain('暂无社团资料')
    expect(apiClient.clubs.delete).toHaveBeenCalledWith(7)
  })
})
