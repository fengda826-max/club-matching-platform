import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'
import clubsRouter from './routes/clubs'
import aiRouter from './routes/ai'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config()

const app = express()
const prisma = new PrismaClient()
const port = process.env.PORT || 3001
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5175'

// CORS configuration: allow any localhost port in development
// because Vite automatically switches ports when 5175 is occupied
const corsOptions = {
  credentials: true,
  origin: (origin: string | undefined, callback: (err: any, allow: boolean) => void) => {
    // Allow requests with no origin (like curl/postman)
    if (!origin) {
      callback(null, true)
      return
    }
    // Allow any localhost origin in development
    if (origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:')) {
      callback(null, true)
      return
    }
    // Check against configured origin for exact match
    if (origin === corsOrigin) {
      callback(null, true)
      return
    }
    // Reject other origins
    callback(new Error('Not allowed by CORS'), false)
  }
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', message: 'Club matching backend is running' } })
})

// API routes
app.use('/api/clubs', clubsRouter)
app.use('/api/ai', aiRouter)

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err)
  res.status(500).json({
    error: 'Internal server error',
  message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  })
})

// Host frontend static files in production (after build)
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist')
  app.use(express.static(frontendDist))

  // SPA fallback - all non-API routes return index.html for page refresh
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })

  console.log(`📦 Frontend static files hosted from: ${frontendDist}`)
}

// Start server
app.listen(port, () => {
  console.log(`🚀 Backend server running on http://localhost:${port}`)
  console.log(`📊 Health check: http://localhost:${port}/api/health`)
})

export default app
