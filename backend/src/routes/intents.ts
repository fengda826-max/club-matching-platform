import { randomUUID } from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../lib/env'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/errorHandler'
import { IntentService } from '../services/IntentService'

const SESSION_COOKIE = 'campusmatch_session'
const intentSchema = z.object({
  clubId: z.number().int().positive(), source: z.enum(['matching', 'browsing']),
  matchScore: z.number().int().min(0).max(100).optional(),
}).strict()

export function createIntentsRouter(service: Pick<IntentService, 'record'> = new IntentService(prisma)): Router {
  const router = Router()
  router.post('/', async (req, res, next) => {
    try {
      const input = intentSchema.parse(req.body)
      const sessionId = req.cookies?.[SESSION_COOKIE] || randomUUID()
      if (!req.cookies?.[SESSION_COOKIE]) res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE, maxAge: 30 * 24 * 60 * 60 * 1000 })
      const result = await service.record({ ...input, sessionId })
      if ('reason' in result && result.reason === 'CLUB_NOT_FOUND') throw new AppError(404, 'NOT_FOUND', '社团不存在')
      res.status(result.created ? 201 : 200).json({ success: true, data: result })
    } catch (error) { next(error) }
  })
  return router
}

export default createIntentsRouter()
