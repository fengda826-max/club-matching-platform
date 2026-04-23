import type { AIProvider, AIConfig, ProviderInfo, AIProviderId } from './types'
import { AIConfigError } from './errors'

/**
 * 基础提供商抽象类
 * 提供通用的默认实现
 */
export abstract class BaseProvider implements AIProvider {
  protected config: AIConfig

  constructor(config: AIConfig) {
    this.config = config
  }

  abstract initialize(): Promise<void>
  abstract generateStructured<T>(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<T>
  abstract chat(request: any): AsyncGenerator<string, void, unknown>
  abstract chatComplete(request: any): Promise<string>
  abstract checkHealth(): Promise<boolean>
  abstract getProviderInfo(): ProviderInfo

  /**
   * 提取JSON从响应文本
   */
  protected extractJson(text: string): any {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0])
      } catch (e) {
        throw new Error(`Failed to parse JSON: ${e}`)
      }
    }
    throw new Error('No JSON found in response')
  }
}
