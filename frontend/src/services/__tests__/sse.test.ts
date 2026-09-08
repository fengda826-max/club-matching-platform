import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamChat } from '../../api/sse'

afterEach(() => vi.unstubAllGlobals())

describe('streamChat', () => {
  it('reassembles fragmented bytes and dispatches typed events in order', async () => {
    const source = [
      'event: metadata\ndata: {"sources":[{"clubId":18,"name":"人工智能社团"}]}\n\n',
      'event: chunk\ndata: {"text":"适合',
      '初学者"}\n\nevent: done\ndata: {}\n\n',
    ]
    const encoder = new TextEncoder()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(new ReadableStream({
      start(controller) {
        source.forEach(part => controller.enqueue(encoder.encode(part)))
        controller.close()
      },
    }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } })))
    const events: Array<[string, unknown]> = []

    await streamChat({ message: '适合初学者吗？', history: [] }, {
      metadata: data => events.push(['metadata', data]),
      chunk: data => events.push(['chunk', data]),
      done: data => events.push(['done', data]),
    })

    expect(events).toEqual([
      ['metadata', { sources: [{ clubId: 18, name: '人工智能社团' }] }],
      ['chunk', { text: '适合初学者' }],
      ['done', {}],
    ])
  })

  it('throws the server error code for a non-2xx response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'RATE_LIMITED', message: '请求过于频繁' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    )))
    await expect(streamChat({ message: 'hello', history: [] }, {})).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })
})
