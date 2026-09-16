import { randomUUID } from 'crypto'
import { Router } from 'express'
import { env } from '../lib/env'
import { prisma } from '../lib/prisma'
import { createProvider } from '../providers'
import { AIError } from '../providers/errors'
import { chatRequestSchema } from '../schemas/chat'
import { AIRequestLogger } from '../services/AIRequestLogger'
import { AIService } from '../services/AIService'
import { ClubService } from '../services/ClubService'
import { createVectorRetrieval } from '../services/VectorRetrievalService'
import { writeSse } from '../utils/sse'
import { createRequireAdmin } from '../middleware/adminAuth'

type Dependencies = {
  ai: AIService
  clubs: Pick<ClubService, 'getAllClubs'>
  logger: Pick<AIRequestLogger, 'record'>
}
type DependencyFactory = () => Dependencies | Promise<Dependencies>

let dependenciesPromise: Promise<Dependencies> | undefined
async function defaultDependencies(): Promise<Dependencies> {
  if (!dependenciesPromise) dependenciesPromise = (async () => {
    const provider = createProvider({
      provider: env.AI_PROVIDER, apiKey: env.AI_API_KEY, baseURL: env.AI_BASE_URL,
      model: env.AI_MODEL, timeout: env.AI_TIMEOUT, maxRetries: env.AI_MAX_RETRIES,
      temperature: env.AI_TEMPERATURE,
    })
    if (env.AI_API_KEY) await provider.initialize()
    const retrieval = createVectorRetrieval()
    return { ai: new AIService(provider, retrieval, env.RAG_TOP_K), clubs: new ClubService(prisma), logger: new AIRequestLogger(prisma) }
  })()
  return dependenciesPromise
}

export function createAiRouter(getDependencies: DependencyFactory = defaultDependencies): Router {
  const router = Router()
  const requireAdmin = createRequireAdmin(env.SESSION_SECRET)

  router.get('/health', async (_req, res, next) => {
    try {
      const { ai } = await getDependencies()
      const info = ai.getProviderInfo()
      res.json({ success: true, data: { healthy: info.configured, provider: info } })
    } catch (error) { next(error) }
  })

  router.post('/chat/stream', async (req, res, next) => {
    let streamStarted = false
    const startedAt = Date.now()
    const controller = new AbortController()
    res.once('close', () => { if (!res.writableEnded) controller.abort() })
    try {
      const input = chatRequestSchema.parse(req.body)
      const { ai, clubs, logger } = await getDependencies()
      const allClubs = await clubs.getAllClubs()
      const info = ai.getProviderInfo?.()
      if (info && !info.configured) {
        const fallback = ai.getGroundedFallback(input.message, allClubs)
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
        })
        streamStarted = true
        writeSse(res, 'metadata', { requestId: randomUUID(), model: fallback.model, sources: fallback.sources })
        writeSse(res, 'chunk', { text: fallback.text })
        const durationMs = Date.now() - startedAt
        writeSse(res, 'usage', { durationMs })
        writeSse(res, 'done', {})
        res.end()
        await logger.record({ useCase: 'chat', provider: info.id, model: fallback.model, status: 'fallback', durationMs, fallbackUsed: true, errorCode: 'UNCONFIGURED' })
        return
      }
      const grounded = await ai.groundedChat(input.message, input.history, allClubs, controller.signal)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no',
      })
      streamStarted = true
      writeSse(res, 'metadata', { requestId: randomUUID(), model: grounded.model, sources: grounded.sources })
      let chunkCount = 0
      try {
        for await (const text of grounded.stream) {
          chunkCount += 1
          writeSse(res, 'chunk', { text })
        }
      } catch (error) {
        if (chunkCount > 0) throw error
        const safeCode = error instanceof AIError ? error.code : 'STREAM_ERROR'
        writeSse(res, 'chunk', { text: grounded.fallbackText })
        const durationMs = Date.now() - startedAt
        writeSse(res, 'usage', { durationMs })
        writeSse(res, 'done', {})
        res.end()
        await logger.record({ useCase: 'chat', provider: info?.id || 'unknown', model: grounded.model, status: 'fallback', durationMs, fallbackUsed: true, errorCode: safeCode })
        return
      }
      const durationMs = Date.now() - startedAt
      writeSse(res, 'usage', { durationMs })
      writeSse(res, 'done', {})
      res.end()
      await logger.record({ useCase: 'chat', provider: info?.id || 'unknown', model: grounded.model, status: 'success', durationMs, fallbackUsed: false })
    } catch (error) {
      if (!streamStarted) return next(error)
      const safeCode = error instanceof AIError ? error.code : 'STREAM_ERROR'
      const { logger } = await getDependencies()
      writeSse(res, 'error', { code: safeCode, message: '回答生成中断，请稍后重试' })
      res.end()
      await logger.record({ useCase: 'chat', provider: error instanceof AIError ? error.provider : 'unknown', model: 'unknown', status: 'error', durationMs: Date.now() - startedAt, fallbackUsed: false, errorCode: safeCode })
    }
  })

  router.post('/chat', async (req, res, next) => {
    try {
      const input = chatRequestSchema.parse(req.body)
      const { ai, clubs } = await getDependencies()
      const result = await ai.chatComplete(input.message, input.history, await clubs.getAllClubs())
      res.json({ success: true, data: { response: result } })
    } catch (error) { next(error) }
  })

  router.post('/generate-description', requireAdmin, async (req, res, next) => {
    try {
      const { ai } = await getDependencies()
      res.json({ success: true, data: { description: await ai.generateDescription(req.body.name, req.body.category) } })
    } catch (error) { next(error) }
  })

  router.post('/suggest-tags', requireAdmin, async (req, res, next) => {
    try {
      const { ai } = await getDependencies()
      res.json({ success: true, data: { tags: await ai.suggestTags(req.body.name, req.body.category, req.body.description) } })
    } catch (error) { next(error) }
  })

  return router
}

export default createAiRouter()
