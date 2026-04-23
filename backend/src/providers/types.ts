/**
 * 支持的提供商ID
 */
export type AIProviderId = 'anthropic' | 'openai-compat'

/**
 * 统一的AI配置
 */
export interface AIConfig {
  provider: AIProviderId
  apiKey: string
  baseURL?: string
  model?: string
  timeout: number
  maxRetries: number
  temperature?: number
}

/**
 * 聊天消息
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 聊天请求
 */
export interface ChatRequest {
  messages: ChatMessage[]
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

/**
 * 提供商信息
 */
export interface ProviderInfo {
  id: AIProviderId
  name: string
  model: string
  configured: boolean
}

/**
 * 统一的AI提供商接口
 * 所有具体提供商都必须实现此接口
 */
export interface AIProvider {
  /**
   * 初始化提供商（验证配置等）
   */
  initialize(): Promise<void>

  /**
   * 生成结构化输出（JSON格式）
   * @param systemPrompt - 系统提示词
   * @param userPrompt - 用户提示词
   * @param maxTokens - 最大token数
   * @returns 解析后的JSON对象
   */
  generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number
  ): Promise<T>

  /**
   * 流式聊天对话
   * @param request - 聊天请求
   * @returns AsyncGenerator 输出响应流
   */
  chat(request: ChatRequest): AsyncGenerator<string, void, unknown>

  /**
   * 非流式聊天完成
   * @param request - 聊天请求
   * @returns 完整响应文本
   */
  chatComplete(request: ChatRequest): Promise<string>

  /**
   * 检查API密钥是否有效/服务是否可用
   */
  checkHealth(): Promise<boolean>

  /**
   * 获取提供商信息
   */
  getProviderInfo(): ProviderInfo
}
