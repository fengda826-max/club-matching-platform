import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { errorHandler } from '../../middleware/errorHandler'
import { createAiRouter } from '../ai'

function parseEvents(text: string) {
  return text.trim().split(/\n\n/).map(frame => {
    const lines = frame.split('\n')
    return {
      event: lines.find(line => line.startsWith('event:'))?.slice(6).trim(),
      data: JSON.parse(lines.find(line => line.startsWith('data:'))?.slice(5).trim() || '{}'),
    }
  })
}

describe('grounded chat SSE', () => {
  it('emits sources before chunks and finishes with a done event', async () => {
    async function* chunks() { yield '适合'; yield '初学者' }
    const logger = { record: vi.fn().mockResolvedValue(undefined) }
    const app = express()
    app.use(express.json())
    app.use('/api/ai', createAiRouter(async () => ({
      ai: {
        groundedChat: vi.fn().mockReturnValue({
          stream: chunks(), model: 'deepseek-v4',
          sources: [{ clubId: 18, name: '人工智能社团' }],
        }),
      },
      clubs: { getAllClubs: vi.fn().mockResolvedValue([]) },
      logger,
    }) as never))
    app.use(errorHandler)

    const response = await request(app).post('/api/ai/chat/stream').send({ message: '适合初学者吗？', history: [] })
    const events = parseEvents(response.text)
    expect(response.status).toBe(200)
    expect(events[0]).toMatchObject({ event: 'metadata', data: { sources: [{ clubId: 18, name: '人工智能社团' }] } })
    expect(events.filter(item => item.event === 'chunk').map(item => item.data.text).join('')).toBe('适合初学者')
    expect(events.at(-1)).toMatchObject({ event: 'done' })
    expect(logger.record).toHaveBeenCalledWith(expect.objectContaining({ useCase: 'chat', status: 'success' }))
  })

  it('validates chat history before starting the stream', async () => {
    const app = express()
    app.use(express.json())
    app.use('/api/ai', createAiRouter(vi.fn() as never))
    app.use(errorHandler)
    const response = await request(app).post('/api/ai/chat/stream').send({ message: '', history: [] })
    expect(response.status).toBe(400)
    expect(response.body.error).toBe('VALIDATION_ERROR')
  })

  it('returns grounded rule fallback when the model is not configured', async () => {
    const logger = { record: vi.fn().mockResolvedValue(undefined) }
    const app = express()
    app.use(express.json())
    app.use('/api/ai', createAiRouter(async () => ({
      ai: {
        getProviderInfo: () => ({ id: 'openai-compat', model: 'deepseek-v4', configured: false }),
        getGroundedFallback: vi.fn().mockReturnValue({
          model: 'rules-fallback',
          sources: [{ clubId: 18, name: '人工智能社团' }],
          text: '模型暂不可用，你可以先查看人工智能社团。',
        }),
      },
      clubs: { getAllClubs: vi.fn().mockResolvedValue([]) },
      logger,
    }) as never))
    app.use(errorHandler)

    const response = await request(app).post('/api/ai/chat/stream').send({ message: '有哪些 AI 社团？', history: [] })
    const events = parseEvents(response.text)

    expect(response.status).toBe(200)
    expect(events[0]).toMatchObject({ event: 'metadata', data: { model: 'rules-fallback' } })
    expect(events.find(item => item.event === 'chunk')?.data.text).toContain('模型暂不可用')
    expect(events.at(-1)?.event).toBe('done')
    expect(logger.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'fallback', fallbackUsed: true }))
  })

  it('falls back when the model fails before emitting any content', async () => {
    async function* failingStream() { throw new Error('provider outage') }
    const logger = { record: vi.fn().mockResolvedValue(undefined) }
    const app = express()
    app.use(express.json())
    app.use('/api/ai', createAiRouter(async () => ({
      ai: {
        getProviderInfo: () => ({ id: 'openai-compat', model: 'deepseek-v4', configured: true }),
        groundedChat: vi.fn().mockReturnValue({
          stream: failingStream(), model: 'deepseek-v4', fallbackText: '已切换到规则检索结果。',
          sources: [{ clubId: 18, name: '人工智能社团' }],
        }),
      },
      clubs: { getAllClubs: vi.fn().mockResolvedValue([]) },
      logger,
    }) as never))
    app.use(errorHandler)

    const response = await request(app).post('/api/ai/chat/stream').send({ message: '有哪些 AI 社团？', history: [] })
    const events = parseEvents(response.text)

    expect(events.find(item => item.event === 'chunk')?.data.text).toBe('已切换到规则检索结果。')
    expect(events.at(-1)?.event).toBe('done')
    expect(logger.record).toHaveBeenCalledWith(expect.objectContaining({ status: 'fallback', errorCode: 'STREAM_ERROR' }))
  })
})
