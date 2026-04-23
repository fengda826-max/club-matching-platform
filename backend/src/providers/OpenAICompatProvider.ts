import type { AIProvider, AIConfig, ProviderInfo, ChatRequest } from './types'
import { BaseProvider } from './BaseProvider'
import { AIError, AIConfigError } from './errors'

/**
 * OpenAI兼容格式提供商
 * 适用于: 火山引擎豆包、OpenAI官方、Azure OpenAI、自部署开源模型
 */
export class OpenAICompatProvider extends BaseProvider implements AIProvider {
  private defaultModel = 'gpt-4o-mini'
  private defaultBaseURL = 'https://api.openai.com/v1'

  constructor(config: AIConfig) {
    super(config)
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) {
      throw new AIConfigError('API key is required for OpenAI-compatible provider', 'openai-compat')
    }
  }

  private get baseURL(): string {
    return this.config.baseURL || this.defaultBaseURL
  }

  private get model(): string {
    return this.config.model || this.defaultModel
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<T> {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    const response = await this.fetchCompletion({
      messages,
      max_tokens: maxTokens,
      temperature: this.config.temperature || 0.7,
    })

    const text = response.choices[0]?.message?.content
    if (!text) {
      throw new AIError('INVALID_RESPONSE', 'No content in response', 'openai-compat')
    }

    return this.extractJson(text) as T
  }

  async *chat(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    const messages = this.buildMessages(request)

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: true,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || this.config.temperature || 0.7,
      }),
      signal: this.getTimeoutSignal(),
    })

    if (!response.ok) {
      await this.handleErrorResponse(response)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new AIError('INVALID_RESPONSE', 'No response body', 'openai-compat')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6))
            const chunk = data.choices[0]?.delta?.content
            if (chunk) {
              yield chunk
            }
          } catch (e) {
            // Skip malformed chunks
            continue
          }
        }
      }
    }
  }

  async chatComplete(request: ChatRequest): Promise<string> {
    const messages = this.buildMessages(request)

    const response = await this.fetchCompletion({
      messages,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || this.config.temperature || 0.7,
    })

    const text = response.choices[0]?.message?.content
    if (!text) {
      throw new AIError('INVALID_RESPONSE', 'No content in response', 'openai-compat')
    }

    return text
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Simple request to check API key validity
      await this.fetchCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
        temperature: 0.7,
      })
      return true
    } catch (e: unknown) {
      console.error('[OpenAICompatProvider] Health check failed:', e)
      return false
    }
  }

  getProviderInfo(): ProviderInfo {
    return {
      id: 'openai-compat',
      name: 'OpenAI-compatible',
      model: this.model,
      configured: !!this.config.apiKey,
    }
  }

  private buildMessages(request: ChatRequest): any[] {
    const messages = [...request.messages]
    if (request.systemPrompt) {
      messages.unshift({ role: 'system', content: request.systemPrompt })
    }
    return messages
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  private getTimeoutSignal(): AbortSignal {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), this.config.timeout)
    return controller.signal
  }

  private async fetchCompletion(params: {
    messages: any[]
    max_tokens: number
    temperature: number
  }): Promise<any> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        ...params,
      }),
      signal: this.getTimeoutSignal(),
    })

    if (!response.ok) {
      await this.handleErrorResponse(response)
    }

    return await response.json()
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = response.statusText
    try {
      const error = await response.json() as any
      errorMessage = error.error?.message || errorMessage
    } catch (e: unknown) {
      // Ignore
    }

    switch (response.status) {
      case 401:
        throw new AIError('INVALID_API_KEY', `Invalid API key: ${errorMessage}`, 'openai-compat')
      case 429:
        throw new AIError('RATE_LIMIT_EXCEEDED', `Rate limit exceeded: ${errorMessage}`, 'openai-compat')
      case 413:
      case 400:
        throw new AIError('CONTEXT_OVERFLOW', `Context overflow: ${errorMessage}`, 'openai-compat')
      case 503:
        throw new AIError('SERVICE_UNAVAILABLE', `Service unavailable: ${errorMessage}`, 'openai-compat')
      default:
        throw new AIError('NETWORK_ERROR', `HTTP ${response.status}: ${errorMessage}`, 'openai-compat')
    }
  }
}
