import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { createRequireAdmin } from '../../middleware/adminAuth'
import { errorHandler } from '../../middleware/errorHandler'
import { createAnalyticsRouter } from '../analytics'
import { createAuthRouter } from '../auth'
import { createIntentsRouter } from '../intents'

function baseApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  return app
}

describe('authentication, intent and analytics', () => {
  it('rejects an unauthenticated protected mutation', async () => {
    const app = baseApp()
    app.put('/protected', createRequireAdmin('test-secret'), (_req, res) => res.json({ success: true }))
    expect((await request(app).put('/protected')).status).toBe(401)
  })

  it('sets an HttpOnly cookie after valid login and clears it on logout', async () => {
    const app = baseApp()
    app.use('/api/auth', createAuthRouter({ password: 'demo-pass', secret: 'test-secret', secure: false }))
    const login = await request(app).post('/api/auth/login').send({ password: 'demo-pass' })
    expect(login.status).toBe(200)
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly')
    const logout = await request(app).post('/api/auth/logout')
    expect(logout.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970')
  })

  it('deduplicates one intent per anonymous session and club', async () => {
    const record = vi.fn().mockResolvedValueOnce({ created: true }).mockResolvedValueOnce({ created: false })
    const app = baseApp()
    app.use('/api/intents', createIntentsRouter({ record } as never))
    app.use(errorHandler)
    const agent = request.agent(app)
    const first = await agent.post('/api/intents').send({ clubId: 1, source: 'matching', matchScore: 88 })
    const duplicate = await agent.post('/api/intents').send({ clubId: 1, source: 'matching', matchScore: 88 })
    expect(first.body.data.created).toBe(true)
    expect(duplicate.body.data.created).toBe(false)
    expect(record.mock.calls[0][0].sessionId).toBe(record.mock.calls[1][0].sessionId)
  })

  it('returns only the sanitized analytics summary', async () => {
    const summary = {
      business: { clubCount: 10, recommendationCount: 8, intentCount: 2, conversionRate: 25, topCategories: [] },
      ai: { requestCount: 9, successRate: 88.9, averageDurationMs: 120, validationFailures: 1, fallbackCount: 1, inputTokens: 100, outputTokens: 50 },
    }
    const app = baseApp()
    app.use('/api/analytics', createAnalyticsRouter({ getSummary: vi.fn().mockResolvedValue(summary) } as never))
    const response = await request(app).get('/api/analytics/summary')
    expect(response.body.data).toEqual(summary)
    expect(JSON.stringify(response.body)).not.toMatch(/session|prompt|contact|password/i)
  })
})
