import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, type Club } from '../client'

const club: Club = {
  id: 17,
  name: '编程俱乐部',
  category: '技术',
  description: '面向所有编程爱好者。',
  requirements: '无需基础',
  memberCount: 128,
  contact: 'club@example.com',
  tags: '编程,开发',
  activityTime: '周末',
  weeklyHours: 2,
  campus: '全校区',
  fee: 0,
  skillRequirement: 'beginner',
  isRecruiting: true,
  createdAt: '2026-09-08T00:00:00.000Z',
  updatedAt: '2026-09-08T00:00:00.000Z',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiClient club mutations', () => {
  it('unwraps suggested tags from the backend response for form consumers', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { tags: ['编程', '合作'] } }))
    vi.stubGlobal('fetch', fetchSpy)

    await expect(apiClient.ai.suggestTags('编程社', '技术', '一起学习')).resolves.toEqual(['编程', '合作'])
    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/api\/ai\/suggest-tags$/)
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify({ name: '编程社', category: '技术', description: '一起学习' }) })
  })

  it('preserves tag-generation API errors instead of returning tags', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: false, error: 'AI_UNAVAILABLE', message: '标签生成暂不可用' }, 503)))
    await expect(apiClient.ai.suggestTags('编程社', '技术', '一起学习')).rejects.toMatchObject({ status: 503, code: 'AI_UNAVAILABLE', message: '标签生成暂不可用' })
  })

  it('uses PUT when updating a club', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: club }))
    vi.stubGlobal('fetch', fetchSpy)

    await apiClient.clubs.update(17, { name: '新名称' })

    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/api\/clubs\/17$/)
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: 'PUT' })
  })

  it('uses DELETE when deleting a club', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: club }))
    vi.stubGlobal('fetch', fetchSpy)

    await apiClient.clubs.delete(17)

    expect(fetchSpy).toHaveBeenCalledOnce()
    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/api\/clubs\/17$/)
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: 'DELETE' })
  })

  it('surfaces a backend error from a non-success response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      success: false,
      error: 'Club not found',
    }, 404)))

    await expect(apiClient.clubs.getById(999)).rejects.toThrow('Club not found')
  })

  it('uses the hybrid recommendation endpoint', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { mode: 'rules-only', matches: [] } }))
    vi.stubGlobal('fetch', fetchSpy)
    await apiClient.matching.recommend({ interests: ['编程'], goals: [], skillLevel: 'beginner', availableTimes: [] })
    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/api\/matching\/recommend$/)
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({ method: 'POST' })
  })

  it('records a browsing intent', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { created: true } }))
    vi.stubGlobal('fetch', fetchSpy)
    await apiClient.intents.record({ clubId: 2, source: 'browsing' })
    expect(fetchSpy.mock.calls[0][0]).toMatch(/\/api\/intents$/)
  })
})
