import { describe, it, expect, vi } from 'vitest'

// Mock the entire module to avoid instantiating the client which throws on missing API key
vi.mock('../apiClient', async () => {
  const original = await vi.importActual('../apiClient')
  return {
    ...original,
    // Don't export the instantiated client in tests
    anthropicClient: undefined,
  }
})

const { ApiError, hasValidApiKey, getApiKeyStatus } = await import('../apiClient')

describe('ApiError', () => {
  it('creates error with correct name and properties', () => {
    const originalError = new Error('Original error')
    const error = new ApiError('Test error', 500, originalError)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.name).toBe('ApiError')
    expect(error.message).toBe('Test error')
    expect(error.code).toBe(500)
    expect(error.originalError).toBe(originalError)
  })
})

describe('hasValidApiKey', () => {
  it('returns false when no API key is set', () => {
    // Since we can't easily mock import.meta.env in Vitest without more setup,
    // we can at least test that the function doesn't crash and returns a boolean
    const result = hasValidApiKey()
    expect(typeof result).toBe('boolean')
    // If test runs without API key, should be false
    if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
      expect(result).toBe(false)
    }
  })
})

describe('getApiKeyStatus', () => {
  it('returns object with valid boolean and message', () => {
    const status = getApiKeyStatus()
    expect(typeof status).toBe('object')
    expect(typeof status.valid).toBe('boolean')
    expect(typeof status.message).toBe('string')
  })

  it('returns invalid when no API key', () => {
    const status = getApiKeyStatus()
    if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
      expect(status.valid).toBe(false)
      expect(status.message).toContain('API Key')
    }
  })
})
