import type { Club } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { AIError } from '../../providers/errors'
import type { AICompletion, AIProvider } from '../../providers/types'
import type { RuleMatch, UserPreference } from '../../schemas/matching'
import { RecommendationService } from '../RecommendationService'

const preference: UserPreference = {
  interests: ['编程'], goals: ['竞赛'], skillLevel: 'beginner', availableTimes: ['周末'], maxFee: 100,
}

const clubs = [{
  id: 1, name: '编程社', category: '科技', description: '参加编程竞赛', requirements: '零基础可加入',
  memberCount: 20, contact: 'demo', tags: '编程,竞赛', activityTime: '周末', weeklyHours: 2,
  campus: '全校区', fee: 0, skillRequirement: 'beginner', isRecruiting: true,
  createdAt: new Date(), updatedAt: new Date(),
}] satisfies Club[]

const ruleMatches: RuleMatch[] = [{
  clubId: 1, score: 88,
  dimensions: { interest: 40, goal: 20, schedule: 20, skill: 8 },
  evidence: ['兴趣：编程'], caveats: [],
}]

function completion<T>(data: T): AICompletion<T> {
  return { data, usage: { inputTokens: 12, outputTokens: 8 }, provider: 'openai-compat', model: 'deepseek-v4', durationMs: 25 }
}

function makeService(structured: unknown | Error) {
  const provider = {
    generateStructured: vi.fn().mockImplementation(async () => {
      if (structured instanceof Error) throw structured
      return completion(structured)
    }),
  } as unknown as AIProvider
  const logger = { record: vi.fn().mockResolvedValue(undefined) }
  const service = new RecommendationService({
    provider,
    clubService: { getAllClubs: vi.fn().mockResolvedValue(clubs) },
    ruleService: { match: vi.fn().mockReturnValue(ruleMatches) },
    logger,
  })
  return { service, provider, logger }
}

describe('RecommendationService', () => {
  it('returns validated extracted preferences', async () => {
    const { service, provider } = makeService(preference)
    await expect(service.extractPreferences('周末想参加编程竞赛')).resolves.toMatchObject({
      preference, mode: 'ai-extracted',
    })
    expect(provider.generateStructured).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('"availableTimes"'),
      expect.any(String),
      500,
      undefined,
    )
  })

  it('keeps deterministic scores when AI writes explanations', async () => {
    const { service, provider } = makeService({ matches: [{ clubId: 1, reason: '兴趣和竞赛目标高度吻合，时间也合适。', caveats: [] }] })
    const result = await service.recommend(preference)
    expect(result.mode).toBe('hybrid')
    expect(result.matches[0]).toMatchObject({ score: 88, reason: '兴趣和竞赛目标高度吻合，时间也合适。' })
    expect(provider.generateStructured).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('"clubId"'),
      expect.any(String),
      900,
      undefined,
    )
  })

  it('falls back to rule evidence when the model times out', async () => {
    const { service, logger } = makeService(new AIError('TIMEOUT', 'timeout', 'openai-compat'))
    await expect(service.recommend(preference)).resolves.toMatchObject({
      mode: 'rules-only', matches: [{ clubId: 1, score: 88, reason: '兴趣：编程' }],
    })
    expect(logger.record).toHaveBeenCalledTimes(1)
    expect(logger.record).toHaveBeenCalledWith(expect.objectContaining({ fallbackUsed: true, errorCode: 'TIMEOUT' }))
  })

  it('rejects fabricated or duplicate model club ids by falling back', async () => {
    const { service } = makeService({ matches: [
      { clubId: 99, reason: '这是模型虚构出来的一条推荐理由文本。', caveats: [] },
      { clubId: 99, reason: '这是重复的模型推荐理由文本。', caveats: [] },
    ] })
    await expect(service.recommend(preference)).resolves.toMatchObject({ mode: 'rules-only' })
  })

  it('does not call the model for an empty club database', async () => {
    const { service, provider } = makeService({ matches: [] })
    vi.mocked(service['clubService'].getAllClubs).mockResolvedValue([])
    await expect(service.recommend(preference)).resolves.toMatchObject({ mode: 'rules-only', matches: [] })
    expect(provider.generateStructured).not.toHaveBeenCalled()
  })
})
