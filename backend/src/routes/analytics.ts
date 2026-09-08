import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { AnalyticsService } from '../services/AnalyticsService'

export function createAnalyticsRouter(service: Pick<AnalyticsService, 'getSummary'> = new AnalyticsService(prisma)): Router {
  const router = Router()
  router.get('/summary', async (_req, res, next) => {
    try { res.json({ success: true, data: await service.getSummary() }) }
    catch (error) { next(error) }
  })
  return router
}

export default createAnalyticsRouter()
