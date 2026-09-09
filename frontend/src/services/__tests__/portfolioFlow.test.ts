import { describe, expect, it } from 'vitest'
import { convertClub } from '../../stores/clubs'

describe('portfolio flow contracts', () => {
  it('keeps numeric ids and converts operational club fields without ambiguity', () => {
    const club = convertClub({
      id: 7, name: 'AI 社', category: '技术', description: '学习模型应用', requirements: '零基础可加入',
      memberCount: 30, contact: 'demo', tags: 'AI,云计算', activityTime: '周六下午', weeklyHours: 3,
      campus: '主校区', fee: 20, skillRequirement: 'beginner', isRecruiting: true,
      createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z',
    })
    expect(club).toMatchObject({ id: 7, tags: ['AI', '云计算'], weeklyHours: 3, fee: 20, isRecruiting: true })
    expect(typeof club.id).toBe('number')
  })
})
