import type { Response } from 'express'

export type SseEventName = 'metadata' | 'chunk' | 'usage' | 'done' | 'error'

export function writeSse(res: Response, event: SseEventName, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}
