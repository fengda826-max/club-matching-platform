import type { Club } from '@prisma/client'
import { z } from 'zod'
import { AIError } from '../providers/errors'
import type { AICompletion, AIProvider } from '../providers/types'
import { userPreferenceSchema, type RuleMatch, type UserPreference } from '../schemas/matching'
import { AppError } from '../middleware/errorHandler'
import type { AIRequestLogger } from './AIRequestLogger'
import type { ClubService } from './ClubService'
import type { RuleMatchingService } from './RuleMatchingService'

const explanationSchema = z.object({
  matches: z.array(z.object({
    clubId: z.number().int().positive(),
    reason: z.string().trim().min(10).max(240),
    caveats: z.array(z.string().trim().min(1).max(100)).max(3),
  })).max(5),
}).strict()

type Dependencies = {
  provider: AIProvider | null
  clubService: Pick<ClubService, 'getAllClubs'>
  ruleService: Pick<RuleMatchingService, 'match'>
  logger: Pick<AIRequestLogger, 'record'>
}

export type RecommendationMatch = RuleMatch & {
  club: Club
  reason: string
  caveats: string[]
}

export class RecommendationService {
  private readonly provider: AIProvider | null
  private readonly clubService: Dependencies['clubService']
  private readonly ruleService: Dependencies['ruleService']
  private readonly logger: Dependencies['logger']

  constructor(dependencies: Dependencies) {
    this.provider = dependencies.provider
    this.clubService = dependencies.clubService
    this.ruleService = dependencies.ruleService
    this.logger = dependencies.logger
  }

  async extractPreferences(text: string, signal?: AbortSignal) {
    if (!this.provider) throw new AppError(503, 'AI_UNAVAILABLE', '自然语言解析暂不可用，请改用结构化表单')
    const systemPrompt = `从用户的社团需求中提取偏好。只返回一个 JSON 对象，不要解释、Markdown 或额外字段。
严格使用以下字段和类型：
{"interests":["字符串"],"goals":["字符串"],"skillLevel":"beginner|intermediate|advanced|expert","availableTimes":["字符串"],"campus":"字符串（可省略）","maxWeeklyHours":整数（可省略）,"maxFee":整数（可省略）}
规则：
- 未表达的 interests、goals、availableTimes 返回空数组。
- 未表达的可选字段直接省略，禁止返回 null。
- “零基础/新手”映射 beginner；“有一定基础”映射 intermediate；“熟练”映射 advanced；“专家”映射 expert。
- “免费/不想交会费”映射 maxFee=0；时间和费用只返回数字。
- 不推测用户未表达的硬约束。`
    const userPrompt = `用户需求：${text}`
    try {
      const result = await this.provider.generateStructured(userPreferenceSchema, systemPrompt, userPrompt, 500, signal)
      await this.logCompletion('preference-extraction', result, false, 'success')
      const warnings = [
        result.data.campus ? null : '未指定校区',
        result.data.maxWeeklyHours === undefined ? '未指定每周投入时间' : null,
        result.data.maxFee === undefined ? '未指定费用上限' : null,
      ].filter((value): value is string => Boolean(value))
      return { preference: result.data, mode: 'ai-extracted' as const, warnings }
    } catch (error) {
      await this.logFailure('preference-extraction', error, false)
      throw new AppError(503, 'AI_UNAVAILABLE', '自然语言解析暂不可用，请保留原文并改用结构化表单')
    }
  }

  async recommend(preferenceInput: UserPreference, signal?: AbortSignal) {
    const preference = userPreferenceSchema.parse(preferenceInput)
    const clubs = await this.clubService.getAllClubs()
    const clubById = new Map(clubs.map(club => [club.id, club]))
    const ruleMatches = this.ruleService.match(preference, clubs)
      .filter(match => clubById.has(match.clubId))
      .slice(0, 5)

    if (ruleMatches.length === 0 || !this.provider) {
      await this.logFallback(this.provider ? 'NO_CANDIDATES' : 'UNCONFIGURED')
      return this.rulesOnly(ruleMatches, clubById, this.provider ? '没有社团满足当前硬约束' : '模型未配置，已使用规则评分')
    }

    const candidates = ruleMatches.map(match => ({
      ...match,
      club: this.publicClubFacts(clubById.get(match.clubId)!),
    }))

    try {
      const result = await this.provider.generateStructured(
        explanationSchema,
        `你负责把已有规则证据写成简洁推荐理由。只返回一个 JSON 对象，不要解释或 Markdown。
严格格式：{"matches":[{"clubId":候选社团整数ID,"reason":"10到240字的中文理由","caveats":["最多3条注意事项"]}]}
每个候选 clubId 必须且只能出现一次，顺序与候选列表一致。不得改变分数、添加候选之外的社团、遗漏候选或编造事实。没有额外注意事项时 caveats 返回空数组。`,
        JSON.stringify({ preference, candidates }),
        900,
        signal,
      )
      this.assertExplanationIds(result.data.matches.map(item => item.clubId), ruleMatches)
      const explanationById = new Map(result.data.matches.map(item => [item.clubId, item]))
      const matches = ruleMatches.map(match => {
        const explanation = explanationById.get(match.clubId)
        if (!explanation) throw new AIError('INVALID_RESPONSE', 'Missing candidate explanation', result.provider)
        return {
          ...match,
          club: clubById.get(match.clubId)!,
          reason: explanation.reason,
          caveats: Array.from(new Set([...match.caveats, ...explanation.caveats])),
        }
      })
      await this.logCompletion('recommendation', result, false, 'success')
      return { mode: 'hybrid' as const, matches }
    } catch (error) {
      await this.logFailure('recommendation', error, true)
      return this.rulesOnly(ruleMatches, clubById, '模型说明不可用，已降级为可复现的规则结果')
    }
  }

  private rulesOnly(ruleMatches: RuleMatch[], clubById: Map<number, Club>, warning: string) {
    return {
      mode: 'rules-only' as const,
      warning,
      matches: ruleMatches.map(match => ({
        ...match,
        club: clubById.get(match.clubId)!,
        reason: match.evidence.join('；') || '满足当前筛选条件',
      })),
    }
  }

  private assertExplanationIds(ids: number[], candidates: RuleMatch[]): void {
    const allowed = new Set(candidates.map(item => item.clubId))
    if (new Set(ids).size !== ids.length || ids.length !== candidates.length || ids.some(id => !allowed.has(id))) {
      throw new AIError('INVALID_RESPONSE', 'Explanation ids do not match candidates', 'openai-compat')
    }
  }

  private publicClubFacts(club: Club) {
    const { contact: _contact, createdAt: _createdAt, updatedAt: _updatedAt, ...facts } = club
    return facts
  }

  private async logCompletion(useCase: string, result: AICompletion<unknown>, fallbackUsed: boolean, status: string) {
    await this.logger.record({
      useCase, provider: result.provider, model: result.model, status,
      durationMs: result.durationMs, inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens, fallbackUsed,
    })
  }

  private async logFailure(useCase: string, error: unknown, fallbackUsed: boolean) {
    const aiError = error instanceof AIError ? error : null
    await this.logger.record({
      useCase, provider: aiError?.provider || 'unknown', model: this.providerInfo().model,
      status: 'error', durationMs: 0, fallbackUsed, errorCode: aiError?.code || 'INVALID_RESPONSE',
    })
  }

  private async logFallback(errorCode: string) {
    const info = this.providerInfo()
    await this.logger.record({
      useCase: 'recommendation', provider: info.id, model: info.model,
      status: 'fallback', durationMs: 0, fallbackUsed: true, errorCode,
    })
  }

  private providerInfo(): { id: string; model: string } {
    const getInfo = (this.provider as AIProvider & { getProviderInfo?: AIProvider['getProviderInfo'] } | null)?.getProviderInfo
    if (!getInfo) return { id: this.provider ? 'unknown' : 'unconfigured', model: 'none' }
    const info = getInfo.call(this.provider)
    return { id: info.id, model: info.model }
  }
}
