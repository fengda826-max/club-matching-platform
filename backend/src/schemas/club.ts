import { z } from 'zod'

export const skillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert'])

const clubFields = z.object({
  name: z.string().trim().min(2).max(50),
  category: z.string().trim().min(1).max(30),
  description: z.string().trim().min(10).max(1000),
  requirements: z.string().trim().min(1).max(500),
  memberCount: z.number().int().nonnegative().max(100000),
  contact: z.string().trim().min(1).max(200),
  tags: z.string().trim().max(500),
  activityTime: z.string().trim().max(100),
  weeklyHours: z.number().int().nonnegative().max(168),
  campus: z.string().trim().max(100),
  fee: z.number().int().nonnegative().max(100000),
  skillRequirement: skillLevelSchema,
  isRecruiting: z.boolean(),
}).strict()

export const clubCreateSchema = clubFields.extend({
  activityTime: clubFields.shape.activityTime.default(''),
  weeklyHours: clubFields.shape.weeklyHours.default(0),
  campus: clubFields.shape.campus.default(''),
  fee: clubFields.shape.fee.default(0),
  skillRequirement: clubFields.shape.skillRequirement.default('beginner'),
  isRecruiting: clubFields.shape.isRecruiting.default(true),
}).strict()

export const clubUpdateSchema = clubFields.partial().strict()

export const clubIdSchema = z.coerce.number().int().positive()

export type ClubCreateInput = z.infer<typeof clubCreateSchema>
export type ClubUpdateInput = z.infer<typeof clubUpdateSchema>
