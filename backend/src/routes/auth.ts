import { createHash, timingSafeEqual } from 'crypto'
import { Router } from 'express'
import { z } from 'zod'
import { ADMIN_COOKIE, createAdminToken, verifyAdminToken } from '../middleware/adminAuth'
import { loginRateLimit } from '../middleware/rateLimits'

type AuthConfig = { password: string; secret: string; secure: boolean }
const loginSchema = z.object({ password: z.string().min(1).max(200) }).strict()

function passwordsEqual(left: string, right: string): boolean {
  const a = createHash('sha256').update(left).digest()
  const b = createHash('sha256').update(right).digest()
  return timingSafeEqual(a, b)
}

export function createAuthRouter(config: AuthConfig): Router {
  const router = Router()
  router.post('/login', loginRateLimit, (req, res) => {
    const { password } = loginSchema.parse(req.body)
    if (!config.password || !config.secret || !passwordsEqual(password, config.password)) {
      res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: '密码错误' })
      return
    }
    res.cookie(ADMIN_COOKIE, createAdminToken(config.secret), {
      httpOnly: true, sameSite: 'lax', secure: config.secure, maxAge: 8 * 60 * 60 * 1000, path: '/',
    })
    res.json({ success: true, data: { authenticated: true } })
  })
  router.post('/logout', (_req, res) => {
    res.clearCookie(ADMIN_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.secure, path: '/' })
    res.json({ success: true, data: { authenticated: false } })
  })
  router.get('/status', (req, res) => {
    res.json({ success: true, data: { authenticated: verifyAdminToken(req.cookies?.[ADMIN_COOKIE], config.secret) } })
  })
  return router
}
