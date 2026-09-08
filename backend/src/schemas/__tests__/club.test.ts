import { describe, expect, it } from 'vitest'
import { clubCreateSchema, clubIdSchema, clubUpdateSchema } from '../club'

const validClub = {
  name: '编程俱乐部',
  category: '技术',
  description: '面向所有学生的编程学习与实践社团。',
  requirements: '无需基础',
  memberCount: 128,
  contact: 'club@example.com',
  tags: '编程,开发',
  activityTime: '周六 14:00-16:00',
  weeklyHours: 2,
  campus: '南校区',
  fee: 0,
  skillRequirement: 'beginner',
  isRecruiting: true,
}

describe('club schemas', () => {
  it('accepts a complete valid club', () => {
    expect(clubCreateSchema.parse(validClub)).toEqual(validClub)
  })

  it('rejects negative operational values', () => {
    const result = clubCreateSchema.safeParse({ ...validClub, fee: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown skill requirement', () => {
    const result = clubCreateSchema.safeParse({ ...validClub, skillRequirement: 'guru' })
    expect(result.success).toBe(false)
  })

  it('allows a partial update but rejects unknown fields', () => {
    expect(clubUpdateSchema.parse({ name: '新名称' })).toEqual({ name: '新名称' })
    expect(clubUpdateSchema.safeParse({ ownerPassword: 'secret' }).success).toBe(false)
  })

  it('coerces a positive numeric route id', () => {
    expect(clubIdSchema.parse('17')).toBe(17)
    expect(clubIdSchema.safeParse('not-a-number').success).toBe(false)
  })
})
