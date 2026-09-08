import { BASE_URL, type ChatMessage } from './client'

export type ChatSource = { clubId: number; name: string }
export type ChatStreamEvents = {
  metadata: { requestId?: string; model?: string; sources: ChatSource[] }
  chunk: { text: string }
  usage: { inputTokens?: number; outputTokens?: number; durationMs: number }
  done: Record<string, never>
  error: { code: string; message: string }
}

export type ChatStreamHandlers = { [K in keyof ChatStreamEvents]?: (data: ChatStreamEvents[K]) => void }

export class ChatStreamError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'ChatStreamError'
  }
}

export async function streamChat(
  request: { message: string; history: ChatMessage[] },
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/ai/chat/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(request),
    signal,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string; message?: string }
    throw new ChatStreamError(body.error || 'STREAM_REQUEST_FAILED', body.message || `请求失败 (${response.status})`)
  }
  if (!response.body) throw new ChatStreamError('EMPTY_STREAM', '服务端未返回数据流')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const frames = buffer.split(/\r?\n\r?\n/)
    buffer = frames.pop() || ''
    for (const frame of frames) dispatchFrame(frame, handlers)
    if (done) break
  }
  if (buffer.trim()) dispatchFrame(buffer, handlers)
}

function dispatchFrame(frame: string, handlers: ChatStreamHandlers): void {
  let eventName = ''
  const dataLines: string[] = []
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim()
    if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
  }
  if (!(eventName in handlers)) return
  const data = JSON.parse(dataLines.join('\n') || '{}')
  const handler = handlers[eventName as keyof ChatStreamEvents] as ((payload: unknown) => void) | undefined
  handler?.(data)
  if (eventName === 'error') throw new ChatStreamError(data.code || 'STREAM_ERROR', data.message || '流式请求失败')
}
