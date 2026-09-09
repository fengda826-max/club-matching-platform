import type { Club } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { RuleMatchingService } from '../RuleMatchingService'
import type { UserPreference } from '../../schemas/matching'

const service = new RuleMatchingService()

const preference: UserPreference = {
  interests: ['编程', '开发'],
  goals: ['竞赛', '团队'],
  skillLevel: 'beginner',
  availableTimes: ['周六'],
  campus: '南校区',
  maxWeeklyHours: 4,
  maxFee: 0,
}

const club: Club = {
  id: 1,
  name: '编程俱乐部',
  category: '技术',
  description: '通过团队项目和竞赛学习开发。',
  requirements: '无需基础',
  memberCount: 100,
  contact: 'club@example.com',
  tags: '编程,开发,竞赛,团队',
  activityTime: '周六 14:00-16:00',
  weeklyHours: 4,
  campus: '南校区',
  fee: 0,
  skillRequirement: 'beginner',
  isRecruiting: true,
  createdAt: new Date('2026-09-08T00:00:00.000Z'),
  updatedAt: new Date('2026-09-08T00:00:00.000Z'),
}

describe('RuleMatchingService', () => {
  it('scores a complete match as 100 with an explainable breakdown', () => {
    expect(service.match(preference, [club])).toEqual([expect.objectContaining({
      clubId: 1,
      score: 100,
      dimensions: { interest: 40, goal: 25, schedule: 20, skill: 15 },
      evidence: expect.arrayContaining(['兴趣：编程、开发', '时间：周六 14:00-16:00']),
    })])
  })

  it('excludes a club above the maximum fee', () => {
    expect(service.match(preference, [{ ...club, fee: 50 }])).toEqual([])
  })

  it('excludes a club outside the weekly time budget', () => {
    expect(service.match(preference, [{ ...club, weeklyHours: 5 }])).toEqual([])
  })

  it('excludes a club with a higher skill requirement', () => {
    expect(service.match(preference, [{ ...club, skillRequirement: 'intermediate' }])).toEqual([])
  })

  it('excludes closed recruitment and incompatible campus or time', () => {
    expect(service.match(preference, [{ ...club, isRecruiting: false }])).toEqual([])
    expect(service.match(preference, [{ ...club, campus: '北校区' }])).toEqual([])
    expect(service.match(preference, [{ ...club, activityTime: '周三 19:00-21:00' }])).toEqual([])
  })

  it('sorts score ties by club id for stable output', () => {
    const second = { ...club, id: 2 }
    expect(service.match(preference, [second, club]).map(item => item.clubId)).toEqual([1, 2])
  })

  it('uses neutral schedule points when no availability is supplied', () => {
    const openPreference = { ...preference, availableTimes: [], campus: undefined, maxWeeklyHours: undefined, maxFee: undefined }
    expect(service.match(openPreference, [club])[0].dimensions.schedule).toBe(10)
  })

  it('treats the weekend preference as either Saturday or Sunday', () => {
    const weekendPreference = { ...preference, availableTimes: ['周末'] }
    expect(service.match(weekendPreference, [club])).toHaveLength(1)
    expect(service.match(weekendPreference, [{ ...club, activityTime: '周日 09:00-11:00' }])).toHaveLength(1)
    expect(service.match(weekendPreference, [{ ...club, activityTime: '周三 19:00-21:00' }])).toEqual([])
  })
})
