import type { AIProvider, AIConfig } from './types'
import { AnthropicProvider } from './AnthropicProvider'
import { OpenAICompatProvider } from './OpenAICompatProvider'
import { AIConfigError } from './errors'

/**
 * 根据配置创建AI提供商实例
 */
export function createProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config)
    case 'openai-compat':
      return new OpenAICompatProvider(config)
    default:
      throw new AIConfigError(`Unsupported AI provider: ${config.provider}`, config.provider)
  }
}

/**
 * 从环境变量加载AI配置
 */
export function loadConfigFromEnv(): AIConfig {
  const provider = (process.env.AI_PROVIDER as any) || 'anthropic'
  const apiKey = process.env.AI_API_KEY || ''
  const baseURL = process.env.AI_BASE_URL
  const model = process.env.AI_MODEL
  const timeout = parseInt(process.env.AI_TIMEOUT || '30000', 10)
  const maxRetries = parseInt(process.env.AI_MAX_RETRIES || '2', 10)
  const temperature = process.env.AI_TEMPERATURE ? parseFloat(process.env.AI_TEMPERATURE) : undefined

  return {
    provider,
    apiKey,
    baseURL,
    model,
    timeout,
    maxRetries,
    temperature,
  }
}

export * from './types'
export * from './errors'
