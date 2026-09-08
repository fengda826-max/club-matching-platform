import cors from 'cors'
import express from 'express'
import path from 'path'
import { env } from './lib/env'
import { errorHandler } from './middleware/errorHandler'
import aiRouter from './routes/ai'
import clubsRouter from './routes/clubs'
import matchingRouter from './routes/matching'

function isAllowedOrigin(origin: string): boolean {
  return env.CORS_ORIGINS.some(allowed => allowed.endsWith('*')
    ? origin.startsWith(allowed.slice(0, -1))
    : origin === allowed)
}

export function createApp() {
  const app = express()
  app.use(cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
  }))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', message: 'Club matching backend is running' } })
  })
  app.use('/api/clubs', clubsRouter)
  app.use('/api/matching', matchingRouter)
  app.use('/api/ai', aiRouter)

  if (env.NODE_ENV === 'production') {
    const frontendDist = path.resolve(__dirname, '../../frontend/dist')
    app.use(express.static(frontendDist))
    app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')))
  }

  app.use(errorHandler)
  return app
}

export default createApp()
