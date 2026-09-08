import { z } from 'zod'
import { skillLevelSchema } from './club'

const preferenceList = z.array(z.string().trim().min(1).max(30))
  .max(10)
  .transform(values => Array.from(new Set(values)))

export const userPreferenceSchema = z.object({
  interests: preferenceList.default([]),
  goals: preferenceList.default([]),
  skillLevel: skillLevelSchema.default('beginner'),
  availableTimes: preferenceList.default([]),
  campus: z.string().trim().min(1).max(100).optional(),
  maxWeeklyHours: z.number().int().nonnegative().max(168).optional(),
  maxFee: z.number().int().nonnegative().max(100000).optional(),
}).strict()

export type UserPreference = z.infer<typeof userPreferenceSchema>

export type ScoreDimensions = {
  interest: number
  goal: number
  schedule: number
  skill: number
}

export type RuleMatch = {
  clubId: number
  score: number
  dimensions: ScoreDimensions
  evidence: string[]
  caveats: string[]
}
