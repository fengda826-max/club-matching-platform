import type { AIProvider, ChatMessage, ChatRequest } from '../providers/types'
import { Club } from '@prisma/client'

/**
 * User preference for matching
 */
export type UserPreference = {
  interests: string[]
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  goals: string[]
}

/**
 * Single match result
 */
export type MatchResultItem = {
  clubId: number
  clubName: string
  matchScore: number
  matchReason: string
}

/**
 * Full matching response
 */
export type MatchResult = {
  matches: MatchResultItem[]
}

/**
 * AI Service - handles all AI business logic
 */
export class AIService {
  private provider: AIProvider

  constructor(provider: AIProvider) {
    this.provider = provider
  }

  /**
   * Generate club matching based on user preferences
   */
  async generateMatching(
    preferences: UserPreference,
    clubs: Club[]
  ): Promise<MatchResult> {
    const systemPrompt = `你是一个社团招新智能匹配助手。根据用户的兴趣、技能水平和目标，从给出的社团列表中选出最匹配的社团，并给出匹配分数和理由。

输出要求:
- 必须返回JSON格式，不要其他文字
- 格式: {"matches": [{"clubId": 俱乐部ID, "clubName": "俱乐部名称", "matchScore": 0-100分数, "matchReason": "匹配理由"}]}
- 选出最多5个最匹配的社团
- 分数要区分度，不要全部给高分
- 理由要结合用户兴趣和社团特点，1-2句话`

    const userPrompt = `用户偏好:
兴趣: ${preferences.interests.join(', ')}
技能水平: ${preferences.skillLevel}
目标: ${preferences.goals.join(', ')}

可选社团列表:
${clubs.map(c => `- ID: ${c.id}, 名称: ${c.name}, 分类: ${c.category}, 描述: ${c.description}, 标签: ${c.tags}`).join('\n')}`

    return this.provider.generateStructured<MatchResult>(
      systemPrompt,
      userPrompt,
      1000
    )
  }

  /**
   * Chat with AI about clubs
   */
  async chat(
    userMessage: string,
    conversationHistory: ChatMessage[],
    clubs: Club[]
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const systemPrompt = `你是社团招新智能问答助手。你可以回答关于学校社团的各种问题。
使用下面提供的社团数据库作为回答依据。如果问题不在社团相关范围内，可以礼貌拒绝回答。

社团数据库:
${clubs.map(c => `- ${c.name} (${c.category}): ${c.description}。标签: ${c.tags}。要求: ${c.requirements}`).join('\n')}

回答要求:
- 友好、热情、简洁
- 基于给定的社团信息回答，不要编造
- 如果用户问哪个社团适合他，可以根据他的兴趣推荐`

    const messages = [
      ...conversationHistory,
      { role: 'user' as const, content: userMessage },
    ]

    const request: ChatRequest = {
      messages,
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.7,
    }

    return this.provider.chat(request)
  }

  /**
   * Non-streaming chat completion
   */
  async chatComplete(
    userMessage: string,
    conversationHistory: ChatMessage[],
    clubs: Club[]
  ): Promise<string> {
    const systemPrompt = `你是社团招新智能问答助手。你可以回答关于学校社团的各种问题。
使用下面提供的社团数据库作为回答依据。如果问题不在社团相关范围内，可以礼貌拒绝回答。

社团数据库:
${clubs.map(c => `- ${c.name} (${c.category}): ${c.description}。标签: ${c.tags}。要求: ${c.requirements}`).join('\n')}

回答要求:
- 友好、热情、简洁
- 基于给定的社团信息回答，不要编造
- 如果用户问哪个社团适合他，可以根据他的兴趣推荐`

    const messages = [
      ...conversationHistory,
      { role: 'user' as const, content: userMessage },
    ]

    const request: ChatRequest = {
      messages,
      systemPrompt,
      maxTokens: 1000,
      temperature: 0.7,
    }

    return this.provider.chatComplete(request)
  }

  /**
   * Generate club description from name and category
   */
  async generateDescription(name: string, category: string): Promise<string> {
    const systemPrompt = `你是社团招新平台的内容生成助手。根据社团名称和分类，生成一段吸引人的社团描述。
输出要求:
- 100-200字
- 生动吸引人，让新生感兴趣
- 只返回描述内容，不要其他文字`

    const userPrompt = `社团名称: ${name}
分类: ${category}

请生成社团描述:`

    const request: ChatRequest = {
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt,
      maxTokens: 300,
      temperature: 0.8,
    }

    return this.provider.chatComplete(request)
  }

  /**
   * Suggest tags for a club
   */
  async suggestTags(name: string, category: string, description: string): Promise<string[]> {
    const systemPrompt = `你是社团标签推荐助手。根据社团名称、分类和描述，推荐5-8个相关的标签。
输出要求:
- 必须返回JSON格式
- 格式: {"tags": ["标签1", "标签2", ...]}
- 标签都是关键词，不要太长
- 标签要符合社团特点`

    const userPrompt = `社团名称: ${name}
分类: ${category}
描述: ${description}

请推荐标签:`

    const result = await this.provider.generateStructured<{tags: string[]}>(
      systemPrompt,
      userPrompt,
      200
    )

    return result.tags.slice(0, 8)
  }

  /**
   * Check if AI provider is healthy
   */
  async checkHealth(): Promise<boolean> {
    return this.provider.checkHealth()
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return this.provider.getProviderInfo()
  }
}
