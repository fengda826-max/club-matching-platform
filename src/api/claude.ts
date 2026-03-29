import Anthropic from '@anthropic-ai/sdk'
import type { Club, UserPreference, MatchResult } from '@/types'

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  baseURL: 'https://api.anthropic.com',
  maxRetries: 2,
})

export interface RecommendationRequest {
  preferences: UserPreference
  clubs: Club[]
}

export interface RecommendationResponse {
  matches: Array<{
    clubId: string
    score: number
    reasons: string[]
  }>
}

export interface ChatRequest {
  question: string
  clubs: Club[]
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface DescriptionGenerationRequest {
  clubName: string
  category: string
  keyActivities: string[]
  existingDescription?: string
}

export interface DescriptionGenerationResponse {
  description: string
  suggestedTags: string[]
  suggestedRequirements: string
}

const SYSTEM_PROMPT_MATCHING = `你是一个社团招新智能匹配平台的AI助手。你的任务是根据学生的兴趣和偏好，为他们推荐最合适的社团。

你会收到：
1. 学生的个人信息（兴趣爱好、技能水平、目标等）
2. 所有可用的社团信息（名称、分类、标签、描述、要求等）

请分析学生与每个社团的匹配程度，并返回推荐结果。

输出格式必须是有效的JSON，包含以下结构：
{
  "matches": [
    {
      "clubId": "社团ID",
      "score": 0-100的匹配分数,
      "reasons": ["匹配理由1", "匹配理由2"]
    }
  ]
}

注意事项：
- 分数应为0-100之间的整数
- 只推荐分数>=50的社团
- 匹配理由应该具体且有说服力
- 按分数从高到低排序`

const SYSTEM_PROMPT_CHAT = `你是一个社团招新智能客服助手。你的任务是回答学生关于社团的问题。

你会收到：
1. 学生的提问
2. 所有可用的社团信息
3. 之前的对话历史（可选）

请根据社团信息准确回答学生的问题。如果问题涉及特定社团，请提供详细信息。

回答要求：
- 准确、友好、有帮助
- 基于提供的社团信息回答
- 如果找不到相关信息，诚实告知
- 保持简洁明了
- 可以主动推荐相关社团`

const SYSTEM_PROMPT_DESCRIPTION = `你是一个社团文案创作助手。你的任务是根据基本信息生成吸引人的社团描述。

你会收到：
1. 社团名称
2. 社团分类
3. 关键活动
4. 现有描述（可选，用于改进）

请生成一个吸引人的社团描述和建议的标签。

输出格式必须是有效的JSON，包含以下结构：
{
  "description": "社团描述（100-200字）",
  "suggestedTags": ["标签1", "标签2", "标签3"],
  "suggestedRequirements": "入社要求（50-100字）"
}

注意事项：
- 描述要生动有趣，吸引学生
- 标签要准确且有助于搜索
- 描述和标签使用中文`

export async function generateRecommendations(
  request: RecommendationRequest,
): Promise<RecommendationResponse> {
  const prompt = `学生信息：
兴趣：${request.preferences.interests.join(', ')}
技能水平：${request.preferences.skillLevel}
目标：${request.preferences.goals.join(', ')}

可用的社团：
${request.clubs
  .map(
    (club) => `
  - ID: ${club.id}
    名称：${club.name}
    分类：${club.category}
    标签：${club.tags.join(', ')}
    描述：${club.description}
    要求：${club.requirements}
    成员数：${club.memberCount}`,
  )
  .join('\n')}

请分析并返回推荐结果。`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: SYSTEM_PROMPT_MATCHING,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }

    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('Error generating recommendations:', error)
    throw error
  }
}

export async function chatWithAI(request: ChatRequest): Promise<string> {
  const clubsInfo = request.clubs
    .map(
      (club) => `
  - ${club.name} (${club.category})
    标签：${club.tags.join(', ')}
    描述：${club.description}
    要求：${club.requirements}
    联系方式：${club.contact}`,
    )
    .join('\n')

  const prompt = `学生提问：${request.question}

可用社团信息：
${clubsInfo}

请回答学生的问题。`

  try {
    const messages: Anthropic.MessageParam[] = request.conversationHistory
      ? request.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      : []

    messages.push({
      role: 'user',
      content: prompt,
    })

    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: SYSTEM_PROMPT_CHAT,
      max_tokens: 1000,
      messages,
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text
    }

    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('Error in AI chat:', error)
    throw error
  }
}

export async function generateDescription(
  request: DescriptionGenerationRequest,
): Promise<DescriptionGenerationResponse> {
  const prompt = `社团名称：${request.clubName}
社团分类：${request.category}
关键活动：${request.keyActivities.join(', ')}
${request.existingDescription ? `现有描述（用于改进）：${request.existingDescription}` : ''}

请生成社团描述和建议。`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      system: SYSTEM_PROMPT_DESCRIPTION,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = response.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }

    throw new Error('Failed to parse AI response')
  } catch (error) {
    console.error('Error generating description:', error)
    throw error
  }
}

export function hasValidApiKey(): boolean {
  return Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY && import.meta.env.VITE_ANTHROPIC_API_KEY.length > 0)
}

export function getApiKeyStatus(): { valid: boolean; message: string } {
  if (!import.meta.env.VITE_ANTHROPIC_API_KEY) {
    return {
      valid: false,
      message: '未配置 API Key，请设置 VITE_ANTHROPIC_API_KEY 环境变量',
    }
  }

  return {
    valid: true,
    message: 'API Key 已配置',
  }
}
