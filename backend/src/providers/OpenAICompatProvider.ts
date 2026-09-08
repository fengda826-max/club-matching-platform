import type { z } from 'zod'
import { BaseProvider } from './BaseProvider'
import { AIConfigError, AIError } from './errors'
import type { AICompletion, AIConfig, AIProvider, ChatRequest, ProviderInfo } from './types'

type CompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

export class OpenAICompatProvider extends BaseProvider implements AIProvider {
  private readonly defaultModel = 'deepseek-chat'
  private readonly defaultBaseURL = 'https://api.deepseek.com/v1'

  constructor(config: AIConfig) { super(config) }

  async initialize(): Promise<void> {
    if (!this.config.apiKey) throw new AIConfigError('API key is required for OpenAI-compatible provider', 'openai-compat')
  }

  private get baseURL(): string { return this.config.baseURL || this.defaultBaseURL }
  private get model(): string { return this.config.model || this.defaultModel }

  async generateStructured<T>(
    schema: z.ZodType<T>,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    signal?: AbortSignal,
  ): Promise<AICompletion<T>> {
    const startedAt = Date.now()
    const response = await this.fetchCompletion({
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      max_tokens: maxTokens,
      temperature: this.config.temperature ?? 0.7,
    }, signal)
    const text = response.choices?.[0]?.message?.content
    if (!text) throw new AIError('INVALID_RESPONSE', 'No content in response', 'openai-compat')

    try {
      const data = schema.parse(this.extractJson(text))
      return {
        data,
        usage: { inputTokens: response.usage?.prompt_tokens, outputTokens: response.usage?.completion_tokens },
        provider: 'openai-compat',
        model: this.model,
        durationMs: Date.now() - startedAt,
      }
    } catch (error) {
      throw new AIError('INVALID_RESPONSE', 'Structured response failed validation', 'openai-compat', error)
    }
  }

  async *chat(request: ChatRequest): AsyncGenerator<string, void, unknown> {
    const response = await this.fetchWithRetry({
      model: this.model,
      messages: this.buildMessages(request),
      stream: true,
      max_tokens: request.maxTokens ?? 1000,
      temperature: request.temperature ?? this.config.temperature ?? 0.7,
    }, request.signal)
    const reader = response.body?.getReader()
    if (!reader) throw new AIError('INVALID_RESPONSE', 'No response body', 'openai-compat')

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
        if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue
        try {
          const data = JSON.parse(trimmed.slice(6))
          const chunk = data.choices?.[0]?.delta?.content
          if (typeof chunk === 'string' && chunk) yield chunk
        } catch { /* Ignore one malformed upstream frame. */ }
      }
    }
  }

  async chatComplete(request: ChatRequest): Promise<string> {
    const response = await this.fetchCompletion({
      messages: this.buildMessages(request),
      max_tokens: request.maxTokens ?? 1000,
      temperature: request.temperature ?? this.config.temperature ?? 0.7,
    }, request.signal)
    const text = response.choices?.[0]?.message?.content
    if (!text) throw new AIError('INVALID_RESPONSE', 'No content in response', 'openai-compat')
    return text
  }

  async checkHealth(): Promise<boolean> { return Boolean(this.config.apiKey) }

  getProviderInfo(): ProviderInfo {
    return { id: 'openai-compat', name: 'OpenAI-compatible', model: this.model, configured: Boolean(this.config.apiKey) }
  }

  private buildMessages(request: ChatRequest) {
    return request.systemPrompt
      ? [{ role: 'system', content: request.systemPrompt }, ...request.messages]
      : [...request.messages]
  }

  private async fetchCompletion(params: Record<string, unknown>, signal?: AbortSignal): Promise<CompletionResponse> {
    const response = await this.fetchWithRetry({ model: this.model, ...params }, signal)
    return await response.json() as CompletionResponse
  }

  private async fetchWithRetry(body: Record<string, unknown>, callerSignal?: AbortSignal): Promise<Response> {
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.config.timeout)
      const onCallerAbort = () => controller.abort()
      callerSignal?.addEventListener('abort', onCallerAbort, { once: true })
      try {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.config.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        if (response.ok) return response
        if ([429, 502, 503, 504].includes(response.status) && attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)))
          continue
        }
        await this.handleErrorResponse(response)
      } catch (error) {
        if (error instanceof AIError) throw error
        if (controller.signal.aborted) throw new AIError('TIMEOUT', 'AI request timed out or was cancelled', 'openai-compat', error)
        if (attempt >= this.config.maxRetries) throw new AIError('NETWORK_ERROR', 'AI network request failed', 'openai-compat', error)
      } finally {
        clearTimeout(timeout)
        callerSignal?.removeEventListener('abort', onCallerAbort)
      }
    }
    throw new AIError('NETWORK_ERROR', 'AI request failed after retries', 'openai-compat')
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let message = response.statusText
    try {
      const payload = await response.json() as { error?: { message?: string } }
      message = payload.error?.message || message
    } catch { /* Keep the status text. */ }
    if (response.status === 401) throw new AIError('INVALID_API_KEY', `Invalid API key: ${message}`, 'openai-compat')
    if (response.status === 429) throw new AIError('RATE_LIMIT_EXCEEDED', `Rate limit exceeded: ${message}`, 'openai-compat')
    if (response.status === 400 || response.status === 413) throw new AIError('CONTEXT_OVERFLOW', `Invalid context: ${message}`, 'openai-compat')
    if ([502, 503, 504].includes(response.status)) throw new AIError('SERVICE_UNAVAILABLE', `Service unavailable: ${message}`, 'openai-compat')
    throw new AIError('NETWORK_ERROR', `HTTP ${response.status}: ${message}`, 'openai-compat')
  }
}
