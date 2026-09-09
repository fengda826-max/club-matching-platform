import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { OpenAICompatProvider } from '../OpenAICompatProvider'

const config = {
  provider: 'openai-compat' as const,
  apiKey: 'test-key',
  baseURL: 'https://model.example/v1',
  model: 'deepseek-v4',
  timeout: 1000,
  maxRetries: 1,
  temperature: 0.7,
}

function completion(content: string, status = 200): Response {
  return new Response(JSON.stringify(status === 200 ? {
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 12, completion_tokens: 4 },
  } : { error: { message: 'temporary failure' } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('OpenAICompatProvider', () => {
  it('preserves an explicit zero temperature', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(completion('ok'))
    vi.stubGlobal('fetch', fetchSpy)
    const provider = new OpenAICompatProvider(config)

    await provider.chatComplete({ messages: [{ role: 'user', content: 'hello' }], temperature: 0 })

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body as string).temperature).toBe(0)
  })

  it('returns validated structured data and usage', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(completion('{"value":7}'))
    vi.stubGlobal('fetch', fetchSpy)
    const provider = new OpenAICompatProvider(config)

    const result = await provider.generateStructured(
      z.object({ value: z.number().int() }),
      'system',
      'user',
      100,
    )

    expect(result).toMatchObject({
      data: { value: 7 },
      usage: { inputTokens: 12, outputTokens: 4 },
      provider: 'openai-compat',
      model: 'deepseek-v4',
    })
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body as string).response_format).toEqual({ type: 'json_object' })
  })

  it('rejects JSON that violates the requested schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(completion('{"value":"wrong"}')))
    const provider = new OpenAICompatProvider(config)

    await expect(provider.generateStructured(
      z.object({ value: z.number().int() }),
      'system',
      'user',
      100,
    )).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })

  it('retries one transient service failure', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(completion('', 503))
      .mockResolvedValueOnce(completion('recovered'))
    vi.stubGlobal('fetch', fetchSpy)
    const provider = new OpenAICompatProvider(config)

    await expect(provider.chatComplete({ messages: [{ role: 'user', content: 'hello' }] }))
      .resolves.toBe('recovered')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
