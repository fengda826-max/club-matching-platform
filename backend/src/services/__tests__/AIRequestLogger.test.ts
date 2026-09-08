import { describe, expect, it, vi } from 'vitest'
import { AIRequestLogger } from '../AIRequestLogger'

describe('AIRequestLogger', () => {
  it('stores operational metadata without a raw prompt field', async () => {
    const create = vi.fn().mockResolvedValue({ id: 1 })
    const logger = new AIRequestLogger({ aIRequestLog: { create } } as never)

    await logger.record({
      useCase: 'matching-explanation',
      provider: 'openai-compat',
      model: 'deepseek-v4',
      status: 'success',
      durationMs: 120,
      inputTokens: 30,
      outputTokens: 12,
      fallbackUsed: false,
    })

    expect(create).toHaveBeenCalledWith({ data: expect.not.objectContaining({ prompt: expect.anything() }) })
  })

  it('does not fail the user request when telemetry storage fails', async () => {
    const logger = new AIRequestLogger({
      aIRequestLog: { create: vi.fn().mockRejectedValue(new Error('database unavailable')) },
    } as never)

    await expect(logger.record({
      useCase: 'chat',
      provider: 'openai-compat',
      model: 'deepseek-v4',
      status: 'error',
      durationMs: 50,
      fallbackUsed: false,
      errorCode: 'TIMEOUT',
    })).resolves.toBeUndefined()
  })
})
