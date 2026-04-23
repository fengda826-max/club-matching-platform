import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIConfig, ProviderInfo, ChatRequest } from './types'
import { BaseProvider } from './BaseProvider'
import { AIError, AIConfigError } from './errors'

/**
 * Anthropic Claude 原生实现
 */
export class AnthropicProvider extends BaseProvider implements AIProvider {
  private client: Anthropic | null = null
  private defaultModel = 'claude-3-7-sonnet-20250219'

  constructor(config: AIConfig) {
    super(config)
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new AIConfigError('API key is required for Anthropic provider', 'anthropic')
    }

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL || 'https://api.anthropic.com',
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
    })
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<T> {
    if (!this.client) {
      throw new AIConfigError('Client not initialized', 'anthropic')
    }

    try {
      const response = await this.client.messages.create({
        model: this.config.model || this.defaultModel,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: this.config.temperature || 0.7,
      })

      const content = response.content[0]
      if (content && content.type === 'text') {
        return this.extractJson(content.text) as T
      }

      throw new AIError('INVALID_RESPONSE', 'No text content in response', 'anthropic')
    } catch (e: any) {
      this.handleError(e)
      throw e
    }
  }

  async *chat(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new AIConfigError('Client not initialized', 'anthropic')
    }

    try {
      // Anthropic doesn't allow 'system' role in messages array
      // Extract system messages and combine with systemPrompt
      let systemContent = request.systemPrompt || ''
      const userMessages: Anthropic.MessageParam[] = []

      for (const msg of request.messages) {
        if (msg.role === 'system') {
          if (systemContent) systemContent += '\n\n'
          systemContent += msg.content
        } else {
          userMessages.push(msg as Anthropic.MessageParam)
        }
      }

      const stream = await this.client.messages.create({
        model: this.config.model || this.defaultModel,
        system: systemContent,
        messages: userMessages,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || this.config.temperature || 0.7,
        stream: true,
      })

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            yield chunk.delta.text
          }
        }
      }
    } catch (e: any) {
      this.handleError(e)
      throw e
    }
  }

  async chatComplete(request: ChatRequest): Promise<string> {
    if (!this.client) {
      throw new AIConfigError('Client not initialized', 'anthropic')
    }

    try {
      // Anthropic doesn't allow 'system' role in messages array
      // Extract system messages and combine with systemPrompt
      let systemContent = request.systemPrompt || ''
      const userMessages: Anthropic.MessageParam[] = []

      for (const msg of request.messages) {
        if (msg.role === 'system') {
          if (systemContent) systemContent += '\n\n'
          systemContent += msg.content
        } else {
          userMessages.push(msg as Anthropic.MessageParam)
        }
      }

      const response = await this.client.messages.create({
        model: this.config.model || this.defaultModel,
        system: systemContent,
        messages: userMessages,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || this.config.temperature || 0.7,
      })

      const content = response.content[0]
      if (content && content.type === 'text') {
        return content.text
      }

      throw new AIError('INVALID_RESPONSE', 'No text content in response', 'anthropic')
    } catch (e: any) {
      this.handleError(e)
      throw e
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.client) return false

    try {
      // Simple request to check API key validity
      await this.client.messages.create({
        model: this.config.model || this.defaultModel,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      })
      return true
    } catch (e) {
      return false
    }
  }

  getProviderInfo(): ProviderInfo {
    return {
      id: 'anthropic',
      name: 'Anthropic Claude',
      model: this.config.model || this.defaultModel,
      configured: this.client !== null,
    }
  }

  private handleError(e: any): never {
    if (e.status === 401) {
      throw new AIError('INVALID_API_KEY', 'Invalid API key', 'anthropic', e)
    }
    if (e.status === 429) {
      throw new AIError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 'anthropic', e)
    }
    if (e.status === 503) {
      throw new AIError('SERVICE_UNAVAILABLE', 'Service unavailable', 'anthropic', e)
    }
    throw new AIError('NETWORK_ERROR', e.message || 'Network error', 'anthropic', e)
  }
}
