import { describe, expect, it } from 'vitest'
import { userPreferenceSchema } from '../matching'

describe('userPreferenceSchema', () => {
  it('normalizes duplicate and padded preference values', () => {
    expect(userPreferenceSchema.parse({
      interests: [' 编程 ', '编程'],
      goals: ['竞赛'],
      skillLevel: 'beginner',
      availableTimes: ['周六'],
    })).toMatchObject({ interests: ['编程'], goals: ['竞赛'] })
  })

  it('rejects more than ten values and negative budgets', () => {
    expect(userPreferenceSchema.safeParse({
      interests: Array.from({ length: 11 }, (_, index) => `兴趣${index}`),
      goals: [],
      skillLevel: 'beginner',
      availableTimes: [],
    }).success).toBe(false)
    expect(userPreferenceSchema.safeParse({
      interests: [], goals: [], skillLevel: 'beginner', availableTimes: [], maxFee: -1,
    }).success).toBe(false)
  })
})
