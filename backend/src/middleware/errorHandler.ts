import { Prisma } from '@prisma/client'
import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: '请求参数不合法',
      details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    })
    return
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ success: false, error: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) })
    return
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status = error.code === 'P2025' ? 404 : error.code === 'P2002' ? 409 : 500
    const code = error.code === 'P2025' ? 'NOT_FOUND' : error.code === 'P2002' ? 'CONFLICT' : 'DATABASE_ERROR'
    res.status(status).json({ success: false, error: code, message: status === 500 ? '数据库暂时不可用' : '数据操作失败' })
    return
  }
  console.error('Unhandled error:', error)
  res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: '服务暂时不可用' })
}
