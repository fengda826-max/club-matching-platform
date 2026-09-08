import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import type { RequestHandler } from 'express'

export const ADMIN_COOKIE = 'campusmatch_admin'
type SessionPayload = { sid: string; exp: number }

function signature(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

export function createAdminToken(secret: string, lifetimeMs = 8 * 60 * 60 * 1000): string {
  const payload = Buffer.from(JSON.stringify({ sid: randomUUID(), exp: Date.now() + lifetimeMs } satisfies SessionPayload)).toString('base64url')
  return `${payload}.${signature(payload, secret)}`
}

export function verifyAdminToken(token: string | undefined, secret: string): boolean {
  if (!token || !secret) return false
  const [payload, supplied] = token.split('.')
  if (!payload || !supplied) return false
  const expected = signature(payload, secret)
  const left = Buffer.from(supplied)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionPayload
    return typeof parsed.sid === 'string' && typeof parsed.exp === 'number' && parsed.exp > Date.now()
  } catch { return false }
}

export function createRequireAdmin(secret: string): RequestHandler {
  return (req, res, next) => {
    if (!verifyAdminToken(req.cookies?.[ADMIN_COOKIE], secret)) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: '请先登录管理后台' })
      return
    }
    next()
  }
}
