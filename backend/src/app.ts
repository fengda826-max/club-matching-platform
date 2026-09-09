import cors from 'cors'
import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { env } from './lib/env'
import { errorHandler } from './middleware/errorHandler'
import aiRouter from './routes/ai'
import clubsRouter from './routes/clubs'
import matchingRouter from './routes/matching'
import analyticsRouter from './routes/analytics'
import { createAuthRouter } from './routes/auth'
import intentsRouter from './routes/intents'
import { aiRateLimit } from './middleware/rateLimits'

function isAllowedOrigin(origin: string): boolean {
  return env.CORS_ORIGINS.some(allowed => allowed.endsWith('*')
    ? origin.startsWith(allowed.slice(0, -1))
    : origin === allowed)
}

export function createApp() {
  const app = express()
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1)
  app.use(cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
  }))
  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', message: 'Club matching backend is running' } })
  })
  app.use('/api/clubs', clubsRouter)
  app.use('/api/auth', createAuthRouter({ password: env.ADMIN_PASSWORD, secret: env.SESSION_SECRET, secure: env.COOKIE_SECURE }))
  app.use('/api/intents', intentsRouter)
  app.use('/api/analytics', analyticsRouter)
  app.use('/api/matching', aiRateLimit, matchingRouter)
  app.use('/api/ai', aiRateLimit, aiRouter)

  if (env.NODE_ENV === 'production') {
    const frontendDist = path.resolve(__dirname, '../../frontend/dist')
    app.use(express.static(frontendDist))
    app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')))
  }

  app.use(errorHandler)
  return app
}

export default createApp()
