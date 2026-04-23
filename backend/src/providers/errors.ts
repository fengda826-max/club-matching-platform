/**
 * AI错误码
 */
export type AIErrorCode =
  | 'INVALID_CONFIG'
  | 'INVALID_API_KEY'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTEXT_OVERFLOW'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'

/**
 * 统一的AI错误
 */
export class AIError extends Error {
  code: AIErrorCode
  provider: string
  cause?: unknown

  constructor(code: AIErrorCode, message: string, provider: string, cause?: unknown) {
    super(message)
    this.name = 'AIError'
    this.code = code
    this.provider = provider
    this.cause = cause
  }
}

/**
 * 配置错误
 */
export class AIConfigError extends AIError {
  constructor(message: string, provider: string) {
    super('INVALID_CONFIG', message, provider)
    this.name = 'AIConfigError'
  }
}
