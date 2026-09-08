import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../../middleware/errorHandler'
import { createMatchingRouter } from '../matching'

function testApp(service: { extractPreferences: ReturnType<typeof vi.fn>; recommend: ReturnType<typeof vi.fn> }) {
  const app = express()
  app.use(express.json())
  app.use('/api/matching', createMatchingRouter(() => service as never))
  app.use(errorHandler)
  return app
}

describe('matching routes', () => {
  it('limits natural-language requests to 1000 characters', async () => {
    const service = { extractPreferences: vi.fn(), recommend: vi.fn() }
    const response = await request(testApp(service)).post('/api/matching/extract-preferences').send({ text: 'x'.repeat(1001) })
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('VALIDATION_ERROR')
    expect(service.extractPreferences).not.toHaveBeenCalled()
  })

  it('passes validated preferences to the recommendation service', async () => {
    const service = {
      extractPreferences: vi.fn(),
      recommend: vi.fn().mockResolvedValue({ mode: 'rules-only', matches: [] }),
    }
    const payload = { interests: ['编程'], goals: [], skillLevel: 'beginner', availableTimes: [] }
    const response = await request(testApp(service)).post('/api/matching/recommend').send(payload)
    expect(response.status).toBe(200)
    expect(service.recommend).toHaveBeenCalledWith(expect.objectContaining(payload), expect.any(AbortSignal))
    expect(response.body.data.mode).toBe('rules-only')
  })
})
