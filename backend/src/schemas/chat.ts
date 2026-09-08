import { z } from 'zod'

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
}).strict()

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(chatMessageSchema).max(12).default([]),
}).strict()

export type ChatInput = z.infer<typeof chatRequestSchema>
