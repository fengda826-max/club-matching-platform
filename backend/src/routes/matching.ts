import { Router } from 'express'
import { z } from 'zod'
import { env } from '../lib/env'
import { prisma } from '../lib/prisma'
import { createProvider } from '../providers'
import { userPreferenceSchema } from '../schemas/matching'
import { AIRequestLogger } from '../services/AIRequestLogger'
import { ClubService } from '../services/ClubService'
import { RecommendationService } from '../services/RecommendationService'
import { RuleMatchingService } from '../services/RuleMatchingService'

const extractionRequestSchema = z.object({ text: z.string().trim().min(2).max(1000) }).strict()

type MatchingService = Pick<RecommendationService, 'extractPreferences' | 'recommend'>
type ServiceFactory = () => MatchingService | Promise<MatchingService>

let defaultServicePromise: Promise<MatchingService> | undefined

async function defaultService(): Promise<MatchingService> {
  if (!defaultServicePromise) {
    defaultServicePromise = (async () => {
      const provider = env.AI_API_KEY ? createProvider({
        provider: env.AI_PROVIDER,
        apiKey: env.AI_API_KEY,
        baseURL: env.AI_BASE_URL,
        model: env.AI_MODEL,
        timeout: env.AI_TIMEOUT,
        maxRetries: env.AI_MAX_RETRIES,
        temperature: env.AI_TEMPERATURE,
      }) : null
      if (provider) await provider.initialize()
      return new RecommendationService({
        provider,
        clubService: new ClubService(prisma),
        ruleService: new RuleMatchingService(),
        logger: new AIRequestLogger(prisma),
      })
    })()
  }
  return defaultServicePromise
}

export function createMatchingRouter(getService: ServiceFactory = defaultService): Router {
  const router = Router()

  router.post('/extract-preferences', async (req, res, next) => {
    const controller = new AbortController()
    req.once('aborted', () => controller.abort())
    try {
      const { text } = extractionRequestSchema.parse(req.body)
      const result = await (await getService()).extractPreferences(text, controller.signal)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  })

  router.post('/recommend', async (req, res, next) => {
    const controller = new AbortController()
    req.once('aborted', () => controller.abort())
    try {
      const preference = userPreferenceSchema.parse(req.body)
      const result = await (await getService()).recommend(preference, controller.signal)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  })

  return router
}

export default createMatchingRouter()
