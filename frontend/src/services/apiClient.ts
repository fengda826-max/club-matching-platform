/**
 * API Client Configuration
 * Handles Anthropic SDK initialization, error handling, retries, and logging
 */

import Anthropic from '@anthropic-ai/sdk'
import { API_CONFIG } from '@/shared'

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly originalError?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Get API key from environment
 */
export function getApiKey(): string {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || ''
  if (!apiKey) {
    throw new ApiError('未配置 API Key，请设置 VITE_ANTHROPIC_API_KEY 环境变量')
  }
  return apiKey
}

/**
 * Get or create the Anthropic client (lazy initialization)
 * This avoids throwing on module load when no API key is configured
 */
let _anthropicClient: Anthropic | undefined

export function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({
      apiKey: getApiKey(),
      baseURL: 'https://api.anthropic.com',
      maxRetries: API_CONFIG.MAX_RETRIES,
      timeout: API_CONFIG.TIMEOUT,
    })
  }
  return _anthropicClient
}

/**
 * Request logging utility
 */
function logRequest(
  method: string,
  endpoint: string,
  params?: Record<string, unknown>,
): void {
  if (import.meta.env.DEV) {
    console.log(`[API Request] ${method} ${endpoint}`, params)
  }
}

/**
 * Response logging utility
 */
function logResponse(
  method: string,
  endpoint: string,
  response: unknown,
): void {
  if (import.meta.env.DEV) {
    console.log(`[API Response] ${method} ${endpoint}`, response)
  }
}

/**
 * Error logging utility
 */
function logError(
  method: string,
  endpoint: string,
  error: unknown,
): void {
  console.error(`[API Error] ${method} ${endpoint}`, error)
}

/**
 * Wrap API call with error handling and logging
 */
export async function withApiHandling<T>(
  method: string,
  endpoint: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    logRequest(method, endpoint)
    const result = await fn()
    logResponse(method, endpoint, result)
    return result
  } catch (error) {
    logError(method, endpoint, error)

    if (error instanceof Error) {
      throw new ApiError(
        error.message,
        undefined,
        error,
      )
    }

    throw new ApiError(
      '未知错误',
      undefined,
      error,
    )
  }
}

/**
 * Check if API key is valid
 */
export function hasValidApiKey(): boolean {
  try {
    const apiKey = getApiKey()
    return apiKey.length > 0
  } catch {
    return false
  }
}

/**
 * Get API key status
 */
export function getApiKeyStatus(): { valid: boolean; message: string } {
  try {
    const apiKey = getApiKey()
    if (apiKey.length === 0) {
      return {
        valid: false,
        message: 'API Key 为空，请配置有效的 VITE_ANTHROPIC_API_KEY',
      }
    }
    return {
      valid: true,
      message: 'API Key 已配置',
    }
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'API Key 配置错误',
    }
  }
}
