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
})
